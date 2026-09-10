// GET/POST /api/tournaments/:tournamentId/chat/messages — U-9: "everyone
// playing tonight." Lazily created on first use (find-or-create by
// tournamentId+kind=TOURNAMENT), same pattern the admin BROADCAST channel
// already uses — only exists at all if the tournament's format enables chat
// (A-2).

import { sendChatMessageInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { assertNotMuted, listChannelMessages, requireTournamentChatAccess } from "@/lib/chat";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

async function loadTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { venueId: true, config: true },
  });
  if (!tournament) throw new HttpError(404, "tournament_not_found");
  const chatEnabled = (tournament.config as { chatEnabled?: boolean })?.chatEnabled ?? false;
  if (!chatEnabled) throw new HttpError(409, "chat_disabled");
  return tournament;
}

async function findOrCreateChannel(tournamentId: string) {
  return (
    (await prisma.chatChannel.findFirst({ where: { tournamentId, kind: "TOURNAMENT" } })) ??
    (await prisma.chatChannel.create({ data: { tournamentId, kind: "TOURNAMENT" } }))
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const viewer = await requireViewer();
    const tournament = await loadTournament(tournamentId);
    await requireTournamentChatAccess(viewer.userId, tournamentId, tournament.venueId);

    const channel = await findOrCreateChannel(tournamentId);
    const messages = await listChannelMessages(channel.id, viewer.userId);

    return NextResponse.json({ channelId: channel.id, messages });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const viewer = await requireViewer();
    const body = await parseBody(req, sendChatMessageInput);
    const tournament = await loadTournament(tournamentId);
    await requireTournamentChatAccess(viewer.userId, tournamentId, tournament.venueId);
    await assertNotMuted(viewer.userId, tournamentId);

    const channel = await findOrCreateChannel(tournamentId);
    const message = await prisma.chatMessage.create({
      data: { channelId: channel.id, authorId: viewer.userId, body: body.body },
    });

    return NextResponse.json({ id: message.id, channelId: channel.id });
  } catch (e) {
    return handleError(e);
  }
}
