// GET /api/tournaments/:tournamentId/board — U-7/E-5: the bracket and
// standings, "visible to everyone." Any signed-in viewer, not just this
// venue's staff — this is deliberately a different (and much smaller) read
// than GET /api/tournaments/:tournamentId, which is the night-of running
// view for staff and includes things a player has no business reading
// (joinCode, table inventory, the full config).
//
// Team names are embedded directly on each match rather than returned as a
// separate roster — the client renders a list of matches, not a lookup.

import type { PendingReport } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { MATCH_STATE_TO_DOMAIN, getPendingReport } from "@/lib/match-mapping";
import { requireViewer } from "@/lib/session";

export const runtime = "nodejs";

interface BoardTeam {
  readonly teamId: string;
  readonly name: string;
  readonly viaRepechage: boolean;
}

interface BoardMatch {
  readonly id: string;
  readonly position: number;
  readonly state: string;
  readonly home: BoardTeam | null;
  readonly away: BoardTeam | null;
  readonly winnerTeamId: string | null;
  readonly score: { home: number; away: number } | null;
  readonly tableLabel: string | null;
  /** Only set while state === "reported" — the standing claim the other
   *  side needs to confirm or dispute (U-12/U-13). */
  readonly pendingReport: PendingReport | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    await requireViewer();
    const { tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        format: true,
        status: true,
        config: true,
        stages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            order: true,
            rounds: {
              orderBy: { index: "asc" },
              select: {
                id: true,
                index: true,
                status: true,
                // Not surfaced through a match: a team just added to an open
                // round (E-6/E-7), or freshly repêchaged, is a round entrant
                // before it is ever a home/away slot on one — the mobile
                // client's "you're in, waiting to be paired" state needs this.
                entrants: { select: { teamId: true } },
                matches: {
                  orderBy: { position: "asc" },
                  select: {
                    id: true,
                    position: true,
                    state: true,
                    homeTeamId: true,
                    awayTeamId: true,
                    homeViaRepechage: true,
                    awayViaRepechage: true,
                    winnerTeamId: true,
                    homeScore: true,
                    awayScore: true,
                    homeTeam: { select: { name: true } },
                    awayTeam: { select: { name: true } },
                    venueTable: { select: { label: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const config = (tournament.config ?? {}) as {
      cupsToWin?: number | null;
      playersPerTeam?: number;
    };

    const stages = await Promise.all(
      tournament.stages.map(async (stage) => ({
        id: stage.id,
        type: stage.type,
        order: stage.order,
        rounds: await Promise.all(
          stage.rounds.map(async (round) => ({
            id: round.id,
            index: round.index,
            status: round.status === "OPEN" ? "open" : "not_opened",
            entrantTeamIds: round.entrants.map((e) => e.teamId),
            matches: await Promise.all(
              round.matches.map(async (m): Promise<BoardMatch> => ({
                id: m.id,
                position: m.position,
                state: MATCH_STATE_TO_DOMAIN[m.state],
                home: m.homeTeamId
                  ? {
                      teamId: m.homeTeamId,
                      name: m.homeTeam!.name,
                      viaRepechage: m.homeViaRepechage,
                    }
                  : null,
                away: m.awayTeamId
                  ? {
                      teamId: m.awayTeamId,
                      name: m.awayTeam!.name,
                      viaRepechage: m.awayViaRepechage,
                    }
                  : null,
                winnerTeamId: m.winnerTeamId,
                score:
                  m.homeScore !== null && m.awayScore !== null
                    ? { home: m.homeScore, away: m.awayScore }
                    : null,
                tableLabel: m.venueTable?.label ?? null,
                pendingReport: m.state === "REPORTED" ? await getPendingReport(m.id) : null,
              }))
            ),
          }))
        ),
      }))
    );

    return NextResponse.json({
      id: tournament.id,
      name: tournament.name,
      format: tournament.format,
      status: tournament.status,
      config: {
        cupsToWin: config.cupsToWin ?? null,
        playersPerTeam: config.playersPerTeam ?? null,
      },
      stages,
    });
  } catch (e) {
    return handleError(e);
  }
}
