// POST /api/tournaments/:tournamentId/teams — U-2: a player, already inside
// the tournament (has a PLAYER VenueMembership from /api/tournaments/join),
// forms their own team, becomes its captain, and names it.
//
// Entry-round resolution (E-6/E-7) is shared with the admin-add path in
// ./admin-add/route.ts — see lib/teams.ts.

import { createTeamInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";
import { createTeamInTournament } from "@/lib/teams";

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
      select: { venueId: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");

    // Being a player at this venue is what /api/tournaments/join grants —
    // require it, rather than trusting the client to have called join first.
    const membership = await prisma.venueMembership.findUnique({
      where: { userId_venueId: { userId: viewer.userId, venueId: tournament.venueId } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    const team = await createTeamInTournament(tournamentId, body.name, viewer.userId);
    return NextResponse.json(team);
  } catch (e) {
    return handleError(e);
  }
}
