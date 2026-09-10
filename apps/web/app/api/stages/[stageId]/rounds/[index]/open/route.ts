// POST /api/stages/:stageId/rounds/:index/open — A-13.
//
// Rounds beyond the first are created lazily: nothing creates Round 2's row
// until someone needs it, and A-14 lets an admin open round 2 before round 1
// has finished — so "open round 2" has to be able to create the row, not just
// flip a status on one that's assumed to already exist. Round 1's row already
// exists from tournament creation (E-7), so this is a no-op create there and
// a genuine create for anything after it.
//
// One-way, and idempotent — an already-open round is left alone.
//
// Opening a round is also the one and only place a tournament leaves
// REGISTRATION for RUNNING: nothing else in the lifecycle marks "this
// tournament has actually started," and gating the dispatch pass (E-1..E-3,
// E-8) on RUNNING would otherwise never fire for any tournament, ever.

import { openRound, type Round as DomainRound } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { HttpError, requireVenueRoleForStage } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ stageId: string; index: string }> }
) {
  try {
    const { stageId, index: indexParam } = await params;
    const index = Number.parseInt(indexParam, 10);
    if (!Number.isInteger(index) || index < 1) {
      throw new HttpError(422, "invalid_round_index");
    }

    await requireVenueRoleForStage(stageId, Role.VENUE_STAFF);

    const row = await prisma.round.upsert({
      where: { stageId_index: { stageId, index } },
      create: { stageId, index, status: "NOT_OPENED" },
      update: {},
      select: {
        id: true,
        stageId: true,
        index: true,
        status: true,
        schedulingPaused: true,
        stage: { select: { tournamentId: true } },
      },
    });

    const domainRound: DomainRound = {
      id: row.id,
      stageId: row.stageId,
      index: row.index,
      status: row.status === "OPEN" ? "open" : "not_opened",
      schedulingPaused: row.schedulingPaused,
    };
    const opened = openRound(domainRound);

    if (opened.status !== domainRound.status) {
      await prisma.$transaction([
        prisma.round.update({ where: { id: row.id }, data: { status: "OPEN" } }),
        prisma.tournament.updateMany({
          where: { id: row.stage.tournamentId, status: "REGISTRATION" },
          data: { status: "RUNNING" },
        }),
      ]);
    }

    return NextResponse.json({ id: row.id, index: row.index, status: "open" });
  } catch (e) {
    return handleError(e);
  }
}
