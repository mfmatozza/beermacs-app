// POST /api/rounds/:roundId/scheduling — A-15: pause or resume automatic
// dispatch into this one round, without tearing anything down. Matches
// already on a table are unaffected.

import { setSchedulingPaused, type Round as DomainRound } from "@beermacs/shared";
import { setRoundSchedulingInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { requireVenueRoleForRound } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ roundId: string }> }) {
  try {
    const { roundId } = await params;
    await requireVenueRoleForRound(roundId, Role.VENUE_STAFF);
    const body = await parseBody(req, setRoundSchedulingInput);

    const row = await prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      select: { id: true, stageId: true, index: true, status: true, schedulingPaused: true },
    });
    const domainRound: DomainRound = {
      id: row.id,
      stageId: row.stageId,
      index: row.index,
      status: row.status === "OPEN" ? "open" : "not_opened",
      schedulingPaused: row.schedulingPaused,
    };
    const updated = setSchedulingPaused(domainRound, body.paused);

    if (updated.schedulingPaused !== domainRound.schedulingPaused) {
      await prisma.round.update({
        where: { id: roundId },
        data: { schedulingPaused: body.paused },
      });
    }

    return NextResponse.json({ id: roundId, schedulingPaused: body.paused });
  } catch (e) {
    return handleError(e);
  }
}
