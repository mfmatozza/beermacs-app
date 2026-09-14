// GET /api/admin/content — every SiteContent row, for the content editor to
// pre-fill its form. Individual keys are written via .../content/[key].

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminApi();
    const rows = await prisma.siteContent.findMany();
    const content: Record<string, unknown> = {};
    for (const row of rows) content[row.key] = row.value;
    return NextResponse.json({ content });
  } catch (e) {
    return handleError(e);
  }
}
