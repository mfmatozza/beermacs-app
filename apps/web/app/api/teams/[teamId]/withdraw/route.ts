// POST /api/teams/:teamId/withdraw — A-8: the admin can pull a team out at any
// point, no fixed cut-off.
//
// A soft flag, not a delete: match history stays intact for the bracket
// display, and A-9's repêchage draws from history too. This endpoint does
// NOT try to auto-resolve a match the team is currently in — that is what
// POST /api/matches/:id/resolve (A-12) is for, deliberately kept as one
// action an admin takes rather than an automatic cascade guessing at a score.

import { withdrawTeamInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    const body = await parseBody(req, withdrawTeamInput);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, tournamentId: true, tournament: { select: { venueId: true } } },
    });
    if (!team) throw new HttpError(404, "team_not_found");
    const viewer = await requireVenueRole(team.tournament.venueId, Role.VENUE_STAFF);

    await prisma.$transaction([
      prisma.team.update({ where: { id: teamId }, data: { withdrawn: true } }),
      prisma.auditEntry.create({
        data: {
          tournamentId: team.tournamentId,
          actorUserId: viewer.userId,
          action: "team.withdraw",
          reason: body.reason ?? null,
        },
      }),
    ]);

    return NextResponse.json({ id: teamId, withdrawn: true });
  } catch (e) {
    return handleError(e);
  }
}
