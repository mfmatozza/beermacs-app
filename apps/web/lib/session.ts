// Server-side session and authorisation.
//
// This file is the security boundary. There is no row-level security to fall
// back on — the phone holds no database credentials, so every check that
// matters happens here, in code, before a query runs. See
// docs/ARCHITECTURE.md.

import { Role, prisma } from "@beermacs/db";
import { headers } from "next/headers";
import { auth } from "./auth";

export interface Viewer {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly phone: string;
}

/** The signed-in user, or null. Reads the cookie or the Bearer token. */
export async function currentViewer(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as typeof session.user & {
    displayName?: string | null;
    phone?: string | null;
  };
  return {
    userId: u.id,
    displayName: u.displayName ?? u.name ?? "Player",
    email: u.email,
    phone: u.phone ?? "",
  };
}

/**
 * Role rank, so a check reads "at least staff" rather than enumerating every
 * role that qualifies. A new role slots into the order instead of into every
 * call site.
 */
const RANK: Record<Role, number> = {
  PLAYER: 0,
  VENUE_STAFF: 1,
  VENUE_ADMIN: 2,
  VENUE_OWNER: 3,
};

/** This user's role at this venue, or null if they are not a member. */
export async function roleAtVenue(userId: string, venueId: string): Promise<Role | null> {
  const m = await prisma.venueMembership.findUnique({
    where: { userId_venueId: { userId, venueId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

export async function hasVenueRole(
  userId: string,
  venueId: string,
  atLeast: Role
): Promise<boolean> {
  const role = await roleAtVenue(userId, venueId);
  return role !== null && RANK[role] >= RANK[atLeast];
}

/** Whether this user is on this team — the check result reporting depends on. */
export async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  return m !== null;
}

/**
 * Resolves who the viewer is FOR THIS MATCH — the one piece every result
 * endpoint (report/confirm/reject/resolve) needs before it can even build an
 * @beermacs/shared Actor. Staff at the match's venue outrank the rules (they
 * get `{kind: "staff"}` even if they also happen to be on one of the teams —
 * the match doesn't care which side a bar owner's own team is on). Otherwise
 * the viewer must be a TeamMember of the home or away team; "each team
 * reports" (U-11) is read as any member acting for it, not captain-only.
 *
 * Throws 403 rather than returning null: every caller's next step is either
 * "use this actor" or "the request is over," so there's nothing useful a
 * caller could do with a null.
 */
export async function resolveMatchActor(
  viewer: Viewer,
  homeTeamId: string | null,
  awayTeamId: string | null,
  venueId: string
): Promise<
  { kind: "staff"; userId: string } | { kind: "captain"; userId: string; teamId: string }
> {
  if (await hasVenueRole(viewer.userId, venueId, Role.VENUE_STAFF)) {
    return { kind: "staff", userId: viewer.userId };
  }
  for (const teamId of [homeTeamId, awayTeamId]) {
    if (teamId && (await isTeamMember(viewer.userId, teamId))) {
      return { kind: "captain", userId: viewer.userId, teamId };
    }
  }
  throw new HttpError(403, "not_a_match_participant");
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string
  ) {
    super(message ?? code);
  }
}

/** Throws 401 if nobody is signed in. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await currentViewer();
  if (!viewer) throw new HttpError(401, "not_signed_in");
  return viewer;
}

/** Throws 403 unless the viewer holds at least `atLeast` at this venue. */
export async function requireVenueRole(venueId: string, atLeast: Role): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!(await hasVenueRole(viewer.userId, venueId, atLeast))) {
    throw new HttpError(403, "insufficient_role");
  }
  return viewer;
}

/**
 * Round/match-scoped routes only have a roundId or matchId in the URL, not a
 * venueId — this resolves the venue by walking the relation (Round → Stage →
 * Tournament) and then applies the usual role check. Throws 404 rather than
 * 403 if the round doesn't exist, so a guessed id doesn't confirm anything.
 */
export async function requireVenueRoleForRound(roundId: string, atLeast: Role): Promise<Viewer> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { stage: { select: { tournament: { select: { venueId: true } } } } },
  });
  if (!round) throw new HttpError(404, "round_not_found");
  return requireVenueRole(round.stage.tournament.venueId, atLeast);
}

/** Same idea, resolved from a stageId (Stage → Tournament, direct FK). Needed
 *  for opening a round whose row may not exist yet — see the open-round route. */
export async function requireVenueRoleForStage(stageId: string, atLeast: Role): Promise<Viewer> {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    select: { tournament: { select: { venueId: true } } },
  });
  if (!stage) throw new HttpError(404, "stage_not_found");
  return requireVenueRole(stage.tournament.venueId, atLeast);
}

/** Same idea, resolved from a matchId (Match → Tournament, direct FK). */
export async function requireVenueRoleForMatch(matchId: string, atLeast: Role): Promise<Viewer> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournament: { select: { venueId: true } } },
  });
  if (!match) throw new HttpError(404, "match_not_found");
  return requireVenueRole(match.tournament.venueId, atLeast);
}
