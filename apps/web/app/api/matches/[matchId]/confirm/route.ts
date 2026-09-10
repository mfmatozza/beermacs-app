// POST /api/matches/:matchId/confirm — U-12: the OTHER team agreeing with the
// standing claim. Only once both sides agree does the match actually settle —
// transition() itself refuses a captain confirming their own report
// (self_confirmation), which is the one rule this whole result flow exists to
// enforce server-side rather than trust the client with.

import { confirmResultInput, transition } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import {
  advanceWinnerToNextRound,
  getPendingReport,
  MATCH_STATE_TO_PRISMA,
  toDomainMatch,
} from "@/lib/match-mapping";
import { sendNotifyIntents } from "@/lib/notify";
import { HttpError, requireViewer, resolveMatchActor } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const viewer = await requireViewer();
    await parseBody(req, confirmResultInput);

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

    const actor = await resolveMatchActor(
      viewer,
      row.homeTeamId,
      row.awayTeamId,
      row.tournament.venueId
    );
    const pending = await getPendingReport(matchId);
    const domainMatch = toDomainMatch(row.roundId, row);

    const outcome = transition(
      domainMatch,
      { type: "confirm" },
      {
        actor,
        pending,
        cupsToWin: null,
        now: new Date().toISOString(),
      }
    );

    if (!outcome.ok) throw new HttpError(422, outcome.error.kind);
    const { match: next, releasesTable, notify } = outcome.value;

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          state: MATCH_STATE_TO_PRISMA[next.state],
          winnerTeamId: next.winnerId,
          homeScore: next.score?.home ?? null,
          awayScore: next.score?.away ?? null,
          venueTableId: next.tableId,
          settledAt: new Date(),
        },
      });
      await tx.matchReport.create({
        data: {
          matchId,
          kind: "CONFIRM",
          actorUserId: viewer.userId,
          teamId: actor.kind === "captain" ? actor.teamId : null,
        },
      });
      // A settled match frees its table for the next pairing (E-3's whole
      // point) — transition() tells us which one via releasesTable; forgetting
      // this write leaves the table BUSY forever even though the match's own
      // venueTableId has already gone back to null.
      if (releasesTable) {
        await tx.venueTable.update({ where: { id: releasesTable }, data: { state: "OPEN" } });
      }
      if (next.state === "confirmed") {
        await advanceWinnerToNextRound(tx, {
          roundId: row.roundId,
          winnerTeamId: next.winnerId,
          groupId: row.groupId,
        });
      }
    });

    await sendNotifyIntents(notify, { venueId: row.tournament.venueId });

    return NextResponse.json({ id: matchId, state: next.state, winnerId: next.winnerId });
  } catch (e) {
    return handleError(e);
  }
}
