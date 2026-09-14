// PATCH/DELETE /api/tables/:tableId — rename or remove one physical table
// (D26). DELETE is a hard delete: VenueTable carries no history of its own
// worth preserving, and any match that was ever assigned to it keeps its
// own record — only the FK is cleared (`onDelete: SetNull`, schema.prisma).

import { updateTableInput } from "@beermacs/shared";
import { prisma, Role } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRoleOrAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await parseBody(req, updateTableInput);

    const table = await prisma.venueTable.findUnique({ where: { id: tableId }, select: { venueId: true } });
    if (!table) throw new HttpError(404, "table_not_found");
    await requireVenueRoleOrAdmin(table.venueId, Role.VENUE_STAFF);

    const clash = await prisma.venueTable.findFirst({
      where: { venueId: table.venueId, label: body.label, id: { not: tableId } },
    });
    if (clash) throw new HttpError(409, "label_already_used");

    const updated = await prisma.venueTable.update({
      where: { id: tableId },
      data: { label: body.label },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const table = await prisma.venueTable.findUnique({
      where: { id: tableId },
      select: { venueId: true, state: true },
    });
    if (!table) throw new HttpError(404, "table_not_found");
    await requireVenueRoleOrAdmin(table.venueId, Role.VENUE_STAFF);

    if (table.state === "BUSY") throw new HttpError(409, "table_in_use");

    await prisma.venueTable.delete({ where: { id: tableId } });
    return NextResponse.json({ id: tableId, deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
