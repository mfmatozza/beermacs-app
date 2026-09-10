import type { Match, TeamId } from "./domain";
import { loserOf } from "./domain";

/**
 * The pool a repêchage draws from: teams eliminated and not since readmitted.
 *
 * Derived from match history rather than stored, for the same reason as the
 * old app's lucky-loser bug: a stored pool that isn't kept in lockstep with
 * every match confirmation and every readmission WILL drift. A team is
 * "eliminated" here if the most recent match it appears in anywhere is
 * confirmed and it did not win it; a team readmitted (its most recent
 * appearance has `viaRepechage` on its own slot) is not eliminated — it's
 * simply waiting again.
 */
export interface EliminatedTeam {
  readonly teamId: TeamId;
  /** Higher = eliminated more recently. Not a round number across rounds. */
  readonly eliminatedOrder: number;
}

export function loserPool(matches: readonly Match[]): readonly EliminatedTeam[] {
  const latest = new Map<TeamId, { match: Match; order: number }>();
  matches.forEach((m, order) => {
    for (const slot of [m.home, m.away]) {
      if (!slot.teamId) continue;
      const seen = latest.get(slot.teamId);
      if (!seen || order > seen.order) latest.set(slot.teamId, { match: m, order });
    }
  });

  const pool: EliminatedTeam[] = [];
  for (const [teamId, { match: m, order }] of latest) {
    if (m.state !== "confirmed") continue;
    if (loserOf(m) !== teamId) continue;
    pool.push({ teamId, eliminatedOrder: order });
  }
  return pool.sort((a, b) => b.eliminatedOrder - a.eliminatedOrder);
}

/**
 * E-8: automatic trigger. Only fires when a round's waiting count is odd AND
 * the format's default mode is "auto" (TournamentFormat.autoRepechageMode) —
 * the caller checks both before calling this. Picks the most recently
 * eliminated team, which is the closest thing to "fair" without asking anyone.
 */
export function pickAutoRepechage(pool: readonly EliminatedTeam[]): TeamId | null {
  return pool[0]?.teamId ?? null;
}

/**
 * A-9/A-10: an admin-triggered repêchage, independent of parity. Works at any
 * time, including when the round is already even — the admin might simply want
 * to bring a popular team back. `teamId` is required: this function does not
 * choose for the admin (they either pass their manual pick, or the caller
 * passed `pickAutoRepechage(pool)`'s result through when the admin asked for
 * "pick one at random" instead of naming a team).
 */
export function isEligibleForRepechage(pool: readonly EliminatedTeam[], teamId: TeamId): boolean {
  return pool.some((t) => t.teamId === teamId);
}
