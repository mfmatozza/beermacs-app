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
  readonly isAnonymous: boolean;
}

/** The signed-in user, or null. Reads the cookie or the Bearer token. */
export async function currentViewer(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as typeof session.user & {
    displayName?: string | null;
    isAnonymous?: boolean | null;
  };
  return {
    userId: u.id,
    displayName: u.displayName ?? u.name ?? "Player",
    isAnonymous: u.isAnonymous ?? false,
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
