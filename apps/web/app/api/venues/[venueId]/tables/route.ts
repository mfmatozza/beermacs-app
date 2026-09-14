// POST /api/venues/:venueId/tables — add a physical table outside of
// tournament creation's tableLabels (D26). Tables belong to the venue, not
// a tournament (see createTournamentInput's own comment on why), so this
// sits under /venues, not /tournaments.

import { createTableInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRoleOrAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await params;
    await requireVenueRoleOrAdmin(venueId, Role.VENUE_STAFF);
    const body = await parseBody(req, createTableInput);

    const clash = await prisma.venueTable.findFirst({ where: { venueId, label: body.label } });
    if (clash) throw new HttpError(409, "label_already_used");

    const max = await prisma.venueTable.aggregate({
      where: { venueId },
      _max: { sortOrder: true },
    });
    const table = await prisma.venueTable.create({
      data: { venueId, label: body.label, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
    return NextResponse.json(table);
  } catch (e) {
    return handleError(e);
  }
}
