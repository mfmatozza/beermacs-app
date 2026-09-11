// GET/PATCH /api/push/preferences — the two notification categories a player
// can opt out of from Profile (see lib/notify.ts's `PushCategory`).
//
// Preferences live per-device (Device.preferences), not per-user — see that
// column's own doc comment — so PATCH merges the requested change into
// EVERY device this viewer currently has registered, and a device that
// registers later (reinstall, new phone) starts back at all-enabled. GET
// reads the first device's preferences as "the" current setting for the
// toggle UI; in practice a player has at most one or two devices, and they
// start out in sync since PATCH always applies to all of them together.

import { pushPreferencesInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const viewer = await requireViewer();
    const device = await prisma.device.findFirst({
      where: { userId: viewer.userId },
      orderBy: { lastSeenAt: "desc" },
      select: { preferences: true },
    });
    const prefs = (device?.preferences ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      match: prefs.match !== false,
      news: prefs.news !== false,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const viewer = await requireViewer();
    const patch = await parseBody(req, pushPreferencesInput);

    const devices = await prisma.device.findMany({
      where: { userId: viewer.userId },
      select: { id: true, preferences: true },
    });
    await prisma.$transaction(
      devices.map((d) =>
        prisma.device.update({
          where: { id: d.id },
          data: { preferences: { ...(d.preferences as Record<string, unknown>), ...patch } },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
