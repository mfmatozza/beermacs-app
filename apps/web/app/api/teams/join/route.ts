// POST /api/teams/join — U-3: a teammate using the code the team's creator
// shared (numeric code today; QR/link on the mobile side both just carry
// this same code, so one endpoint serves all three input methods U-3
// names). Distinct from /api/tournaments/join (U-1), which only gets
// someone into the tournament at all — this is the second, separate step.
//
// Idempotent: joining a team you're already on succeeds without creating a
// second row (@@unique([teamId, userId]) on TeamMember already enforces
// this at the DB level; this just makes it a clean 200 instead of a raw
// constraint-violation 500).

import { joinTeamInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const viewer = await requireViewer();
    const body = await parseBody(req, joinTeamInput);

    const team = await prisma.team.findUnique({
      where: { joinCode: body.code },
      select: {
        id: true,
        name: true,
        withdrawn: true,
        tournamentId: true,
        tournament: { select: { id: true, name: true, status: true, venueId: true } },
      },
    });
    if (!team) throw new HttpError(404, "unknown_code");
    if (team.withdrawn) throw new HttpError(409, "team_withdrawn");
    if (team.tournament.status !== "REGISTRATION" && team.tournament.status !== "RUNNING") {
      throw new HttpError(409, "tournament_not_open");
    }

    // Being a player at this venue is what /api/tournaments/join grants —
    // require it, same precondition team creation already has.
    const membership = await prisma.venueMembership.findUnique({
      where: { userId_venueId: { userId: viewer.userId, venueId: team.tournament.venueId } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: viewer.userId } },
      create: { teamId: team.id, userId: viewer.userId, isCaptain: false },
      update: {},
    });

    return NextResponse.json({
      team: { id: team.id, name: team.name },
      tournament: { id: team.tournament.id, name: team.tournament.name },
    });
  } catch (e) {
    return handleError(e);
  }
}
