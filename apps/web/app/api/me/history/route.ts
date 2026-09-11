// GET /api/me/history — every COMPLETE tournament this viewer played in,
// newest-first, with that team's win/loss record.
//
// Deliberately does NOT claim a placement ("you finished 2nd") — computing a
// real final standing generically across single_elimination,
// group_then_knockout, and triangular would mean walking each format's own
// bracket shape to find "the final," and getting that wrong would show a
// player a made-up result. A record (confirmed wins vs. losses) is data this
// route can state correctly for any format, so that's what it shows; see
// docs/DECISIONS.md for the rest of Profile/History's scope this pass.
//
// This was blocked on nothing except the tournament-ending feature existing
// (see /api/tournaments/:id/end) — before that, no tournament ever reached
// COMPLETE, so this always returned an empty list. It isn't blocked on the
// old "the original app wiped its tables" problem app/(tabs)/history.tsx's
// placeholder names either: that was about a different, now-superseded app.

import { MatchState, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const viewer = await requireViewer();

    const memberships = await prisma.teamMember.findMany({
      where: { userId: viewer.userId, team: { tournament: { status: "COMPLETE" } } },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            tournament: {
              select: {
                id: true,
                name: true,
                endedAt: true,
                venue: { select: { name: true, city: true } },
              },
            },
          },
        },
      },
      orderBy: { team: { tournament: { endedAt: "desc" } } },
    });

    const entries = await Promise.all(
      memberships.map(async ({ team }) => {
        const matches = await prisma.match.findMany({
          where: {
            state: MatchState.CONFIRMED,
            OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
          },
          select: { winnerTeamId: true },
        });
        const wins = matches.filter((m) => m.winnerTeamId === team.id).length;
        return {
          tournamentId: team.tournament.id,
          tournamentName: team.tournament.name,
          venueName: team.tournament.venue.name,
          venueCity: team.tournament.venue.city,
          endedAt: team.tournament.endedAt,
          teamName: team.name,
          wins,
          losses: matches.length - wins,
        };
      })
    );

    return NextResponse.json({ entries });
  } catch (e) {
    return handleError(e);
  }
}
