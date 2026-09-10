// Shared team-creation logic. Both the player self-serve path
// (POST /api/tournaments/:id/teams) and the admin-add path
// (POST /api/tournaments/:id/teams/admin-add, A-7) need the exact same
// entry-round resolution — a team's entryRound is computed once, from
// whichever round is currently the lowest OPEN one (E-6), or 1 if none is open
// yet (E-7) — so it lives here rather than being copied between two routes.

import {
  entryRoundForNewTeam,
  generateJoinCode,
  type Round as DomainRound,
} from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { HttpError } from "./session";

/** Same collision-avoidance loop the tournament route uses for its own
 *  join code — copied rather than shared because the two codes are
 *  checked against different tables (Team vs Tournament). */
async function uniqueTeamJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateJoinCode();
    const clash = await prisma.team.findUnique({ where: { joinCode: code } });
    if (!clash) return code;
  }
  throw new Error("Could not generate a unique team join code after 8 attempts");
}

export async function createTeamInTournament(
  tournamentId: string,
  name: string,
  captainUserId: string | null
): Promise<{ id: string; name: string; entryRound: number; joinCode: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
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

  // The round row for `entryRound` always exists already: it's either Round 1
  // (created with the tournament, E-7) or a round that had to be OPEN for
  // entryRoundForNewTeam to have picked it — and opening a round is what
  // creates its row (see the open-round route).
  const targetRound = firstStage.rounds.find((r) => r.index === entryRound);
  if (!targetRound) throw new HttpError(500, "entry_round_missing");

  const joinCode = await uniqueTeamJoinCode();

  return prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: { tournamentId, name, entryRound, joinCode },
    });
    if (captainUserId) {
      await tx.teamMember.create({
        data: { teamId: created.id, userId: captainUserId, isCaptain: true },
      });
    }
    await tx.roundEntrant.create({
      data: { roundId: targetRound.id, teamId: created.id, viaRepechage: false },
    });
    return {
      id: created.id,
      name: created.name,
      entryRound: created.entryRound,
      joinCode: created.joinCode,
    };
  });
}
