// GET /api/admin/support — every support message, open first. Platform-
// admin only (not venue-scoped: a contact-form submission isn't about any
// one venue) — see .../support/[id]/resolve for the other half.

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminApi();
    const messages = await prisma.supportMessage.findMany({
      orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        body: true,
        source: true,
        resolvedAt: true,
        createdAt: true,
        userId: true,
      },
    });
    return NextResponse.json({ messages });
  } catch (e) {
    return handleError(e);
  }
}
