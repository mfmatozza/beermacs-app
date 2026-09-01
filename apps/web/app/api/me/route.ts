// GET /api/me — who this device is, and what it may do where.
//
// The app calls this once on boot. It is the only place the client learns its
// roles; nothing is inferred on the device, because a role decided on the phone
// is a role the phone can change.

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const viewer = await requireViewer();

    const memberships = await prisma.venueMembership.findMany({
      where: { userId: viewer.userId },
      select: {
        role: true,
        venue: { select: { id: true, name: true, slug: true, city: true } },
      },
    });

    const teams = await prisma.teamMember.findMany({
      where: { userId: viewer.userId },
      select: {
        isCaptain: true,
        team: {
          select: {
            id: true,
            name: true,
            tournament: { select: { id: true, name: true, status: true, venueId: true } },
          },
        },
      },
    });

    return NextResponse.json({
      user: {
        id: viewer.userId,
        displayName: viewer.displayName,
        isAnonymous: viewer.isAnonymous,
      },
      memberships,
      // Only tournaments still in play; History reads the rest.
      teams: teams.filter((t) => t.team.tournament.status !== "COMPLETE"),
    });
  } catch (e) {
    return handleError(e);
  }
}
