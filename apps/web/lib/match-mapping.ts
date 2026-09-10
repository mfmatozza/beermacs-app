// Prisma Match row <-> @beermacs/shared's domain Match.
//
// Written once here because it was about to exist a third time (the dispatch
// route, the tournament-detail route, and the manual-pair route each needed
// it) — three copies of the same enum mapping is exactly how one of them
// quietly drifts from the other two.

import type { Match, PendingReport } from "@beermacs/shared";
import type { MatchState, PrismaClient } from "@beermacs/db";
import { prisma } from "@beermacs/db";

export const MATCH_STATE_TO_DOMAIN: Record<MatchState, Match["state"]> = {
  SCHEDULED: "scheduled",
  QUEUED: "queued",
  ON_TABLE: "on_table",
  REPORTED: "reported",
  DISPUTED: "disputed",
  CONFIRMED: "confirmed",
};

export const MATCH_STATE_TO_PRISMA: Record<Match["state"], MatchState> = {
  scheduled: "SCHEDULED",
  queued: "QUEUED",
  on_table: "ON_TABLE",
  reported: "REPORTED",
  disputed: "DISPUTED",
  confirmed: "CONFIRMED",
};

/** The shape every route so far selects for a match — kept in one place so a
 *  new field only needs adding here, not in every `select`. */
export const MATCH_SELECT = {
  id: true,
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
} as const;

type MatchRow = {
  id: string;
  position: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeViaRepechage: boolean;
  awayViaRepechage: boolean;
  state: MatchState;
  winnerTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venueTableId: string | null;
};

export function toDomainMatch(roundId: string, m: MatchRow): Match {
  return {
    id: m.id,
    roundId,
    position: m.position,
    home: { teamId: m.homeTeamId, viaRepechage: m.homeViaRepechage },
    away: { teamId: m.awayTeamId, viaRepechage: m.awayViaRepechage },
    state: MATCH_STATE_TO_DOMAIN[m.state],
    winnerId: m.winnerTeamId,
    score:
      m.homeScore !== null && m.awayScore !== null
        ? { home: m.homeScore, away: m.awayScore }
        : null,
    tableId: m.venueTableId,
  };
}

// ── The pending report ───────────────────────────────────────────────────
//
// A match can only ever have ONE "reported" phase in its lifecycle — "report"
// is only a valid event from ON_TABLE, and once a captain's claim moves it to
// REPORTED, the only ways out are confirm/reject/timeout (captains) or
// staff_resolve (staff), none of which lead back to ON_TABLE. So there is at
// most one CLAIM MatchReport per match, ever, and it's always the pending one
// while state === "reported".

export async function getPendingReport(matchId: string): Promise<PendingReport | null> {
  const claim = await prisma.matchReport.findFirst({
    where: { matchId, kind: "CLAIM" },
    orderBy: { createdAt: "desc" },
  });
  if (!claim || !claim.teamId || !claim.claimedWinnerTeamId) return null;
  return {
    reportedByTeamId: claim.teamId,
    winnerId: claim.claimedWinnerTeamId,
    score:
      claim.homeScore !== null && claim.awayScore !== null
        ? { home: claim.homeScore, away: claim.awayScore }
        : null,
    at: claim.createdAt.toISOString(),
  };
}

// ── Advancing a winner ───────────────────────────────────────────────────
//
// When a match settles, its winner becomes an entrant of the NEXT round —
// explicitly, here, once. This is rounds.ts's documented model: RoundEntrant
// rows are never reconstructed from match history, they're written the
// moment something makes a team eligible for a round. Settling a match is one
// of those somethings, alongside initial registration and repêchage.
//
// The next round's OWN row is created here too if it doesn't exist yet
// (same upsert-by-index the open-round route uses) but left NOT_OPENED —
// advancing a winner is not the same thing as opening the round for play;
// that stays an explicit admin action (A-13).
//
// Deliberately does not attempt to detect "this was the final — mark the
// tournament complete." That needs a signal this function doesn't have (a
// group stage's promotion is a different mechanism — advanceCount — from a
// pure elimination stage's "one team left"), and is tracked as open work in
// docs/ROADMAP.md rather than half-built here.
//
// A no-op for a group-stage match (`groupId` set — schema comment: "Set only
// for group-stage matches"): a group's promotion runs on standings after
// every match in the group is done, not per-match, so there is nothing for
// this function to do there.

export async function advanceWinnerToNextRound(
  tx: Pick<PrismaClient, "round" | "roundEntrant">,
  match: { roundId: string; winnerTeamId: string | null; groupId: string | null }
): Promise<void> {
  if (!match.winnerTeamId || match.groupId) return;

  const round = await tx.round.findUniqueOrThrow({
    where: { id: match.roundId },
    select: { stageId: true, index: true },
  });

  const nextRound = await tx.round.upsert({
    where: { stageId_index: { stageId: round.stageId, index: round.index + 1 } },
    create: { stageId: round.stageId, index: round.index + 1, status: "NOT_OPENED" },
    update: {},
  });

  await tx.roundEntrant.upsert({
    where: { roundId_teamId: { roundId: nextRound.id, teamId: match.winnerTeamId } },
    create: { roundId: nextRound.id, teamId: match.winnerTeamId, viaRepechage: false },
    update: {},
  });
}
