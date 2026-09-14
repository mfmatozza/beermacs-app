// GET/POST/DELETE /api/admin/access — grant or revoke a venue role for any
// account, by email. The only way this happens outside a hand-run script
// (docs/DECISIONS.md D22 — this is exactly what those scripts were doing by
// hand, every single time, this whole session).

import { adminGrantAccessInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError, parseBody } from "@/lib/http";
import { HttpError } from "@/lib/session";

export const runtime = "nodejs";

/** GET ?email=... — the user (if any) and every venue they currently hold a role at. */
export async function GET(req: Request) {
  try {
    await requireAdminApi();
    const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
    if (!email) throw new HttpError(422, "email_required");

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        displayName: true,
        email: true,
        memberships: {
          select: { role: true, venue: { select: { id: true, name: true } } },
        },
      },
    });
    return NextResponse.json({ user });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminApi();
    const body = await parseBody(req, adminGrantAccessInput);

    const user = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (!user) throw new HttpError(404, "no_account_with_that_email");

    await prisma.venueMembership.upsert({
      where: { userId_venueId: { userId: user.id, venueId: body.venueId } },
      create: { userId: user.id, venueId: body.venueId, role: body.role as Role },
      update: { role: body.role as Role },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdminApi();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const venueId = url.searchParams.get("venueId");
    if (!userId || !venueId) throw new HttpError(422, "userId_and_venueId_required");

    await prisma.venueMembership.deleteMany({ where: { userId, venueId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
