// POST /api/tournaments/:tournamentId/end — an admin ending a tournament.
//
// Terminal and one-way: status -> COMPLETE, endedAt set. Everything else
// this needs was already true or trivially true once status is COMPLETE,
// not new mechanism:
//   - Stop new automatic scheduling: lib/dispatch.ts's runDispatchPass
//     already only queries `status: "RUNNING"` tournaments.
//   - Prevent new match/result mutations: report/confirm/reject/resolve/
//     assign-table now all check for COMPLETE and throw tournament_ended
//     (see each route) — this route doesn't touch Match rows itself.
//   - Remove from players' active-home state: /api/me already filters
//     `status !== "COMPLETE"` out of the teams it returns.
//   - Preserve in history: a status flag, not a delete — nothing here
//     removes a row.
//
// VENUE_ADMIN+ (ending a tournament is a setup-level call, same tier as
// creating one, not a night-of VENUE_STAFF action).

import { prisma, Role } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { HttpError, requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { venueId: true, status: true, endedAt: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    await requireVenueRole(tournament.venueId, Role.VENUE_ADMIN);

    // Idempotent, same as openRound: ending an already-ended tournament is
    // a no-op, not an error — a staff phone retrying a flaky request should
    // never see a failure for repeating something that already happened.
    if (tournament.status !== "COMPLETE") {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "COMPLETE", endedAt: new Date() },
      });
    }

    return NextResponse.json({ id: tournamentId, status: "COMPLETE" });
  } catch (e) {
    return handleError(e);
  }
}
