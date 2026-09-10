// POST /api/push/register — a device handing over its Expo push token
// (U-15..U-17). Called from HomeScreen's join flow, not at sign-up — see
// registerForPush's call site for why (permission should be asked for at a
// moment the reason is obvious, not on first launch).
//
// Upserts by token, not by (userId, token): re-registering an existing
// token re-points it at whoever is signed in now — a shared or reinstalled
// device should notify its current owner, not whoever last registered it.

import { pushRegisterInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const viewer = await requireViewer();
    const body = await parseBody(req, pushRegisterInput);

    const device = await prisma.device.upsert({
      where: { expoPushToken: body.expoPushToken },
      create: {
        userId: viewer.userId,
        expoPushToken: body.expoPushToken,
        platform: body.platform,
      },
      update: {
        userId: viewer.userId,
        platform: body.platform,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ id: device.id });
  } catch (e) {
    return handleError(e);
  }
}
