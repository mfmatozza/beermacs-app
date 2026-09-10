// POST/DELETE /api/users/:userId/block — guideline 1.2's "block": a
// player's own choice about their own view, not a moderation action (that's
// staff-mute — see tournaments/:id/players/:userId/mute). One-directional
// and personal: blocking someone hides their messages from you across every
// chat you share, it does not stop them from seeing yours or posting.

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId: blockedUserId } = await params;
    const viewer = await requireViewer();
    if (blockedUserId === viewer.userId) throw new HttpError(422, "cannot_block_self");

    await prisma.blockedUser.upsert({
      where: { blockerUserId_blockedUserId: { blockerUserId: viewer.userId, blockedUserId } },
      create: { blockerUserId: viewer.userId, blockedUserId },
      update: {},
    });

    return NextResponse.json({ blockedUserId, blocked: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId: blockedUserId } = await params;
    const viewer = await requireViewer();

    await prisma.blockedUser.deleteMany({
      where: { blockerUserId: viewer.userId, blockedUserId },
    });

    return NextResponse.json({ blockedUserId, blocked: false });
  } catch (e) {
    return handleError(e);
  }
}
