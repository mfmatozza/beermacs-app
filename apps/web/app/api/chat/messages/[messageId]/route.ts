// DELETE /api/chat/messages/:messageId — staff removing a message (the
// other half of guideline 1.2's loop: a player reports, staff can act).
// Soft delete (deletedAt), same pattern as everywhere else audit history
// matters — the row stays for a dispute later, it just stops rendering.

import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { HttpError, requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, channel: { select: { tournament: { select: { venueId: true } } } } },
    });
    if (!message) throw new HttpError(404, "message_not_found");
    await requireVenueRole(message.channel.tournament.venueId, Role.VENUE_STAFF);

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ id: messageId, deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
