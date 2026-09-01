// POST /api/tournaments/join — join tonight's tournament with the code off the
// table tent.
//
// This is the endpoint that makes a bar self-service, so it is worth being
// explicit about what it will and will not do:
//
//   - It requires a session, but that session may be anonymous. The app calls
//     sign-in/anonymous first, so a player never sees a sign-up form.
//   - Joining a tournament creates a PLAYER VenueMembership. Roles are
//     per-venue (§7), so this grants nothing anywhere else.
//   - It refuses codes for tournaments that are not open. A closed tournament
//     returning "wrong code" would send people hunting for a typo.

import { joinTournamentInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const viewer = await requireViewer();
    // Already normalised by the schema — see joinTournamentInput.
    const body = await parseBody(req, joinTournamentInput);

    const tournament = await prisma.tournament.findUnique({
      where: { joinCode: body.code },
      select: {
        id: true,
        name: true,
        status: true,
        venueId: true,
        venue: { select: { id: true, name: true, city: true } },
      },
    });

    if (!tournament || tournament.status === "CANCELED") {
      throw new HttpError(404, "unknown_code");
    }
    if (tournament.status === "COMPLETE") {
      throw new HttpError(409, "tournament_finished");
    }
    if (tournament.status === "DRAFT") {
      throw new HttpError(409, "registration_not_open");
    }

    // Set the display name they typed, and make them a player at this venue.
    // Both are idempotent: re-joining is a no-op, which is what happens when
    // someone force-quits the app and comes back.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: viewer.userId },
        data: { displayName: body.displayName },
      }),
      prisma.venueMembership.upsert({
        where: { userId_venueId: { userId: viewer.userId, venueId: tournament.venueId } },
        create: { userId: viewer.userId, venueId: tournament.venueId, role: Role.PLAYER },
        // Never downgrade: the bar owner plays in their own tournament.
        update: {},
      }),
    ]);

    return NextResponse.json({
      tournament: { id: tournament.id, name: tournament.name, status: tournament.status },
      venue: tournament.venue,
    });
  } catch (e) {
    return handleError(e);
  }
}
