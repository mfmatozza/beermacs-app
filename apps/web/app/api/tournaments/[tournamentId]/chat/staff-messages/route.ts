// GET /api/tournaments/:tournamentId/chat/staff-messages — the third of the
// three surfaces U-8/U-9/U-10 describe: "staff broadcasts." Read-only for
// players — writing here is the existing admin POST
// /api/tournaments/:id/messages (A-18/A-19), which already picks the right
// channel (TEAM/DIRECT/BROADCAST) from who it's addressed to. This just
// merges the three kinds a player can be a recipient of into one feed,
// since a player has no reason to know which of the three a given message
// came in on.

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { listChannelMessages } from "@/lib/chat";
import { handleError } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const viewer = await requireViewer();

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");

    const myTeam = await prisma.teamMember.findFirst({
      where: { userId: viewer.userId, team: { tournamentId } },
      select: { teamId: true },
    });

    const channels = await prisma.chatChannel.findMany({
      where: {
        tournamentId,
        OR: [
          { kind: "BROADCAST" },
          { kind: "DIRECT", recipientUserId: viewer.userId },
          ...(myTeam ? [{ kind: "TEAM" as const, teamId: myTeam.teamId }] : []),
        ],
      },
      select: { id: true },
    });

    const perChannel = await Promise.all(
      channels.map((c) => listChannelMessages(c.id, viewer.userId))
    );
    const messages = perChannel.flat().sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return NextResponse.json({ messages });
  } catch (e) {
    return handleError(e);
  }
}
