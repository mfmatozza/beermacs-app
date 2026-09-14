// GET/POST /api/admin/venues — every venue exists because the platform
// admin made it (docs/DECISIONS.md D15: no self-serve onboarding), so this
// is the ONLY way one gets created outside a hand-run script.

import { adminCreateVenueInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { requireAdminApi } from "@/lib/admin-session";

export const runtime = "nodejs";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "venue"
  );
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const clash = await prisma.venue.findUnique({ where: { slug: candidate } });
    if (!clash) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function GET() {
  try {
    await requireAdminApi();
    const venues = await prisma.venue.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        createdAt: true,
        _count: { select: { memberships: true, tournaments: true } },
      },
    });
    return NextResponse.json({ venues });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminApi();
    const body = await parseBody(req, adminCreateVenueInput);
    const slug = await uniqueSlug(body.name);
    const venue = await prisma.venue.create({
      data: { name: body.name, slug, city: body.city ?? null },
    });
    return NextResponse.json({ id: venue.id, name: venue.name, slug: venue.slug });
  } catch (e) {
    return handleError(e);
  }
}
