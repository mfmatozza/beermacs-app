// DELETE /api/teams/:teamId/members/:userId — staff removing a player from a
// team (wrong team, left early). Audited. If the captain is removed, the
// longest-standing remaining member is not promoted automatically: any
// member can already report for the team (see resolveMatchActor).

import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { HttpError, requireVenueRoleOrAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  try {
    const { teamId, userId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { tournamentId: true, tournament: { select: { venueId: true } } },
    });
    if (!team) throw new HttpError(404, "team_not_found");
    const viewer = await requireVenueRoleOrAdmin(team.tournament.venueId, Role.VENUE_STAFF);

    const removed = await prisma.$transaction(async (tx) => {
      const r = await tx.teamMember.deleteMany({ where: { teamId, userId } });
      if (r.count > 0) {
        await tx.auditEntry.create({
          data: {
            tournamentId: team.tournamentId,
            actorUserId: viewer.userId,
            action: "team.remove_member",
            before: { teamId, userId },
          },
        });
      }
      return r.count;
    });
    if (removed === 0) throw new HttpError(404, "member_not_found");
    return NextResponse.json({ teamId, userId, removed: true });
  } catch (e) {
    return handleError(e);
  }
}
