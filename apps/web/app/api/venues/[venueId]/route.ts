// PATCH/DELETE /api/venues/:venueId — D26: edit or remove a venue from the
// web console, the only place a venue can be created (D15) and now the only
// place one can be edited or retired.
//
// DELETE is soft (deletedAt) — a venue's tournaments/tables/memberships are
// real history, not something to cascade-destroy the way a single
// tournament delete does.

import { updateVenueInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRoleOrAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await params;
    await requireVenueRoleOrAdmin(venueId, Role.VENUE_OWNER);
    const body = await parseBody(req, updateVenueInput);

    const venue = await prisma.venue.update({
      where: { id: venueId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
      },
      select: { id: true, name: true, city: true },
    });
    return NextResponse.json(venue);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await params;
    await requireVenueRoleOrAdmin(venueId, Role.VENUE_OWNER);

    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { deletedAt: true } });
    if (!venue) throw new HttpError(404, "venue_not_found");

    await prisma.venue.update({ where: { id: venueId }, data: { deletedAt: new Date() } });
    return NextResponse.json({ id: venueId, deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
