// GET /api/tournaments/:tournamentId — everything the round-control screen
// needs: stages, each stage's rounds with status/pause state, per-round
// waiting-team counts (E-3), and the venue's tables.
//
// VENUE_STAFF+ — this is the night-of running view, not the setup one.

import { waitingTeams, type Round as DomainRound } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { MATCH_SELECT, toDomainMatch } from "@/lib/match-mapping";
import { requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        format: true,
        status: true,
        joinCode: true,
        venueId: true,
        config: true,
        stages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            order: true,
            advanceCount: true,
            rounds: {
              orderBy: { index: "asc" },
              select: {
                id: true,
                index: true,
                status: true,
                schedulingPaused: true,
                entrants: { select: { teamId: true } },
                matches: { select: MATCH_SELECT },
              },
            },
          },
        },
      },
    });

    if (!tournament) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await requireVenueRole(tournament.venueId, Role.VENUE_STAFF);

    const tables = await prisma.venueTable.findMany({
      where: { venueId: tournament.venueId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, state: true, sortOrder: true },
    });

    const stages = tournament.stages.map((stage) => ({
      id: stage.id,
      type: stage.type,
      order: stage.order,
      advanceCount: stage.advanceCount,
      rounds: stage.rounds.map((r) => {
        const domainRound: DomainRound = {
          id: r.id,
          stageId: stage.id,
          index: r.index,
          status: r.status === "OPEN" ? "open" : "not_opened",
          schedulingPaused: r.schedulingPaused,
        };
        const matches = r.matches.map((m) => toDomainMatch(r.id, m));
        const entrants = r.entrants.map((e) => ({
          teamId: e.teamId,
          roundId: r.id,
          viaRepechage: false,
        }));

        return {
          id: r.id,
          index: r.index,
          status: domainRound.status,
          schedulingPaused: r.schedulingPaused,
          matchCount: matches.length,
          waitingCount: waitingTeams(domainRound, entrants, matches).length,
        };
      }),
    }));

    return NextResponse.json({
      id: tournament.id,
      name: tournament.name,
      format: tournament.format,
      status: tournament.status,
      joinCode: tournament.joinCode,
      config: tournament.config,
      stages,
      tables,
    });
  } catch (e) {
    return handleError(e);
  }
}
