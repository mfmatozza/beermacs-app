// POST /api/tournaments/:tournamentId/teams/admin-add — A-7/A-8: staff adding
// a team directly, no join code needed, at any point in the tournament —
// "there is no fixed cut-off" is the whole point of this endpoint existing
// alongside the player self-serve one.
//
// No captain is set: staff are naming a team into existence, not claiming it
// for themselves. Members join it later the same way any teammate does (the
// team invite-by-code flow, once built).

import { adminAddTeamInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRole } from "@/lib/session";
import { createTeamInTournament } from "@/lib/teams";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const body = await parseBody(req, adminAddTeamInput);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { venueId: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    await requireVenueRole(tournament.venueId, Role.VENUE_STAFF);

    const team = await createTeamInTournament(tournamentId, body.name, null);
    return NextResponse.json(team);
  } catch (e) {
    return handleError(e);
  }
}
