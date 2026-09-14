// POST /api/tables/:tableId/state — pull a wobbly table out of rotation, or
// bring it back. VENUE_STAFF+, same tier as everything else that touches the
// dispatcher's night-of running state (assign-table, dispatch/run).
//
// `setTableStateInput` (@beermacs/shared) has existed since the tables were
// first modeled; nothing ever called it until the mobile admin console
// needed a way to actually do this instead of leaving a table permanently
// OPEN or BUSY.

import { setTableStateInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRoleOrAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await parseBody(req, setTableStateInput);

    const table = await prisma.venueTable.findUnique({
      where: { id: tableId },
      select: { id: true, venueId: true, state: true },
    });
    if (!table) throw new HttpError(404, "table_not_found");
    await requireVenueRoleOrAdmin(table.venueId, Role.VENUE_STAFF);

    // A table mid-match (BUSY) isn't just "closed" — it has a live match
    // sitting on it. Closing it here would strand that match with no
    // recorded table state change on the match itself; that has to go
    // through settling/reassigning the match, not this endpoint — UNLESS
    // `force` is set, for the table that's stuck BUSY with nothing actually
    // live on it (see this schema field's own comment).
    if (table.state === "BUSY" && !body.force) throw new HttpError(409, "table_in_use");

    if (body.force) {
      await prisma.match.updateMany({
        where: { venueTableId: tableId, state: { not: "CONFIRMED" } },
        data: { venueTableId: null },
      });
    }

    const updated = await prisma.venueTable.update({
      where: { id: tableId },
      data: { state: body.state === "open" ? "OPEN" : "CLOSED" },
    });
    return NextResponse.json({ id: updated.id, state: body.state });
  } catch (e) {
    return handleError(e);
  }
}
