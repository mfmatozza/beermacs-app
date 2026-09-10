// POST /api/matches/:matchId/resolve — A-12: an admin settling a match's
// result from any state, overriding whatever the teams reported.
//
// Runs through the exact same transition() from @beermacs/shared that a
// captain's report/confirm would — there is no separate "admin path" logic to
// keep in sync with the rules. staff_resolve is one of its events; the state
// machine is the only thing that ever writes a winner.

import { staffResolveInput, transition } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import {
  advanceWinnerToNextRound,
  MATCH_STATE_TO_PRISMA,
  toDomainMatch,
} from "@/lib/match-mapping";
import { sendNotifyIntents } from "@/lib/notify";
import { HttpError, requireVenueRoleForMatch } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const viewer = await requireVenueRoleForMatch(matchId, Role.VENUE_STAFF);
    const body = await parseBody(req, staffResolveInput);

    const row = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: {
        id: true,
        roundId: true,
        groupId: true,
        position: true,
        homeTeamId: true,
        awayTeamId: true,
        homeViaRepechage: true,
        awayViaRepechage: true,
        state: true,
        winnerTeamId: true,
        homeScore: true,
        awayScore: true,
        venueTableId: true,
        tournamentId: true,
        tournament: { select: { venueId: true } },
      },
    });
    const domainMatch = toDomainMatch(row.roundId, row);

    const outcome = transition(
      domainMatch,
      { type: "staff_resolve", winnerId: body.winnerId, score: body.score, reason: body.reason },
      {
        actor: { kind: "staff", userId: viewer.userId },
        pending: null,
        cupsToWin: null,
        now: new Date().toISOString(),
      }
    );

    if (!outcome.ok) {
      const code =
        outcome.error.kind === "winner_not_in_match"
          ? "winner_not_in_match"
          : outcome.error.kind === "staff_only"
            ? "staff_only"
            : "invalid_transition";
      throw new HttpError(422, code);
    }

    const { match: settled, releasesTable, notify } = outcome.value;

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          state: MATCH_STATE_TO_PRISMA[settled.state],
          winnerTeamId: settled.winnerId,
          homeScore: settled.score?.home ?? null,
          awayScore: settled.score?.away ?? null,
          venueTableId: settled.tableId,
          settledAt: new Date(),
        },
      });
      if (releasesTable) {
        await tx.venueTable.update({ where: { id: releasesTable }, data: { state: "OPEN" } });
      }
      await tx.auditEntry.create({
        data: {
          tournamentId: row.tournamentId,
          actorUserId: viewer.userId,
          action: "match.staff_resolve",
          reason: body.reason,
          before: { state: row.state, winnerTeamId: row.winnerTeamId },
          after: { state: MATCH_STATE_TO_PRISMA[settled.state], winnerTeamId: settled.winnerId },
        },
      });
      if (settled.state === "confirmed") {
        await advanceWinnerToNextRound(tx, {
          roundId: row.roundId,
          winnerTeamId: settled.winnerId,
          groupId: row.groupId,
        });
      }
    });

    await sendNotifyIntents(notify, { venueId: row.tournament.venueId });

    return NextResponse.json({ id: matchId, state: settled.state, winnerId: settled.winnerId });
  } catch (e) {
    return handleError(e);
  }
}
