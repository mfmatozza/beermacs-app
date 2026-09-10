// Shared logic for the three chat surfaces (U-8/U-9/U-10) and the
// moderation kit App Store guideline 1.2 requires alongside any of them:
// report (ChatMessage.flaggedAt), block (BlockedUser, a reader's own
// choice), staff-mute (MutedPlayer, scoped to one tournament).
//
// Written once here rather than per-route because "who can read/post in
// this channel" and "what does a message look like once you filter out
// blocked authors" both apply identically across the tournament, match, and
// staff-message surfaces — the three route files differ only in how they
// find/create their channel, not in what happens once they have one.

import { Role, prisma } from "@beermacs/db";
import { HttpError, hasVenueRole, isTeamMember } from "./session";

export interface ChatMessageView {
  readonly id: string;
  readonly authorId: string | null;
  readonly authorName: string | null;
  readonly body: string;
  readonly createdAt: string;
  readonly flaggedAt: string | null;
}

/** Who may read/post in a channel, and whether they may post as staff. */
export interface ChannelAccess {
  readonly userId: string;
  readonly isStaff: boolean;
}

/**
 * TOURNAMENT: any player with a team in this tournament, or staff.
 * Chat must be enabled for the tournament (A-2) — checked by the caller,
 * since only the tournament-channel routes need that check.
 */
export async function requireTournamentChatAccess(
  userId: string,
  tournamentId: string,
  venueId: string
): Promise<ChannelAccess> {
  if (await hasVenueRole(userId, venueId, Role.VENUE_STAFF)) {
    return { userId, isStaff: true };
  }
  const onATeam = await prisma.teamMember.findFirst({
    where: { userId, team: { tournamentId } },
    select: { id: true },
  });
  if (!onATeam) throw new HttpError(403, "not_in_tournament");
  return { userId, isStaff: false };
}

/** MATCH: only the two teams' members, or staff. */
export async function requireMatchChatAccess(
  userId: string,
  homeTeamId: string | null,
  awayTeamId: string | null,
  venueId: string
): Promise<ChannelAccess> {
  if (await hasVenueRole(userId, venueId, Role.VENUE_STAFF)) {
    return { userId, isStaff: true };
  }
  for (const teamId of [homeTeamId, awayTeamId]) {
    if (teamId && (await isTeamMember(userId, teamId))) {
      return { userId, isStaff: false };
    }
  }
  throw new HttpError(403, "not_a_match_participant");
}

/** A-15-style guard: staff can always post; a muted player cannot. */
export async function assertNotMuted(userId: string, tournamentId: string): Promise<void> {
  const muted = await prisma.mutedPlayer.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
    select: { id: true },
  });
  if (muted) throw new HttpError(403, "muted");
}

/**
 * Recent messages in a channel, newest last, with a blocked author's
 * messages replaced by a placeholder rather than removed — removing them
 * would shift every other message's position and make "block" look like it
 * broke the chat rather than hid one person from it.
 */
export async function listChannelMessages(
  channelId: string,
  viewerId: string,
  limit = 100
): Promise<ChatMessageView[]> {
  const [rows, blocked] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { channelId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        authorId: true,
        author: { select: { displayName: true } },
        body: true,
        createdAt: true,
        flaggedAt: true,
      },
    }),
    prisma.blockedUser.findMany({
      where: { blockerUserId: viewerId },
      select: { blockedUserId: true },
    }),
  ]);
  const blockedIds = new Set(blocked.map((b) => b.blockedUserId));

  return rows.map((m) => ({
    id: m.id,
    authorId: m.authorId,
    authorName:
      m.authorId && blockedIds.has(m.authorId) ? null : (m.author?.displayName ?? "Deleted user"),
    body: m.authorId && blockedIds.has(m.authorId) ? "[blocked]" : m.body,
    createdAt: m.createdAt.toISOString(),
    flaggedAt: m.flaggedAt?.toISOString() ?? null,
  }));
}
