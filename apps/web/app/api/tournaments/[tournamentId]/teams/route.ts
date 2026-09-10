// POST /api/tournaments/:tournamentId/teams — U-2: a player, already inside the
// tournament (has a PLAYER VenueMembership from /api/tournaments/join), forms
// their own team and names it.
//
// The team's entryRound is computed here, once, from whichever round is
// currently the lowest OPEN one across the tournament's stages (E-6) — or 1 if
// none is open yet (E-7). It is not recomputed later. A RoundEntrant row is
// created immediately for that round, which is what makes the team show up in
// waitingTeams() the moment dispatch looks for it.

import { createTeamInput, entryRoundForNewTeam, type Round as DomainRound } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const viewer = await requireViewer();
    const body = await parseBody(req, createTeamInput);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        venueId: true,
        status: true,
        stages: {
          orderBy: { order: "asc" },
          take: 1,
          select: { id: true, rounds: { select: { id: true, index: true, status: true } } },
        },
      },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    if (tournament.status !== "REGISTRATION" && tournament.status !== "RUNNING") {
      throw new HttpError(409, "tournament_not_open");
    }

    // Being a player at this venue is what /api/tournaments/join grants —
    // require it, rather than trusting the client to have called join first.
    const membership = await prisma.venueMembership.findUnique({
      where: { userId_venueId: { userId: viewer.userId, venueId: tournament.venueId } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    const firstStage = tournament.stages[0];
    if (!firstStage) throw new HttpError(500, "tournament_has_no_stage");

    const domainRounds: DomainRound[] = firstStage.rounds.map((r) => ({
      id: r.id,
      stageId: firstStage.id,
      index: r.index,
      status: r.status === "OPEN" ? "open" : "not_opened",
      schedulingPaused: false,
    }));
    const entryRound = entryRoundForNewTeam(domainRounds);

    // The round row for `entryRound` always exists already: it's either
    // Round 1 (created with the tournament, E-7) or a round that had to be
    // OPEN for entryRoundForNewTeam to have picked it — and opening a round
    // is what creates its row (see the open-round route).
    const targetRound = firstStage.rounds.find((r) => r.index === entryRound);
    if (!targetRound) throw new HttpError(500, "entry_round_missing");

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: { tournamentId, name: body.name, entryRound },
      });
      await tx.teamMember.create({
        data: { teamId: created.id, userId: viewer.userId, isCaptain: true },
      });
      await tx.roundEntrant.create({
        data: { roundId: targetRound.id, teamId: created.id, viaRepechage: false },
      });
      return created;
    });

    return NextResponse.json({ id: team.id, name: team.name, entryRound: team.entryRound });
  } catch (e) {
    return handleError(e);
  }
}
