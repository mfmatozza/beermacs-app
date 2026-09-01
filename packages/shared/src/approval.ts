import type { Match, MatchState, Score, TableId, TeamId } from "./domain";
import { sideOf } from "./domain";
import { type Result, err, ok } from "./result";

/**
 * Result approval as an explicit state machine.
 *
 * The whole point is that this function is the *only* way a match acquires a
 * winner, and that it can run unchanged inside a Postgres edge function. If the
 * "both teams approve" rule lived in the React screens, a losing captain would
 * simply call the API directly and confirm their own defeat as a victory —
 * which is exactly what the old app allowed, since every RLS policy was
 * `USING (true)` and the winner was set by a client-side UPDATE.
 *
 * Staff can force any transition. Every forced move returns `forced: true` so
 * the caller is obliged to write an audit row.
 */

/** Who is asking. Staff outrank the rules; captains are bound by them. */
export type Actor =
  | { readonly kind: "staff"; readonly userId: string }
  | { readonly kind: "captain"; readonly userId: string; readonly teamId: TeamId };

export type ApprovalEvent =
  /** Dispatcher put the match on a table. */
  | { readonly type: "assign_table"; readonly tableId: TableId }
  /** First cup thrown. */
  | { readonly type: "start" }
  /** A captain claims a result. */
  | { readonly type: "report"; readonly winnerId: TeamId; readonly score: Score }
  /** The other captain agrees. */
  | { readonly type: "confirm" }
  /** The other captain disagrees. */
  | { readonly type: "reject"; readonly reason?: string }
  /** Nobody answered within the format's timeout. Raised by a scheduled job. */
  | { readonly type: "timeout" }
  /** Staff settles it, from any state. */
  | {
      readonly type: "staff_resolve";
      readonly winnerId: TeamId;
      readonly score: Score;
      readonly reason: string;
    };

export type ApprovalError =
  | {
      readonly kind: "wrong_state";
      readonly state: MatchState;
      readonly event: ApprovalEvent["type"];
    }
  | { readonly kind: "not_in_match"; readonly teamId: TeamId }
  | { readonly kind: "winner_not_in_match"; readonly teamId: TeamId }
  /** A captain tried to confirm their own report. This is the important one. */
  | { readonly kind: "self_confirmation" }
  | { readonly kind: "staff_only"; readonly event: ApprovalEvent["type"] }
  | { readonly kind: "incomplete_slots" }
  | { readonly kind: "implausible_score"; readonly score: Score };

/**
 * The outcome of a transition: the new match, plus what the caller still has to
 * do. `notify` and `forced` exist so the transition itself stays pure — it
 * decides *that* a push should go out, never sends one.
 */
export interface Transition {
  readonly match: Match;
  readonly forced: boolean;
  readonly notify: readonly NotifyIntent[];
  /** Set when the match is settled and the table can be handed to the queue. */
  readonly releasesTable: TableId | null;
}

export type NotifyIntent =
  | { readonly kind: "youre_up"; readonly teams: readonly TeamId[]; readonly tableId: TableId }
  | { readonly kind: "confirm_result"; readonly team: TeamId }
  | { readonly kind: "result_settled"; readonly teams: readonly TeamId[] }
  | { readonly kind: "staff_needed" };

/** Who reported the pending result. Kept alongside the match, not inside it. */
export interface PendingReport {
  readonly reportedByTeamId: TeamId;
  readonly winnerId: TeamId;
  readonly score: Score;
  readonly at: string;
}

export interface ApprovalContext {
  readonly actor: Actor;
  /** Present whenever `match.state === 'reported' | 'disputed'`. */
  readonly pending: PendingReport | null;
  readonly cupsToWin: number;
  /** Injected so the machine stays deterministic under test. */
  readonly now: string;
}

export function transition(
  match: Match,
  event: ApprovalEvent,
  ctx: ApprovalContext
): Result<Transition, ApprovalError> {
  const isStaff = ctx.actor.kind === "staff";

  // Staff override short-circuits the graph — deliberately, because the git
  // history of the old app is eight commits of hand-written SQL fixing live
  // brackets. Staff need a door out of every state.
  if (event.type === "staff_resolve") {
    if (!isStaff) return err({ kind: "staff_only", event: event.type });
    if (sideOf(match, event.winnerId) === null) {
      return err({ kind: "winner_not_in_match", teamId: event.winnerId });
    }
    return ok(settle(match, event.winnerId, event.score, true));
  }

  switch (event.type) {
    case "assign_table": {
      if (!isStaff) return err({ kind: "staff_only", event: event.type });
      if (match.state !== "scheduled" && match.state !== "queued") {
        return err({ kind: "wrong_state", state: match.state, event: event.type });
      }
      if (!match.home.teamId || !match.away.teamId) {
        return err({ kind: "incomplete_slots" });
      }
      return ok({
        match: { ...match, state: "on_table", tableId: event.tableId },
        forced: false,
        notify: [
          {
            kind: "youre_up",
            teams: [match.home.teamId, match.away.teamId],
            tableId: event.tableId,
          },
        ],
        releasesTable: null,
      });
    }

    case "start": {
      if (match.state !== "on_table") {
        return err({ kind: "wrong_state", state: match.state, event: event.type });
      }
      return plain({ ...match });
    }

    case "report": {
      if (match.state !== "on_table") {
        return err({ kind: "wrong_state", state: match.state, event: event.type });
      }
      if (sideOf(match, event.winnerId) === null) {
        return err({ kind: "winner_not_in_match", teamId: event.winnerId });
      }
      if (!plausible(event.score, ctx.cupsToWin)) {
        return err({ kind: "implausible_score", score: event.score });
      }
      if (ctx.actor.kind === "captain" && sideOf(match, ctx.actor.teamId) === null) {
        return err({ kind: "not_in_match", teamId: ctx.actor.teamId });
      }

      // Staff reporting a score settles it outright — there is nobody to argue
      // with when the person behind the bar is standing at the table.
      if (isStaff) return ok(settle(match, event.winnerId, event.score, true));

      const other = otherTeam(match, (ctx.actor as { teamId: TeamId }).teamId);
      return ok({
        match: { ...match, state: "reported" },
        forced: false,
        notify: other ? [{ kind: "confirm_result", team: other }] : [],
        releasesTable: null,
      });
    }

    case "confirm": {
      if (match.state !== "reported") {
        return err({ kind: "wrong_state", state: match.state, event: event.type });
      }
      if (!ctx.pending) return err({ kind: "wrong_state", state: match.state, event: event.type });

      if (ctx.actor.kind === "captain") {
        const side = sideOf(match, ctx.actor.teamId);
        if (side === null) return err({ kind: "not_in_match", teamId: ctx.actor.teamId });
        // The rule the old app could not enforce.
        if (ctx.actor.teamId === ctx.pending.reportedByTeamId) {
          return err({ kind: "self_confirmation" });
        }
      }

      return ok(settle(match, ctx.pending.winnerId, ctx.pending.score, isStaff));
    }

    case "reject": {
      if (match.state !== "reported") {
        return err({ kind: "wrong_state", state: match.state, event: event.type });
      }
      if (!ctx.pending) return err({ kind: "wrong_state", state: match.state, event: event.type });
      if (ctx.actor.kind === "captain") {
        if (sideOf(match, ctx.actor.teamId) === null) {
          return err({ kind: "not_in_match", teamId: ctx.actor.teamId });
        }
        if (ctx.actor.teamId === ctx.pending.reportedByTeamId) {
          return err({ kind: "self_confirmation" });
        }
      }
      return ok({
        match: { ...match, state: "disputed" },
        forced: false,
        notify: [{ kind: "staff_needed" }],
        releasesTable: null,
      });
    }

    case "timeout": {
      // Silence is not agreement. An unanswered report goes to a human rather
      // than auto-confirming, because auto-confirm is a way to lose a match by
      // leaving your phone in your jacket.
      if (match.state !== "reported") {
        return err({ kind: "wrong_state", state: match.state, event: event.type });
      }
      return ok({
        match: { ...match, state: "disputed" },
        forced: false,
        notify: [{ kind: "staff_needed" }],
        releasesTable: null,
      });
    }
  }
}

// ── internals ───────────────────────────────────────────────────────────────

function settle(match: Match, winnerId: TeamId, score: Score, forced: boolean): Transition {
  const teams = [match.home.teamId, match.away.teamId].filter((t): t is TeamId => t !== null);
  return {
    match: { ...match, state: "confirmed", winnerId, score, tableId: null },
    forced,
    notify: [{ kind: "result_settled", teams }],
    releasesTable: match.tableId,
  };
}

const plain = (match: Match): Result<Transition, ApprovalError> =>
  ok({ match, forced: false, notify: [], releasesTable: null });

function otherTeam(match: Match, teamId: TeamId): TeamId | null {
  if (match.home.teamId === teamId) return match.away.teamId;
  if (match.away.teamId === teamId) return match.home.teamId;
  return null;
}

/**
 * Beer pong scores are bounded: the winner reaches `cupsToWin` exactly and the
 * loser is strictly behind. Catches fat-fingered entry, not cheating — cheating
 * is what the other captain's confirmation is for.
 */
function plausible(score: Score, cupsToWin: number): boolean {
  const { home, away } = score;
  if (home < 0 || away < 0) return false;
  if (home === away) return false;
  const top = Math.max(home, away);
  const bottom = Math.min(home, away);
  return top === cupsToWin && bottom < cupsToWin;
}
