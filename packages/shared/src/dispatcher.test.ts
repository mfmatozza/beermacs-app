import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQueue, isPlayable, planDispatch, tableUtilisation } from "./dispatcher";
import { match, played, venueTable } from "./testing";

const ready = (id: string, roundId: string, position: number) =>
  match({
    id,
    roundId,
    position,
    home: { teamId: `${id}-h`, viaRepechage: false },
    away: { teamId: `${id}-a`, viaRepechage: false },
    state: "scheduled",
  });

describe("isPlayable", () => {
  it("needs both slots filled", () => {
    assert.strictEqual(isPlayable(ready("m1", "r1", 0)), true);
    assert.strictEqual(
      isPlayable(match({ id: "m2", home: { teamId: "x", viaRepechage: false } })),
      false
    );
  });

  it("excludes live matches and settled matches", () => {
    assert.strictEqual(isPlayable({ ...ready("m1", "r1", 0), state: "on_table" }), false);
    assert.strictEqual(isPlayable(played("m1", "r1", 0, "a", "b", "a")), false);
  });
});

describe("buildQueue", () => {
  it("preserves input order (the caller is responsible for round/position sort)", () => {
    const q = buildQueue([ready("c", "r2", 0), ready("a", "r1", 1), ready("b", "r1", 0)]);
    assert.deepStrictEqual(
      q.map((e) => e.matchId),
      ["c", "a", "b"]
    );
  });

  it("jumps pinned matches to the front, in the order staff pinned them", () => {
    const q = buildQueue(
      [ready("a", "r1", 0), ready("b", "r1", 1), ready("c", "r1", 2)],
      ["c", "b"]
    );
    assert.deepStrictEqual(
      q.map((e) => e.matchId),
      ["c", "b", "a"]
    );
  });
});

describe("planDispatch", () => {
  const tables = [venueTable("t1", 0), venueTable("t2", 1), venueTable("t3", 2)];

  it("hands every free table to the front of the queue", () => {
    const plan = planDispatch([ready("a", "r1", 0), ready("b", "r1", 1)], tables);
    assert.deepStrictEqual(plan.assignments, [
      { matchId: "a", tableId: "t1" },
      { matchId: "b", tableId: "t2" },
    ]);
    assert.strictEqual(plan.waiting.length, 0);
    assert.strictEqual(plan.openTablesRemaining, 1);
  });

  it("leaves the overflow waiting in order", () => {
    const plan = planDispatch(
      [ready("a", "r1", 0), ready("b", "r1", 1), ready("c", "r1", 2), ready("d", "r1", 3)],
      [venueTable("t1", 0)]
    );
    assert.deepStrictEqual(plan.assignments, [{ matchId: "a", tableId: "t1" }]);
    assert.deepStrictEqual(
      plan.waiting.map((e) => e.matchId),
      ["b", "c", "d"]
    );
  });

  it("never double-books a table that already has a match on it", () => {
    const live = { ...ready("live", "r1", 0), state: "on_table" as const, tableId: "t1" };
    const plan = planDispatch([live, ready("next", "r1", 1)], tables);
    assert.deepStrictEqual(plan.assignments, [{ matchId: "next", tableId: "t2" }]);
  });

  it("skips a table staff pulled out of rotation", () => {
    const plan = planDispatch(
      [ready("a", "r1", 0)],
      [venueTable("t1", 0, "closed"), venueTable("t2", 1)]
    );
    assert.deepStrictEqual(plan.assignments, [{ matchId: "a", tableId: "t2" }]);
  });

  it("is a pure function of its input order — two staff phones querying the same DB in the same round/position order compute the same plan", () => {
    // buildQueue no longer sorts by round internally (Match carries `roundId`,
    // not a round number) — the caller must supply matches already in priority
    // order. Same input, called twice, must still agree exactly.
    const matches = [ready("a", "r1", 0), ready("b", "r1", 1), ready("c", "r2", 0)];
    assert.deepStrictEqual(planDispatch(matches, tables), planDispatch(matches, tables));
  });

  it("changes plan when the caller's supplied order changes — ordering is the caller's contract, not buildQueue's", () => {
    const forward = [ready("a", "r1", 0), ready("b", "r1", 1)];
    const reversed = [...forward].reverse();
    const single = [venueTable("t1", 0)];
    assert.deepStrictEqual(planDispatch(forward, single).assignments, [
      { matchId: "a", tableId: "t1" },
    ]);
    assert.deepStrictEqual(planDispatch(reversed, single).assignments, [
      { matchId: "b", tableId: "t1" },
    ]);
  });
});

describe("tableUtilisation", () => {
  it("counts what the dashboard shows", () => {
    const live = { ...ready("live", "r1", 0), state: "on_table" as const, tableId: "t1" };
    assert.deepStrictEqual(
      tableUtilisation(
        [live],
        [venueTable("t1", 0), venueTable("t2", 1), venueTable("t3", 2, "closed")]
      ),
      { inPlay: 1, open: 1, closed: 1 }
    );
  });
});
