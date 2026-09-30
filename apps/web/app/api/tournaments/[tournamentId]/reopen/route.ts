// POST /api/tournaments/:tournamentId/reopen — undo ../end. COMPLETE -> RUNNING,
// endedAt cleared. Same tier as ending (VENUE_ADMIN+ or the platform admin).
// Tables released on end stay released; the dispatcher re-seats queued
// matches on its next pass, since it only ever looks at RUNNING tournaments.

import { prisma, Role } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { HttpError, requireVenueRoleOrAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { venueId: true, status: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    const viewer = await requireVenueRoleOrAdmin(tournament.venueId, Role.VENUE_ADMIN);

    if (tournament.status === "COMPLETE") {
      await prisma.$transaction([
        prisma.tournament.update({
          where: { id: tournamentId },
          data: { status: "RUNNING", endedAt: null },
        }),
        prisma.auditEntry.create({
          data: { tournamentId, actorUserId: viewer.userId, action: "tournament.reopen" },
        }),
      ]);
    }
    return NextResponse.json({ id: tournamentId, status: "RUNNING" });
  } catch (e) {
    return handleError(e);
  }
}
