// POST /api/matches/:matchId/report — U-11: a team reports the winner.
//
// Runs through transition() from @beermacs/shared with a "captain" actor
// resolved by resolveMatchActor — the same function confirm/reject/resolve
// all use, so "who is allowed to act on this match" is answered in exactly
// one place. On success this writes a MatchReport (kind CLAIM, an audit trail
// of who claimed what) alongside the match's own state, which moves to
// "reported" — NOT confirmed. See ./confirm.

import { reportResultInput, transition } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { MATCH_STATE_TO_PRISMA, toDomainMatch } from "@/lib/match-mapping";
import { HttpError, requireViewer, resolveMatchActor } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const viewer = await requireViewer();
    const body = await parseBody(req, reportResultInput);

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
        tournament: { select: { venueId: true, config: true } },
      },
    });

    const actor = await resolveMatchActor(
      viewer,
      row.homeTeamId,
      row.awayTeamId,
      row.tournament.venueId
    );
    const domainMatch = toDomainMatch(row.roundId, row);
    const cupsToWin = (row.tournament.config as { cupsToWin?: number | null })?.cupsToWin ?? null;

    const outcome = transition(
      domainMatch,
      { type: "report", winnerId: body.winnerId, score: body.score },
      { actor, pending: null, cupsToWin, now: new Date().toISOString() }
    );

    if (!outcome.ok) throw new HttpError(422, outcome.error.kind);
    const { match: next, releasesTable } = outcome.value;

    // If staff filed the report, transition() settles it outright (there is
    // nobody to argue with) — so this may already be CONFIRMED, not
    // "reported", and releasesTable may already be set. Either way the write
    // is the same shape.
    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: {
          state: MATCH_STATE_TO_PRISMA[next.state],
          winnerTeamId: next.winnerId,
          homeScore: next.score?.home ?? null,
          awayScore: next.score?.away ?? null,
          venueTableId: next.tableId,
          ...(next.state === "confirmed" ? { settledAt: new Date() } : {}),
        },
      }),
      prisma.matchReport.create({
        data: {
          matchId,
          kind: "CLAIM",
          actorUserId: viewer.userId,
          teamId: actor.kind === "captain" ? actor.teamId : null,
          claimedWinnerTeamId: body.winnerId,
          homeScore: body.score?.home ?? null,
          awayScore: body.score?.away ?? null,
        },
      }),
      ...(releasesTable
        ? [prisma.venueTable.update({ where: { id: releasesTable }, data: { state: "OPEN" } })]
        : []),
    ]);

    return NextResponse.json({ id: matchId, state: next.state });
  } catch (e) {
    return handleError(e);
  }
}
