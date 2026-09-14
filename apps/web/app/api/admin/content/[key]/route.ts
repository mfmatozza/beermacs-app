// PUT /api/admin/content/:key — upsert one piece of landing-page copy. See
// SiteContent's own schema comment on why this is key-by-key, not one blob.

import { adminSetContentInput } from "@beermacs/shared";
import { Prisma, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError, parseBody } from "@/lib/http";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireAdminApi();
    const { key } = await params;
    const body = await parseBody(req, adminSetContentInput);

    await prisma.siteContent.upsert({
      where: { key },
      create: { key, value: body.value as Prisma.InputJsonValue },
      update: { value: body.value as Prisma.InputJsonValue },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
