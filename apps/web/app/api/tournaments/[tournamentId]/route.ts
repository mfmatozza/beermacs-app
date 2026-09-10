// GET /api/tournaments/:tournamentId — everything the round-control screen
// needs: stages, each stage's rounds with status/pause state, per-round
// waiting-team counts (E-3), and the venue's tables.
//
// VENUE_STAFF+ — this is the night-of running view, not the setup one.

import { updateTournamentInput, waitingTeams, type Round as DomainRound } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { MATCH_SELECT, toDomainMatch } from "@/lib/match-mapping";
import { HttpError, requireVenueRole } from "@/lib/session";
import { FORMAT_TO_PRISMA, stagesFor } from "@/lib/tournament-format";

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

/**
 * PATCH /api/tournaments/:tournamentId — A-6: change the format, or any of
 * the tunable config knobs, while the tournament is running.
 *
 * The config knobs (playersPerTeam, chatEnabled, cupsToWin,
 * confirmTimeoutMins, autoRepechageMode) are always a safe field update — none
 * of them imply a different Stage/Round shape.
 *
 * The structural `format` is different: changing it means the tournament
 * needs a DIFFERENT SET OF STAGES, and this endpoint does not attempt to
 * migrate live matches onto a new structure — that is real work (what happens
 * to a group-stage standings table if the format becomes single elimination
 * mid-way?) that the roadmap explicitly flags as unsolved. So the format may
 * only change while nothing has actually been played yet: no Match row exists
 * for this tournament. Once one does, the existing stages are recreated
 * (dropped and rebuilt via the same stagesFor() creation uses) — safe only
 * because there is nothing hanging off them yet.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { venueId: true, format: true, config: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    await requireVenueRole(tournament.venueId, Role.VENUE_ADMIN);

    const body = await parseBody(req, updateTournamentInput);

    const currentConfig = (tournament.config ?? {}) as Record<string, unknown>;
    const nextConfig = {
      ...currentConfig,
      ...(body.playersPerTeam !== undefined ? { playersPerTeam: body.playersPerTeam } : {}),
      ...(body.chatEnabled !== undefined ? { chatEnabled: body.chatEnabled } : {}),
      ...(body.cupsToWin !== undefined ? { cupsToWin: body.cupsToWin } : {}),
      ...(body.confirmTimeoutMins !== undefined
        ? { confirmTimeoutMins: body.confirmTimeoutMins }
        : {}),
      ...(body.autoRepechageMode !== undefined
        ? { autoRepechageMode: body.autoRepechageMode }
        : {}),
    };

    await prisma.$transaction(async (tx) => {
      if (body.format && FORMAT_TO_PRISMA[body.format] !== tournament.format) {
        const matchCount = await tx.match.count({ where: { tournamentId } });
        if (matchCount > 0) {
          throw new HttpError(409, "format_locked_after_first_match");
        }

        // Safe to rebuild: nothing has been played, so no Stage/Round/Match
        // history is lost — Prisma's onDelete: Cascade removes the Round and
        // RoundEntrant rows underneath, and there are no Match rows to cascade.
        await tx.stage.deleteMany({ where: { tournamentId } });

        const plan = stagesFor(body.format);
        const firstStage = await tx.stage.create({ data: { tournamentId, ...plan[0]! } });
        for (const st of plan.slice(1)) {
          await tx.stage.create({ data: { tournamentId, ...st } });
        }
        await tx.round.create({
          data: { stageId: firstStage.id, index: 1, status: "NOT_OPENED" },
        });
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          ...(body.format ? { format: FORMAT_TO_PRISMA[body.format] } : {}),
          config: nextConfig,
        },
      });
    });

    return NextResponse.json({ id: tournamentId, format: body.format ?? tournament.format });
  } catch (e) {
    return handleError(e);
  }
}
