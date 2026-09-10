// GET /api/venues/:venueId/players — A-21: email/phone of everyone registered
// at this venue, so the admin can re-contact them for the next tournament.
//
// VENUE_ADMIN+, not VENUE_STAFF — this is the one place in the app that
// surfaces a player's contact details in bulk, and G-2's justification for
// collecting them in the first place ("so admins can contact players again")
// is specifically an admin action, not a night-of running one.

import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try {
    const { venueId } = await params;
    await requireVenueRole(venueId, Role.VENUE_ADMIN);

    const memberships = await prisma.venueMembership.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      select: {
        role: true,
        createdAt: true,
        user: { select: { id: true, displayName: true, email: true, phone: true } },
      },
    });

    return NextResponse.json({
      players: memberships.map((m) => ({
        userId: m.user.id,
        displayName: m.user.displayName,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
