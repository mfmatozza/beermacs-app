// POST /api/rounds/:roundId/pair — A-16: an admin manually pairing two
// specific teams into this round, overriding random matchmaking.
//
// Both teams must already be entrants of this round with nothing paired yet —
// checked with the exact same waitingTeams() the automatic dispatcher will use
// (Phase 4), so a manual pairing and an automatic one are indistinguishable
// once created: both are just a Match with two slots filled, "queued" for a
// table.

import { manualPairInput, waitingTeams, type Round as DomainRound } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { MATCH_SELECT, toDomainMatch } from "@/lib/match-mapping";
import { HttpError, requireVenueRoleForRound } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ roundId: string }> }) {
  try {
    const { roundId } = await params;
    await requireVenueRoleForRound(roundId, Role.VENUE_STAFF);
    const body = await parseBody(req, manualPairInput);

    if (body.homeTeamId === body.awayTeamId) {
      throw new HttpError(422, "same_team_twice");
    }

    const round = await prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      select: {
        id: true,
        stageId: true,
        index: true,
        status: true,
        schedulingPaused: true,
        stage: { select: { tournamentId: true } },
        entrants: { select: { teamId: true } },
        matches: { select: MATCH_SELECT },
      },
    });

    const domainRound: DomainRound = {
      id: round.id,
      stageId: round.stageId,
      index: round.index,
      status: round.status === "OPEN" ? "open" : "not_opened",
      schedulingPaused: round.schedulingPaused,
    };
    const entrants = round.entrants.map((e) => ({
      teamId: e.teamId,
      roundId: round.id,
      viaRepechage: false,
    }));
    const matches = round.matches.map((m) => toDomainMatch(round.id, m));

    const waiting = new Set(waitingTeams(domainRound, entrants, matches));
    if (!waiting.has(body.homeTeamId)) throw new HttpError(409, "home_team_not_waiting");
    if (!waiting.has(body.awayTeamId)) throw new HttpError(409, "away_team_not_waiting");

    const match = await prisma.match.create({
      data: {
        tournamentId: round.stage.tournamentId,
        stageId: round.stageId,
        roundId: round.id,
        position: round.matches.length,
        homeTeamId: body.homeTeamId,
        awayTeamId: body.awayTeamId,
        state: "QUEUED",
      },
    });

    return NextResponse.json({ id: match.id });
  } catch (e) {
    return handleError(e);
  }
}
