// Prisma Match row <-> @beermacs/shared's domain Match.
//
// Written once here because it was about to exist a third time (the dispatch
// route, the tournament-detail route, and the manual-pair route each needed
// it) — three copies of the same enum mapping is exactly how one of them
// quietly drifts from the other two.

import type { Match, PendingReport } from "@beermacs/shared";
import type { MatchState } from "@beermacs/db";
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
