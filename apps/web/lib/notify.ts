// Turns a transition()'s NotifyIntent[] into actual pushes (U-15..U-17,
// A-17). SERVER-ONLY.
//
// transition() itself stays pure — it decides THAT a push should go out,
// never sends one (see its own doc comment). This is the one place that
// intent gets carried out, so every route that calls transition() reaches
// the same copy and the same audience-resolution logic rather than each
// writing its own.

import type { NotifyIntent } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { sendPushToTokens } from "./push";

async function tokensForTeams(teamIds: readonly string[]): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const members = await prisma.teamMember.findMany({
    where: { teamId: { in: [...teamIds] } },
    select: { userId: true },
  });
  return tokensForUsers(members.map((m) => m.userId));
}

/**
 * Everyone with a team in this tournament (A-19's "anyone in the app", read
 * as "anyone in this tournament" — see messages/route.ts's doc comment).
 * Team membership is the only durable "is in this tournament" record there
 * is: joining only writes a venue-level PLAYER membership, not a per-
 * tournament one (the same gap docs/ROADMAP.md's Phase 4 notes for the
 * bracket screen — a player who joined but hasn't formed a team yet isn't
 * reachable here either).
 */
async function tokensForTournamentPlayers(tournamentId: string): Promise<string[]> {
  const members = await prisma.teamMember.findMany({
    where: { team: { tournamentId } },
    select: { userId: true },
  });
  return tokensForUsers(members.map((m) => m.userId));
}

async function tokensForVenueStaff(venueId: string): Promise<string[]> {
  const staff = await prisma.venueMembership.findMany({
    where: { venueId, role: { in: [Role.VENUE_STAFF, Role.VENUE_ADMIN, Role.VENUE_OWNER] } },
    select: { userId: true },
  });
  return tokensForUsers(staff.map((m) => m.userId));
}

async function tokensForUsers(userIds: readonly string[]): Promise<string[]> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return [];
  const devices = await prisma.device.findMany({
    where: { userId: { in: unique } },
    select: { expoPushToken: true },
  });
  return devices.map((d) => d.expoPushToken);
}

/**
 * Context a caller already has on hand from settling/assigning the match —
 * cheaper to pass through than to re-query here. `tableLabel` is only used
 * by the `youre_up` intent.
 */
export interface NotifyMatchContext {
  readonly venueId: string;
  readonly tableLabel?: string | null;
}

/**
 * A-19: "all admin messages trigger a push notification for the
 * recipients." The three targets mirror sendAdminMessageInput's own three
 * shapes exactly — the route resolves which ChatChannel to write to, this
 * resolves who gets pinged about it.
 */
export type AdminMessageTarget =
  | { readonly kind: "team"; readonly teamId: string }
  | { readonly kind: "direct"; readonly userId: string }
  | { readonly kind: "broadcast"; readonly tournamentId: string };

export async function sendAdminMessagePush(
  target: AdminMessageTarget,
  body: string
): Promise<void> {
  const tokens = await (target.kind === "team"
    ? tokensForTeams([target.teamId])
    : target.kind === "direct"
      ? tokensForUsers([target.userId])
      : tokensForTournamentPlayers(target.tournamentId));

  await sendPushToTokens(tokens, {
    title: "Message from the bar",
    body,
    data: { kind: "admin_message" },
  });
}

export async function sendNotifyIntents(
  notify: readonly NotifyIntent[],
  ctx: NotifyMatchContext
): Promise<void> {
  for (const intent of notify) {
    switch (intent.kind) {
      case "youre_up": {
        const tokens = await tokensForTeams(intent.teams);
        await sendPushToTokens(tokens, {
          title: "You're up!",
          body: ctx.tableLabel ? `Head to ${ctx.tableLabel} now.` : "A table just opened up.",
          data: { kind: "match" },
        });
        break;
      }
      case "confirm_result": {
        const tokens = await tokensForTeams([intent.team]);
        await sendPushToTokens(tokens, {
          title: "Confirm your result",
          body: "The other team reported a winner — take a look.",
          data: { kind: "match" },
        });
        break;
      }
      case "result_settled": {
        const tokens = await tokensForTeams(intent.teams);
        await sendPushToTokens(tokens, {
          title: "Match confirmed",
          body: "Your result is locked in.",
          data: { kind: "match" },
        });
        break;
      }
      case "staff_needed": {
        const tokens = await tokensForVenueStaff(ctx.venueId);
        await sendPushToTokens(tokens, {
          title: "A dispute needs a ruling",
          body: "Two teams reported different winners.",
          data: { kind: "dispute" },
        });
        break;
      }
    }
  }
}
