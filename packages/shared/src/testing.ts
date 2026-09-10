import type {
  Match,
  MatchId,
  Round,
  RoundId,
  Score,
  Slot,
  Team,
  TeamId,
  VenueTable,
} from "./domain";

/** Fixture builders, so tests read as scenarios rather than object literals. */

export const team = (id: string, entryRound = 1, name = id.toUpperCase()): Team => ({
  id,
  name,
  entryRound,
  withdrawn: false,
});

export const teams = (...names: string[]): Team[] => names.map((n) => team(n, 1));

const slot = (teamId: TeamId | null, viaRepechage = false): Slot => ({ teamId, viaRepechage });

export function match(over: Partial<Match> & { id: MatchId }): Match {
  return {
    roundId: "r1",
    position: 0,
    home: slot(null),
    away: slot(null),
    state: "scheduled",
    winnerId: null,
    score: null,
    tableId: null,
    ...over,
  };
}

/** A match between two teams, optionally already settled. */
export function played(
  id: MatchId,
  roundId: RoundId,
  position: number,
  home: TeamId,
  away: TeamId,
  winner?: TeamId
): Match {
  return match({
    id,
    roundId,
    position,
    home: slot(home),
    away: slot(away),
    ...(winner
      ? { state: "confirmed" as const, winnerId: winner, score: { home: 10, away: 7 } }
      : {}),
  });
}

export const round = (
  id: RoundId,
  index: number,
  status: Round["status"] = "not_opened",
  schedulingPaused = false
): Round => ({ id, stageId: "s1", index, status, schedulingPaused });

export const venueTable = (
  id: string,
  sortOrder: number,
  state: VenueTable["state"] = "open"
): VenueTable => ({
  id,
  label: `Table ${sortOrder + 1}`,
  state,
  sortOrder,
});

export const score = (home: number, away: number): Score => ({ home, away });

/** Deterministic stand-in for Math.random. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
