// PATCH/DELETE /api/teams/:teamId — rename, or hard-delete (D26). Distinct
// from POST .../withdraw (a soft flag that keeps the team in the bracket
// display and repêchage pool) — DELETE actually removes the row, for a
// team that was a mistake (a duplicate, a test) rather than one that
// genuinely played and left.

import { updateTeamInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRoleOrAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const body = await parseBody(req, updateTeamInput);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { tournament: { select: { venueId: true } } },
    });
    if (!team) throw new HttpError(404, "team_not_found");
    await requireVenueRoleOrAdmin(team.tournament.venueId, Role.VENUE_STAFF);

    const updated = await prisma.team.update({ where: { id: teamId }, data: { name: body.name } });
    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { tournament: { select: { venueId: true } } },
    });
    if (!team) throw new HttpError(404, "team_not_found");
    await requireVenueRoleOrAdmin(team.tournament.venueId, Role.VENUE_STAFF);

    await prisma.team.delete({ where: { id: teamId } });
    return NextResponse.json({ id: teamId, deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
