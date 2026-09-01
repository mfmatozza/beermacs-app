import type { Match, MatchId, Score, Slot, Team, TeamId, VenueTable } from "./domain";

/** Fixture builders, so tests read as scenarios rather than object literals. */

export const team = (id: string, seed: number, name = id.toUpperCase()): Team => ({
  id,
  name,
  seed,
});

export const teams = (...names: string[]): Team[] => names.map((n, i) => team(n, i));

const slot = (teamId: TeamId | null, viaLuckyLoser = false): Slot => ({ teamId, viaLuckyLoser });

export function match(over: Partial<Match> & { id: MatchId }): Match {
  return {
    round: 1,
    position: 0,
    home: slot(null),
    away: slot(null),
    state: "scheduled",
    winnerId: null,
    score: null,
    tableId: null,
    isBye: false,
    ...over,
  };
}

/** A match between two teams, optionally already settled. */
export function played(
  id: MatchId,
  round: number,
  position: number,
  home: TeamId,
  away: TeamId,
  winner?: TeamId
): Match {
  return match({
    id,
    round,
    position,
    home: slot(home),
    away: slot(away),
    ...(winner
      ? { state: "confirmed" as const, winnerId: winner, score: { home: 10, away: 7 } }
      : {}),
  });
}

export const bye = (id: MatchId, round: number, position: number, teamId: TeamId): Match =>
  match({
    id,
    round,
    position,
    home: slot(teamId),
    state: "confirmed",
    winnerId: teamId,
    isBye: true,
  });

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
