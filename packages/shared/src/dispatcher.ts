import type { Match, MatchId, TableId, VenueTable } from "./domain";

/**
 * The table dispatcher: E-2 ("tables are assigned automatically, based on
 * which tables are free") and the assignment half of E-3.
 *
 * Pairing new matches from a round's waiting pool (rounds.ts, pairing.ts) is a
 * separate step from handing out tables — this module only ever assigns tables
 * to matches that already have both slots filled. That split is what lets a
 * manually-paired match (A-16, no table yet) and a freshly auto-paired one
 * queue for a table through the exact same path.
 *
 * Pure on purpose. It runs inside a route handler so two staff phones can't
 * both hand Table 3 to a different match, and it runs on the client so the
 * queue can be rendered optimistically while the write is in flight.
 */

/** A match is playable when both slots are filled and it isn't settled. */
export function isPlayable(match: Match): boolean {
  if (match.state !== "scheduled" && match.state !== "queued") return false;
  return match.home.teamId !== null && match.away.teamId !== null;
}

export interface QueueEntry {
  readonly matchId: MatchId;
  /** Position within its own round — for display grouping, not ordering here. */
  readonly position: number;
}

/**
 * Matches waiting for a table, in priority order.
 *
 * The base order is simply the order `matches` was given in — Match no longer
 * carries a round *number* (only a `roundId`), so ordering across rounds is the
 * caller's job: pass matches pre-sorted by round index ascending, then
 * position, and this function will not disturb that. `pinned` jumps specific
 * matches to the front, in the order given, which is the only reordering this
 * function does itself.
 */
export function buildQueue(
  matches: readonly Match[],
  pinned: readonly MatchId[] = []
): readonly QueueEntry[] {
  const playable = matches.filter(isPlayable);
  const rank = new Map(pinned.map((id, i) => [id, i]));

  return [...playable]
    .sort((a, b) => {
      const pa = rank.get(a.id);
      const pb = rank.get(b.id);
      if (pa === undefined && pb === undefined) return 0;
      return (pa ?? Number.MAX_SAFE_INTEGER) - (pb ?? Number.MAX_SAFE_INTEGER);
    })
    .map((m) => ({ matchId: m.id, position: m.position }));
}

export interface Assignment {
  readonly matchId: MatchId;
  readonly tableId: TableId;
}

export interface DispatchPlan {
  readonly assignments: readonly Assignment[];
  /** Still waiting, in order. What the bar's big screen shows as "up next". */
  readonly waiting: readonly QueueEntry[];
  readonly openTablesRemaining: number;
}

/**
 * Hand out every free table to the front of the queue.
 *
 * Deterministic: same inputs, same plan. That's what makes it safe to call from
 * two places and compare, and what makes it testable without a database.
 */
export function planDispatch(
  matches: readonly Match[],
  tables: readonly VenueTable[],
  pinned: readonly MatchId[] = []
): DispatchPlan {
  // A table is genuinely free only if it's open *and* nothing thinks it's on it.
  const occupied = new Set(
    matches
      .filter((m) => m.tableId !== null && m.state === "on_table")
      .map((m) => m.tableId as TableId)
  );

  const free = tables
    .filter((t) => t.state === "open" && !occupied.has(t.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const queue = buildQueue(matches, pinned);
  const assignments: Assignment[] = [];

  const handOut = Math.min(free.length, queue.length);
  for (let i = 0; i < handOut; i++) {
    const table = free[i];
    const entry = queue[i];
    if (!table || !entry) break;
    assignments.push({ matchId: entry.matchId, tableId: table.id });
  }

  return {
    assignments,
    waiting: queue.slice(handOut),
    openTablesRemaining: Math.max(0, free.length - handOut),
  };
}

/** For the "3 of 4 tables in play" line on the admin dashboard. */
export function tableUtilisation(
  matches: readonly Match[],
  tables: readonly VenueTable[]
): { readonly inPlay: number; readonly open: number; readonly closed: number } {
  const busy = new Set(
    matches.filter((m) => m.state === "on_table" && m.tableId).map((m) => m.tableId as TableId)
  );
  let inPlay = 0;
  let open = 0;
  let closed = 0;
  for (const t of tables) {
    if (t.state === "closed") closed++;
    else if (busy.has(t.id)) inPlay++;
    else open++;
  }
  return { inPlay, open, closed };
}
