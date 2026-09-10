// POST /api/matches/:matchId/reject — U-13: the other team disagrees. This
// does NOT let the rejecting team declare their own winner — it moves the
// match to "disputed", which only an admin can resolve (A-12,
// /api/matches/:id/resolve). Two conflicting self-interested claims are
// exactly the situation a human behind the bar exists to settle.

import { rejectResultInput, transition } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { getPendingReport, MATCH_STATE_TO_PRISMA, toDomainMatch } from "@/lib/match-mapping";
import { sendNotifyIntents } from "@/lib/notify";
import { HttpError, requireViewer, resolveMatchActor } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const viewer = await requireViewer();
    const body = await parseBody(req, rejectResultInput);

    const row = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: {
        id: true,
        roundId: true,
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
      { type: "reject", reason: body.reason },
      {
        actor,
        pending,
        cupsToWin: null,
        now: new Date().toISOString(),
      }
    );

    if (!outcome.ok) throw new HttpError(422, outcome.error.kind);
    const { match: next, notify } = outcome.value;

    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { state: MATCH_STATE_TO_PRISMA[next.state] },
      }),
      prisma.matchReport.create({
        data: {
          matchId,
          kind: "REJECT",
          actorUserId: viewer.userId,
          teamId: actor.kind === "captain" ? actor.teamId : null,
          reason: body.reason,
        },
      }),
    ]);

    await sendNotifyIntents(notify, { venueId: row.tournament.venueId });

    return NextResponse.json({ id: matchId, state: next.state });
  } catch (e) {
    return handleError(e);
  }
}
