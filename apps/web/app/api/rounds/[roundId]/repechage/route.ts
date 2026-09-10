// POST /api/rounds/:roundId/repechage — A-9/A-10: draw a team back in, at any
// time, independent of whether this round's count is actually odd (that
// parity check is E-8's automatic trigger, a separate concern from this
// admin-initiated one — the endpoint itself doesn't care why it was called).
//
// `teamId` omitted = "pick one for me": the same pickAutoRepechage() E-8 uses,
// so an admin's "just draw someone" and the engine's own automatic draw are
// the same choice, not two different algorithms that could disagree. `teamId`
// given = the admin's own pick, checked against the same eligibility pool.
//
// The pool is scoped to the ROUND'S STAGE, not the whole tournament: a team
// eliminated in a group stage is promoted or not by that stage's own
// advanceCount, not drawn back in via this door into a different stage.

import {
  isEligibleForRepechage,
  loserPool,
  pickAutoRepechage,
  repechageInput,
} from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { MATCH_SELECT, toDomainMatch } from "@/lib/match-mapping";
import { HttpError, requireVenueRoleForRound } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ roundId: string }> }) {
  try {
    const { roundId } = await params;
    const viewer = await requireVenueRoleForRound(roundId, Role.VENUE_STAFF);
    const body = await parseBody(req, repechageInput);

    const round = await prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      select: {
        id: true,
        stageId: true,
        stage: {
          select: {
            tournamentId: true,
            rounds: {
              select: {
                id: true,
                matches: { select: MATCH_SELECT },
                entrants: { select: { teamId: true } },
              },
            },
          },
        },
        entrants: { select: { teamId: true } },
      },
    });

    const stageMatches = round.stage.rounds.flatMap((r) =>
      r.matches.map((m) => toDomainMatch(r.id, m))
    );

    // loserPool() only looks at match history, so a team re-admitted into
    // some OTHER round of this stage but not yet paired into a match there
    // still reads as "eliminated" — its most recent MATCH is still the one it
    // lost. Left unfiltered, that team can be drawn a second time before it
    // has even played its first repêchage match. Excluding every team that is
    // already an entrant of ANY round in the stage closes that gap: once
    // admitted, a team stays ineligible until it loses again for real.
    const alreadyReadmitted = new Set(
      round.stage.rounds.flatMap((r) => r.entrants.map((e) => e.teamId))
    );
    const pool = loserPool(stageMatches).filter((p) => !alreadyReadmitted.has(p.teamId));

    let teamId = body.teamId;
    if (teamId) {
      if (alreadyReadmitted.has(teamId) || !isEligibleForRepechage(pool, teamId)) {
        throw new HttpError(409, "not_eligible_for_repechage");
      }
    } else {
      const picked = pickAutoRepechage(pool);
      if (!picked) throw new HttpError(409, "repechage_pool_empty");
      teamId = picked;
    }

    if (round.entrants.some((e) => e.teamId === teamId)) {
      throw new HttpError(409, "already_entrant_of_round");
    }

    await prisma.$transaction([
      prisma.roundEntrant.create({
        data: { roundId, teamId, viaRepechage: true },
      }),
      prisma.auditEntry.create({
        data: {
          tournamentId: round.stage.tournamentId,
          actorUserId: viewer.userId,
          action: "round.repechage",
          reason: body.teamId ? "admin chose the team" : "auto-picked",
          after: { roundId, teamId },
        },
      }),
    ]);

    return NextResponse.json({ roundId, teamId });
  } catch (e) {
    return handleError(e);
  }
}
