import type { Match, MatchId, TableId, VenueTable } from "./domain";

/**
 * The table dispatcher.
 *
 * "Table numbers" is the feature that sounds like a column and is actually a
 * scheduler: a bar has three tables and a bracket has sixteen matches, and the
 * thing a manager is buying is that nobody has to shout across the room.
 *
 * Pure on purpose. It runs inside an edge function so two staff phones can't
 * both hand Table 3 to a different match, and it runs on the client so the
 * queue can be rendered optimistically while the write is in flight.
 */

/** A match is playable when both slots are filled and it isn't settled. */
export function isPlayable(match: Match): boolean {
  if (match.isBye) return false;
  if (match.state !== "scheduled" && match.state !== "queued") return false;
  return match.home.teamId !== null && match.away.teamId !== null;
}

export interface QueueEntry {
  readonly matchId: MatchId;
  readonly round: number;
  readonly position: number;
}

/**
 * Matches waiting for a table, in the order they should get one: earlier rounds
 * first, then bracket position. Staff reordering is applied by `pinned`, which
 * jumps matches to the front in the order given.
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
      if (pa !== undefined || pb !== undefined) {
        return (pa ?? Number.MAX_SAFE_INTEGER) - (pb ?? Number.MAX_SAFE_INTEGER);
      }
      return a.round - b.round || a.position - b.position;
    })
    .map((m) => ({ matchId: m.id, round: m.round, position: m.position }));
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
