// POST /api/matches/:matchId/assign-table — send a match to a physical table.
//
// VENUE_STAFF+. Runs through transition()'s "assign_table" event, same as
// everything else here: this refuses a match with an empty slot (E-2 only
// ever assigns matches that are actually playable) and sends the
// "you're up" notify intent (A-17/U-15) to both teams.

import { assignTableInput, transition } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { ensureMatchChatChannel } from "@/lib/chat-triggers";
import { MATCH_STATE_TO_PRISMA, toDomainMatch } from "@/lib/match-mapping";
import { sendNotifyIntents } from "@/lib/notify";
import { HttpError, requireVenueRoleForMatch } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const { matchId } = await params;
    const viewer = await requireVenueRoleForMatch(matchId, Role.VENUE_STAFF);
    const body = await parseBody(req, assignTableInput);

    const row = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      select: {
        id: true,
        roundId: true,
        position: true,
        homeTeamId: true,
        awayTeamId: true,
        homeViaRepechage: true,
        awayViaRepechage: true,
        state: true,
        winnerTeamId: true,
        homeScore: true,
        awayScore: true,
        venueTableId: true,
        tournamentId: true,
        tournament: { select: { venueId: true, config: true, status: true } },
      },
    });
    if (row.tournament.status === "COMPLETE") throw new HttpError(409, "tournament_ended");

    const table = await prisma.venueTable.findUniqueOrThrow({ where: { id: body.tableId } });
    if (table.venueId !== row.tournament.venueId) throw new HttpError(422, "table_wrong_venue");
    if (table.state !== "OPEN") throw new HttpError(409, "table_not_open");

    const domainMatch = toDomainMatch(row.roundId, row);
    const outcome = transition(
      domainMatch,
      { type: "assign_table", tableId: body.tableId },
      {
        actor: { kind: "staff", userId: viewer.userId },
        pending: null,
        cupsToWin: null,
        now: new Date().toISOString(),
      }
    );

    if (!outcome.ok) throw new HttpError(422, outcome.error.kind);
    const { match: next, notify } = outcome.value;

    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { state: MATCH_STATE_TO_PRISMA[next.state], venueTableId: next.tableId },
      }),
      prisma.venueTable.update({ where: { id: body.tableId }, data: { state: "BUSY" } }),
    ]);

    await sendNotifyIntents(notify, { venueId: row.tournament.venueId, tableLabel: table.label });
    const chatEnabled = (row.tournament.config as { chatEnabled?: boolean })?.chatEnabled ?? false;
    await ensureMatchChatChannel(matchId, row.tournamentId, chatEnabled);

    return NextResponse.json({ id: matchId, tableId: body.tableId, state: next.state });
  } catch (e) {
    return handleError(e);
  }
}
