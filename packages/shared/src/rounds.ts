import type { Match, Round, RoundId, TeamId } from "./domain";

/**
 * Round membership and scheduling state.
 *
 * A round's matches are never generated all at once. Instead, a `RoundEntrant`
 * row is created explicitly — by the API layer, as an auditable step — every
 * time a team becomes eligible to play in a round: at tournament setup (every
 * team starts as an entrant of round 1, E-7), when a match confirms and its
 * winner advances (an explicit "advance winner" step, not an implicit
 * recomputation), or when a repêchage draw readmits someone (A-9).
 *
 * The engine then only has to ask "who is an entrant of this round and hasn't
 * been paired into a match here yet" — that is `waitingTeams` below, and it is
 * the whole of E-3 ("teams that have not played yet in the open round(s)").
 */
export interface RoundEntrant {
  readonly teamId: TeamId;
  readonly roundId: RoundId;
  /** True if this entry came from a repêchage draw rather than natural entry. */
  readonly viaRepechage: boolean;
}

/**
 * E-6/E-7: which round a NEW team should enter at.
 *
 * If any round is open, it's the lowest-indexed one of those (E-6: round 1 and
 * round 2 both open → new team enters round 1). If none is open, the only way
 * that happens is before the admin has opened round 1 at all (E-7) — round 1
 * still exists conceptually, so the answer is 1 either way. Rounds never close
 * once opened (see Round's doc comment), so "no round open" cannot occur once
 * the tournament has actually started.
 */
export function entryRoundForNewTeam(rounds: readonly Round[]): number {
  const open = rounds.filter((r) => r.status === "open");
  if (open.length === 0) return 1;
  return Math.min(...open.map((r) => r.index));
}

/** A-13: open a round. Idempotent — opening an already-open round is a no-op. */
export function openRound(round: Round): Round {
  return round.status === "open" ? round : { ...round, status: "open" };
}

/** A-15: pause or resume automatic dispatch into this one round. */
export function setSchedulingPaused(round: Round, paused: boolean): Round {
  return round.schedulingPaused === paused ? round : { ...round, schedulingPaused: paused };
}

/**
 * Entrants of `round` who are not currently placed in any match of that round —
 * regardless of that match's state. Once paired, a team is not "waiting" even
 * before the match is decided; if it loses, it does not return to this pool
 * (repêchage is a distinct, explicit readmission — see repechage.ts). If it
 * wins, the caller advances it into the NEXT round's entrants explicitly.
 */
export function waitingTeams(
  round: Round,
  entrants: readonly RoundEntrant[],
  matches: readonly Match[]
): readonly TeamId[] {
  const paired = new Set<TeamId>();
  for (const m of matches) {
    if (m.roundId !== round.id) continue;
    if (m.home.teamId) paired.add(m.home.teamId);
    if (m.away.teamId) paired.add(m.away.teamId);
  }
  return entrants
    .filter((e) => e.roundId === round.id && !paired.has(e.teamId))
    .map((e) => e.teamId);
}
