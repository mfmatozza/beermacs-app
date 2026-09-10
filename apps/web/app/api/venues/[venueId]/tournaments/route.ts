// POST /api/venues/:venueId/tournaments — A-1..A-5: create a tournament with
// its format, team size, chat toggle, and physical tables.
//
// VENUE_ADMIN+ only (creating a tournament is a setup action, distinct from
// VENUE_STAFF's night-of running of one). Three things happen in one
// transaction:
//
//   1. The Tournament row itself, plus a fresh join code (A-1..A-2).
//   2. Its Stage(s) — one for single elimination or triangular, two for
//      group-then-knockout — and Round 1 of the first stage, created
//      NOT_OPENED (E-7: round 1 exists conceptually before anyone opens it).
//   3. The venue's physical tables (A-3/A-4), upserted by label. Tables belong
//      to the VENUE, not the tournament — a second tournament at the same bar
//      reuses them, which is why this only creates labels that don't already
//      exist rather than replacing the venue's table set.

import { createTournamentInput, generateJoinCode } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { requireVenueRole } from "@/lib/session";
import { FORMAT_TO_PRISMA, stagesFor } from "@/lib/tournament-format";

export const runtime = "nodejs";

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateJoinCode();
    const clash = await prisma.tournament.findUnique({ where: { joinCode: code } });
    if (!clash) return code;
  }
  throw new Error("Could not generate a unique join code after 8 attempts");
}

/**
 * GET /api/venues/:venueId/tournaments — list this venue's tournaments, newest
 * first. VENUE_STAFF+ (running the night needs to see them; only creating one
 * needs VENUE_ADMIN).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try {
    const { venueId } = await params;
    await requireVenueRole(venueId, Role.VENUE_STAFF);

    const tournaments = await prisma.tournament.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, format: true, status: true, joinCode: true },
    });

    return NextResponse.json({ tournaments });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try {
    const { venueId } = await params;
    await requireVenueRole(venueId, Role.VENUE_ADMIN);
    const body = await parseBody(req, createTournamentInput);

    const joinCode = await uniqueJoinCode();

    const tournament = await prisma.$transaction(async (tx) => {
      const created = await tx.tournament.create({
        data: {
          venueId,
          name: body.name,
          format: FORMAT_TO_PRISMA[body.format],
          status: "REGISTRATION",
          joinCode,
          config: {
            playersPerTeam: body.playersPerTeam,
            chatEnabled: body.chatEnabled,
            cupsToWin: body.cupsToWin,
            confirmTimeoutMins: body.confirmTimeoutMins,
            autoRepechageMode: body.autoRepechageMode,
          },
        },
      });

      const stagesToCreate = stagesFor(body.format);

      const firstStage = await tx.stage.create({
        data: { tournamentId: created.id, ...stagesToCreate[0]! },
      });
      for (const s of stagesToCreate.slice(1)) {
        await tx.stage.create({ data: { tournamentId: created.id, ...s } });
      }

      // Round 1 of the first stage — not_opened, per E-7.
      await tx.round.create({
        data: { stageId: firstStage.id, index: 1, status: "NOT_OPENED" },
      });

      // A-3/A-4: the venue's tables. Only fill in labels that don't already
      // exist — see the module doc above.
      const existing = await tx.venueTable.findMany({
        where: { venueId },
        select: { label: true, sortOrder: true },
      });
      const existingLabels = new Set(existing.map((t) => t.label));
      let nextSort = existing.reduce((max, t) => Math.max(max, t.sortOrder + 1), 0);
      for (const label of body.tableLabels) {
        if (existingLabels.has(label)) continue;
        await tx.venueTable.create({ data: { venueId, label, sortOrder: nextSort } });
        nextSort += 1;
        existingLabels.add(label);
      }

      return created;
    });

    return NextResponse.json({
      id: tournament.id,
      name: tournament.name,
      joinCode: tournament.joinCode,
      status: tournament.status,
    });
  } catch (e) {
    return handleError(e);
  }
}
