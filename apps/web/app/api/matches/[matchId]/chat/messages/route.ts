// GET/POST /api/matches/:matchId/chat/messages — U-8: "each match has its
// own internal chat, including the user, their teammate(s) and their
// opponents." The channel itself is NOT created here — it's created the
// moment the match goes on a table (see lib/chat-triggers.ts, called from
// assign-table/route.ts and lib/dispatch.ts) and archived the moment it
// settles, so a match with no channel yet just means "hasn't played yet."

import { sendChatMessageInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { assertNotMuted, listChannelMessages, requireMatchChatAccess } from "@/lib/chat";
import { handleError, parseBody } from "@/lib/http";
import { sendMatchChatPush } from "@/lib/notify";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

async function loadMatchAndChannel(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      tournamentId: true,
      tournament: { select: { venueId: true } },
      channel: { select: { id: true } },
    },
  });
  if (!match) throw new HttpError(404, "match_not_found");
  if (!match.channel) throw new HttpError(404, "chat_not_started");
  return match;
}

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const viewer = await requireViewer();
    const match = await loadMatchAndChannel(matchId);
    await requireMatchChatAccess(
      viewer.userId,
      match.homeTeamId,
      match.awayTeamId,
      match.tournament.venueId
    );

    const messages = await listChannelMessages(match.channel!.id, viewer.userId);
    return NextResponse.json({ channelId: match.channel!.id, messages });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const viewer = await requireViewer();
    const body = await parseBody(req, sendChatMessageInput);
    const match = await loadMatchAndChannel(matchId);
    await requireMatchChatAccess(
      viewer.userId,
      match.homeTeamId,
      match.awayTeamId,
      match.tournament.venueId
    );
    await assertNotMuted(viewer.userId, match.tournamentId);

    const message = await prisma.chatMessage.create({
      data: { channelId: match.channel!.id, authorId: viewer.userId, body: body.body },
    });

    await sendMatchChatPush(match.homeTeamId, match.awayTeamId, viewer.displayName);

    return NextResponse.json({ id: message.id, channelId: match.channel!.id });
  } catch (e) {
    return handleError(e);
  }
}
