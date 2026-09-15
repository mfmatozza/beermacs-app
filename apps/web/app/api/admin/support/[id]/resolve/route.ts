// POST /api/admin/support/:id/resolve — toggle a support message resolved/
// open. One route for both directions rather than POST+DELETE: a resolved
// item is routinely reopened (a follow-up email comes in), and the toggle
// reads exactly the same either way.

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError } from "@/lib/http";
import { HttpError } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;

    const existing = await prisma.supportMessage.findUnique({
      where: { id },
      select: { resolvedAt: true },
    });
    if (!existing) throw new HttpError(404, "not_found");

    const updated = await prisma.supportMessage.update({
      where: { id },
      data: { resolvedAt: existing.resolvedAt ? null : new Date() },
      select: { id: true, resolvedAt: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleError(e);
  }
}
