// POST /api/chat/messages/:messageId/report — App Store guideline 1.2's
// report path. Any signed-in viewer who can already read the channel a
// message is in may flag it; flagging doesn't require being right, so this
// doesn't try to re-derive "was this actually offensive" — it just records
// that someone raised a hand, for staff to act on (see ../[messageId] DELETE).
// Idempotent: flagging an already-flagged message is a no-op, not an error.

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { requireMatchChatAccess, requireTournamentChatAccess } from "@/lib/chat";
import { handleError } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await params;
    const viewer = await requireViewer();

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        flaggedAt: true,
        channel: {
          select: {
            tournamentId: true,
            tournament: { select: { venueId: true } },
            match: { select: { homeTeamId: true, awayTeamId: true } },
          },
        },
      },
    });
    if (!message) throw new HttpError(404, "message_not_found");

    // Reuse the same access checks reading the channel would use — reporting
    // something you can't otherwise see isn't a real path, just a probe.
    if (message.channel.match) {
      await requireMatchChatAccess(
        viewer.userId,
        message.channel.match.homeTeamId,
        message.channel.match.awayTeamId,
        message.channel.tournament.venueId
      );
    } else {
      await requireTournamentChatAccess(
        viewer.userId,
        message.channel.tournamentId,
        message.channel.tournament.venueId
      );
    }

    if (!message.flaggedAt) {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { flaggedAt: new Date() },
      });
    }

    return NextResponse.json({ id: messageId, flagged: true });
  } catch (e) {
    return handleError(e);
  }
}
