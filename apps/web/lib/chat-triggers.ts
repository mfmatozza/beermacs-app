// The two moments a MATCH chat channel's lifecycle is driven by an event
// elsewhere rather than a request to the chat API itself (U-8's "auto-
// created when a match goes on a table, archived on settle"). Called from
// both places a match can go ON_TABLE (assign-table/route.ts, and
// lib/dispatch.ts's automatic table assignment) and both places one can
// settle (the report/confirm/resolve routes).

import { prisma } from "@beermacs/db";

/**
 * Creates the match's chat channel, if the tournament has chat enabled
 * (A-2/U-9) and it doesn't already exist. Idempotent — safe to call every
 * time a match goes on a table, including a repeat assignment.
 */
export async function ensureMatchChatChannel(
  matchId: string,
  tournamentId: string,
  chatEnabled: boolean
): Promise<void> {
  if (!chatEnabled) return;
  const existing = await prisma.chatChannel.findUnique({
    where: { matchId },
    select: { id: true },
  });
  if (existing) return;
  await prisma.chatChannel.create({ data: { tournamentId, kind: "MATCH", matchId } });
}

/** Archives the match's chat channel, if it has one. A no-op otherwise —
 *  most matches settle with chat disabled or never having reached a table. */
export async function archiveMatchChatChannel(matchId: string): Promise<void> {
  await prisma.chatChannel.updateMany({
    where: { matchId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
}
