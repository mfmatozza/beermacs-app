// POST /api/admin/venues/:id/restore — undo a venue soft delete.

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    await prisma.venue.update({ where: { id }, data: { deletedAt: null } });
    return NextResponse.json({ id, restored: true });
  } catch (e) {
    return handleError(e);
  }
}
