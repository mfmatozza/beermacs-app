// POST/DELETE /api/tournaments/:tournamentId/players/:userId/mute —
// guideline 1.2's "staff-mute": a moderation action, distinct from a
// player's own block (see /api/users/:userId/block). VENUE_STAFF+, scoped
// to this one tournament — see MutedPlayer's own schema comment for why.

import { mutePlayerInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string; userId: string }> }
) {
  try {
    const { tournamentId, userId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { venueId: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    const viewer = await requireVenueRole(tournament.venueId, Role.VENUE_STAFF);

    const body = await parseBody(req, mutePlayerInput);

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new HttpError(404, "user_not_found");

    await prisma.mutedPlayer.upsert({
      where: { tournamentId_userId: { tournamentId, userId } },
      create: { tournamentId, userId, mutedById: viewer.userId, reason: body.reason },
      update: { reason: body.reason },
    });

    return NextResponse.json({ userId, muted: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string; userId: string }> }
) {
  try {
    const { tournamentId, userId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { venueId: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    await requireVenueRole(tournament.venueId, Role.VENUE_STAFF);

    await prisma.mutedPlayer.deleteMany({ where: { tournamentId, userId } });

    return NextResponse.json({ userId, muted: false });
  } catch (e) {
    return handleError(e);
  }
}
