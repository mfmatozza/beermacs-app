import type { Match, MatchId, Team, TeamId } from "./domain";
import { type Result, err, ok } from "./result";

/**
 * The house bracket format, lifted verbatim out of the old `useTournament.ts`
 * and made pure so it can be unit-tested and re-run server-side.
 *
 * The rules, which are deliberately not standard single-elimination:
 *
 *  1. Round one pairs teams in *registration* order. No shuffle, no seeding —
 *     you play whoever signed up next to you.
 *  2. An odd team count gives the last team a bye, stored as a real completed
 *     match with no opponent.
 *  3. Rounds are generated one at a time, not up front. That's what lets staff
 *     add a team while round one is still being played.
 *  4. Losers drop into a pool. When a round produces an odd number of winners,
 *     the spare winner's match opens an empty slot and staff draw a "lucky
 *     loser" back in to fill it.
 */

/** A match to be created. No id yet — the database assigns those. */
export interface PlannedMatch {
  readonly round: number;
  readonly position: number;
  readonly homeTeamId: TeamId | null;
  readonly awayTeamId: TeamId | null;
  readonly isBye: boolean;
  /** True when this match is waiting on a staff lucky-loser pick. */
  readonly awaitsLuckyLoser: boolean;
}

export type BracketError =
  | { readonly kind: "not_enough_teams"; readonly count: number }
  | { readonly kind: "round_incomplete"; readonly unfinished: readonly MatchId[] }
  | { readonly kind: "no_winners" };

/**
 * Shape of the bracket before a ball is thrown, so the setup screen can say
 * "9 teams → 4 matches, 1 bye, about 4 rounds" before anyone commits.
 */
export interface BracketShape {
  readonly teamCount: number;
  readonly firstRoundMatches: number;
  readonly byes: number;
  readonly estimatedRounds: number;
}

export function describeBracket(teamCount: number): BracketShape {
  if (teamCount < 2) {
    return { teamCount, firstRoundMatches: 0, byes: 0, estimatedRounds: 0 };
  }
  return {
    teamCount,
    firstRoundMatches: Math.floor(teamCount / 2),
    byes: teamCount % 2,
    estimatedRounds: Math.ceil(Math.log2(teamCount)),
  };
}

/**
 * Round one. Teams are consumed in `seed` order — which is registration order,
 * because that is the point of this format.
 */
export function planRoundOne(teams: readonly Team[]): Result<PlannedMatch[], BracketError> {
  if (teams.length < 2) return err({ kind: "not_enough_teams", count: teams.length });

  const ordered = [...teams].sort((a, b) => a.seed - b.seed);
  const pairs = Math.floor(ordered.length / 2);
  const planned: PlannedMatch[] = [];

  for (let i = 0; i < pairs; i++) {
    const home = ordered[i * 2];
    const away = ordered[i * 2 + 1];
    // `noUncheckedIndexedAccess` forces this guard. The old code indexed
    // straight into the array and would have written `undefined.id`.
    if (!home || !away) break;
    planned.push({
      round: 1,
      position: i,
      homeTeamId: home.id,
      awayTeamId: away.id,
      isBye: false,
      awaitsLuckyLoser: false,
    });
  }

  // Odd count: the last team walks into round two.
  if (ordered.length % 2 === 1) {
    const byeTeam = ordered[ordered.length - 1];
    if (byeTeam) {
      planned.push({
        round: 1,
        position: pairs,
        homeTeamId: byeTeam.id,
        awayTeamId: null,
        isBye: true,
        awaitsLuckyLoser: false,
      });
    }
  }

  return ok(planned);
}

/** What advancing produced: more matches, or a champion. */
export type Advance =
  | {
      readonly kind: "next_round";
      readonly round: number;
      readonly matches: readonly PlannedMatch[];
    }
  | { readonly kind: "champion"; readonly teamId: TeamId };

/**
 * Advance from `round` to `round + 1`. Refuses to run while any match in the
 * round is unsettled, which is the check the old app left to the admin's eyes.
 */
export function planNextRound(
  matches: readonly Match[],
  round: number
): Result<Advance, BracketError> {
  const current = matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);

  const unfinished = current.filter((m) => m.state !== "confirmed" && !m.isBye).map((m) => m.id);
  if (unfinished.length > 0) return err({ kind: "round_incomplete", unfinished });

  const winners = current.map((m) => m.winnerId).filter((id): id is TeamId => id !== null);

  if (winners.length === 0) return err({ kind: "no_winners" });

  const champion = winners[0];
  if (winners.length === 1 && champion) {
    return ok({ kind: "champion", teamId: champion });
  }

  const nextRound = round + 1;
  const pairs = Math.floor(winners.length / 2);
  const planned: PlannedMatch[] = [];

  for (let i = 0; i < pairs; i++) {
    const home = winners[i * 2];
    const away = winners[i * 2 + 1];
    if (!home || !away) break;
    planned.push({
      round: nextRound,
      position: i,
      homeTeamId: home,
      awayTeamId: away,
      isBye: false,
      awaitsLuckyLoser: false,
    });
  }

  // Odd number of winners: the spare gets an empty slot for a lucky loser.
  // Note this is NOT a bye — the slot is meant to be filled by staff.
  if (winners.length % 2 === 1) {
    const spare = winners[winners.length - 1];
    if (spare) {
      planned.push({
        round: nextRound,
        position: pairs,
        homeTeamId: spare,
        awayTeamId: null,
        isBye: false,
        awaitsLuckyLoser: true,
      });
    }
  }

  return ok({ kind: "next_round", round: nextRound, matches: planned });
}

/**
 * Teams eliminated and not since re-entered, most recently out first — the pool
 * staff draw a lucky loser from.
 *
 * A team is out if the *latest* match it appears in is settled and it lost it.
 * Looking only at whether a team ever won a match is not enough: everyone who
 * reaches round two won round one, and half of them are out by round three.
 *
 * Derived from the matches rather than stored. The old schema kept a
 * `lucky_loser_pool` table and deleted rows by `team_id` with no tournament
 * filter — a live cross-tournament data bug waiting for the second venue.
 * A derived pool cannot drift out of sync with the bracket.
 */
export function luckyLoserPool(
  matches: readonly Match[]
): readonly { teamId: TeamId; eliminatedInRound: number }[] {
  // Latest appearance per team. Insertion order is match order, which keeps the
  // sort below stable for teams knocked out in the same round.
  const latest = new Map<TeamId, Match>();
  for (const m of matches) {
    for (const id of [m.home.teamId, m.away.teamId]) {
      if (!id) continue;
      const seen = latest.get(id);
      if (!seen || m.round > seen.round) latest.set(id, m);
    }
  }

  const pool: { teamId: TeamId; eliminatedInRound: number }[] = [];
  for (const [teamId, m] of latest) {
    if (m.state !== "confirmed") continue; // still playing, or waiting on a table
    if (m.winnerId === teamId) continue; // won it, waiting for the next round
    pool.push({ teamId, eliminatedInRound: m.round });
  }

  return pool.sort((a, b) => b.eliminatedInRound - a.eliminatedInRound);
}

/**
 * Human name for a round, worked out from how many matches it holds rather than
 * its number — with byes and lucky losers, round 3 of 4 is not always the semi.
 */
export function roundLabel(matchesInRound: number, round: number): string {
  if (matchesInRound === 1) return "Final";
  if (matchesInRound === 2) return "Semifinals";
  if (matchesInRound <= 4) return "Quarterfinals";
  return `Round ${round}`;
}
