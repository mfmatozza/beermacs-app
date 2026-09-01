/**
 * The vocabulary. These types are the contract between the app, the database
 * and the API — nothing here knows about React, Prisma or SQL.
 */

export type TeamId = string;
export type MatchId = string;
export type PlayerId = string;
export type TableId = string;
export type TournamentId = string;

// ── Teams ───────────────────────────────────────────────────────────────────

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  /**
   * Registration order, not competitive seeding. The house format pairs teams
   * in the order they signed up; staff can drag to reorder before generating.
   */
  readonly seed: number;
}

// ── Matches ─────────────────────────────────────────────────────────────────

/**
 * A match slot. `null` means the slot exists but nobody is in it yet — either
 * the feeding match hasn't finished, or it's waiting on a lucky-loser pick.
 */
export interface Slot {
  readonly teamId: TeamId | null;
  /** Re-entered from the lucky-loser pool. Rendered with a 🍀 in the bracket. */
  readonly viaLuckyLoser: boolean;
}

/**
 * Match lifecycle. The old web app had three states ('pending' | 'active' |
 * 'complete') and set the winner with a client-side UPDATE, which meant any
 * team could declare itself the winner. These six exist so that "both teams
 * approved" is a state the server can check rather than a promise the UI makes.
 */
export type MatchState =
  /** Slots not both filled, or feeders unfinished. Not playable. */
  | "scheduled"
  /** Playable and waiting for a table. In the dispatcher queue. */
  | "queued"
  /** On a physical table, clock running. */
  | "on_table"
  /** One captain has reported a score; the other side hasn't answered. */
  | "reported"
  /** The other side rejected the report, or nobody answered in time. */
  | "disputed"
  /** Settled. `winnerId` and `score` are final. */
  | "confirmed";

export interface Score {
  readonly home: number;
  readonly away: number;
}

export interface Match {
  readonly id: MatchId;
  readonly round: number;
  /** Index within the round, 0-based. Drives bracket layout. */
  readonly position: number;
  readonly home: Slot;
  readonly away: Slot;
  readonly state: MatchState;
  readonly winnerId: TeamId | null;
  readonly score: Score | null;
  readonly tableId: TableId | null;
  /**
   * A bye: one team, no opponent, auto-advanced. Kept as a real match so the
   * bracket renders a complete round and `planNextRound` needs no special case.
   */
  readonly isBye: boolean;
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
 * Everything about the format that a venue might want to change. Stored as one
 * JSON column so adding double-elimination later is a feature flag rather than
 * a migration.
 */
export interface TournamentFormat {
  /** false pairs round one in registration order — the house format. */
  readonly shuffleRoundOne: boolean;
  /** Losers can be drawn back in to fill an odd slot. */
  readonly luckyLosers: boolean;
  /** Cups to win a match. 10 is the house rule; best-of comes later. */
  readonly cupsToWin: number;
  /** Minutes before an unanswered result report escalates to staff. */
  readonly confirmTimeoutMins: number;
}

export const defaultFormat: TournamentFormat = {
  shuffleRoundOne: false,
  luckyLosers: true,
  cupsToWin: 10,
  confirmTimeoutMins: 15,
};

export interface Tournament {
  readonly id: TournamentId;
  readonly name: string;
  readonly status: TournamentStatus;
  /** Six characters, unambiguous alphabet. What's printed on the table tent. */
  readonly joinCode: string;
  readonly currentRound: number;
  readonly championId: TeamId | null;
  readonly format: TournamentFormat;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Both slots of a match, in render order. */
export const slotsOf = (m: Match): readonly [Slot, Slot] => [m.home, m.away];

export const teamIdsOf = (m: Match): readonly TeamId[] =>
  [m.home.teamId, m.away.teamId].filter((id): id is TeamId => id !== null);

export const isSettled = (m: Match): boolean => m.state === "confirmed";

/** Which side is this team on? `null` if it isn't in this match at all. */
export function sideOf(m: Match, teamId: TeamId): "home" | "away" | null {
  if (m.home.teamId === teamId) return "home";
  if (m.away.teamId === teamId) return "away";
  return null;
}

export function loserOf(m: Match): TeamId | null {
  if (m.winnerId === null || m.isBye) return null;
  const ids = teamIdsOf(m);
  return ids.find((id) => id !== m.winnerId) ?? null;
}
