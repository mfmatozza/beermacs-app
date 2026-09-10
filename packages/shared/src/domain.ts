/**
 * The vocabulary. These types are the contract between the app, the database
 * and the API — nothing here knows about React, Prisma or SQL.
 */

export type TeamId = string;
export type MatchId = string;
export type PlayerId = string;
export type TableId = string;
export type TournamentId = string;
export type RoundId = string;
export type StageId = string;

// ── Teams ───────────────────────────────────────────────────────────────────

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  /**
   * The round this team's tournament participation starts at (spec E-6/E-7).
   * Every team formed before the admin opens round 1 gets `entryRound: 1` —
   * round 1 exists conceptually from the start even though no match is
   * scheduled until it opens (E-7). A team added mid-tournament gets whichever
   * round was the lowest OPEN one at the moment it joined (E-6); that number is
   * fixed at creation, not recomputed later.
   */
  readonly entryRound: number;
  /** True once the tournament (or the admin, A-8) has removed this team. */
  readonly withdrawn: boolean;
}

// ── Matches ─────────────────────────────────────────────────────────────────

/**
 * A match slot. `null` means the slot exists but nobody is in it yet — either
 * the feeding match hasn't finished, or it's waiting on a repêchage pick.
 */
export interface Slot {
  readonly teamId: TeamId | null;
  /** Re-entered via repêchage (A-9). Rendered with a 🍀 in the bracket. */
  readonly viaRepechage: boolean;
}

/**
 * Match lifecycle. Three states cover the dual-confirmation flow the spec asks
 * for (U-11..U-14): a report is "reported" until the other side agrees
 * ("confirmed") or disagrees ("disputed", which only an admin can resolve —
 * A-12). See approval.ts, which is the state machine over these.
 */
export type MatchState =
  /** Slots not both filled yet. Not playable. */
  | "scheduled"
  /** Playable and waiting for a table. In the dispatcher queue. */
  | "queued"
  /** On a physical table, clock running. */
  | "on_table"
  /** One team has reported a winner; the other hasn't answered. */
  | "reported"
  /** The other team disagreed, or nobody answered in time. Admin-only exit. */
  | "disputed"
  /** Settled. `winnerId` is final. */
  | "confirmed";

/**
 * Optional. The spec's dual-confirmation is about WHO WON (U-11), not a cup
 * count — a triangular or group format may have nothing to score. Beer pong
 * specifically can still record one.
 */
export interface Score {
  readonly home: number;
  readonly away: number;
}

export interface Match {
  readonly id: MatchId;
  readonly roundId: RoundId;
  /** Index within the round, 0-based. Drives bracket layout. */
  readonly position: number;
  readonly home: Slot;
  readonly away: Slot;
  readonly state: MatchState;
  readonly winnerId: TeamId | null;
  readonly score: Score | null;
  readonly tableId: TableId | null;
}

// ── Rounds ──────────────────────────────────────────────────────────────────

/**
 * A round's own lifecycle (A-13). `not_opened` is the state every round
 * starts in — including round 1, which the spec insists exists conceptually
 * (teams are counted as belonging to it, E-7) before anyone has opened it.
 * `open` is what lets the dispatcher schedule matches in it at all.
 *
 * There is no `closed` state: the spec never asks for a round to be shut, and
 * a round the admin considers "finished" is still a valid target for a team
 * re-admitted much later (A-8's "no fixed cut-off" reads most naturally as
 * "any open round stays open").
 */
export type RoundStatus = "not_opened" | "open";

export interface Round {
  readonly id: RoundId;
  readonly stageId: StageId;
  /** 1-based, matches Match.position's round for display. */
  readonly index: number;
  readonly status: RoundStatus;
  /**
   * A-15: pause automatic dispatch into this round without tearing anything
   * down. Matches already on a table are unaffected; the dispatcher simply
   * stops pulling new pairs into it.
   */
  readonly schedulingPaused: boolean;
}

// ── Tables ──────────────────────────────────────────────────────────────────

export type TableState =
  | "open"
  /** A match is on it. */
  | "busy"
  /** Pulled out of rotation by staff — wobbly leg, someone spilled a pint. */
  | "closed";

export interface VenueTable {
  readonly id: TableId;
  /** What the staff shouts across the room: "Table 3", "Patio", "Upstairs". */
  readonly label: string;
  readonly state: TableState;
  readonly sortOrder: number;
}

// ── Tournament ──────────────────────────────────────────────────────────────

export type TournamentStatus = "draft" | "registration" | "running" | "complete";

/**
 * A-5: the standard case is single elimination, but the admin must be free to
 * run other structures. `GROUP_THEN_KNOCKOUT` covers group stage + bracket;
 * `TRIANGULAR` is a fixed group size of 3 with everyone playing everyone —
 * both are the same underlying round machinery with a different grouping step
 * in front of it, not a separate engine.
 */
export type TournamentFormatKind = "single_elimination" | "group_then_knockout" | "triangular";

/**
 * Everything about the format a venue might change. Stored as one JSON column
 * so A-6 ("change the format while running") is a field update, not a schema
 * migration.
 */
export interface TournamentFormat {
  readonly kind: TournamentFormatKind;
  /** A-1: not fixed by the app. */
  readonly playersPerTeam: number;
  /** A-2: chat off entirely for this tournament. */
  readonly chatEnabled: boolean;
  /**
   * A-10's default when the dispatcher itself hits an odd count (E-8) and no
   * admin has intervened. An admin-triggered repêchage (A-9) always states its
   * own mode explicitly and ignores this default.
   */
  readonly autoRepechageMode: "auto" | "manual";
  /** Minutes before an unanswered result report escalates to an admin queue. */
  readonly confirmTimeoutMins: number;
  /** Cups to win, if this format scores matches at all. Null = no score. */
  readonly cupsToWin: number | null;
}

export const defaultFormat: TournamentFormat = {
  kind: "single_elimination",
  playersPerTeam: 2,
  chatEnabled: true,
  autoRepechageMode: "auto",
  confirmTimeoutMins: 15,
  cupsToWin: 10,
};

export interface Tournament {
  readonly id: TournamentId;
  readonly name: string;
  readonly status: TournamentStatus;
  /** Six characters, unambiguous alphabet. What's printed on the table tent. */
  readonly joinCode: string;
  readonly championId: TeamId | null;
  readonly format: TournamentFormat;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Both slots of a match, in render order. */
export const slotsOf = (m: Match): readonly [Slot, Slot] => [m.home, m.away];

export const teamIdsOf = (m: Match): readonly TeamId[] =>
  [m.home.teamId, m.away.teamId].filter((id): id is TeamId => id !== null);

export const isSettled = (m: Match): boolean => m.state === "confirmed";

export const isLive = (m: Match): boolean =>
  m.state === "on_table" || m.state === "reported" || m.state === "disputed";

/** Which side is this team on? `null` if it isn't in this match at all. */
export function sideOf(m: Match, teamId: TeamId): "home" | "away" | null {
  if (m.home.teamId === teamId) return "home";
  if (m.away.teamId === teamId) return "away";
  return null;
}

export function opponentOf(m: Match, teamId: TeamId): TeamId | null {
  const side = sideOf(m, teamId);
  if (side === null) return null;
  return side === "home" ? m.away.teamId : m.home.teamId;
}

export function loserOf(m: Match): TeamId | null {
  if (m.winnerId === null) return null;
  const ids = teamIdsOf(m);
  return ids.find((id) => id !== m.winnerId) ?? null;
}
