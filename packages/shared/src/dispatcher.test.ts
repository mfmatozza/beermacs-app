import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQueue, isPlayable, planDispatch, tableUtilisation } from "./dispatcher";
import { bye, match, played, venueTable } from "./testing";

const ready = (id: string, round: number, position: number) =>
  match({
    id,
    round,
    position,
    home: { teamId: `${id}-h`, viaLuckyLoser: false },
    away: { teamId: `${id}-a`, viaLuckyLoser: false },
    state: "scheduled",
  });

describe("isPlayable", () => {
  it("needs both slots filled", () => {
    assert.strictEqual(isPlayable(ready("m1", 1, 0)), true);
    assert.strictEqual(
      isPlayable(match({ id: "m2", home: { teamId: "x", viaLuckyLoser: false } })),
      false
    );
  });

  it("excludes byes, live matches and settled matches", () => {
    assert.strictEqual(isPlayable(bye("b1", 1, 0, "x")), false);
    assert.strictEqual(isPlayable({ ...ready("m1", 1, 0), state: "on_table" }), false);
    assert.strictEqual(isPlayable(played("m1", 1, 0, "a", "b", "a")), false);
  });
});

describe("buildQueue", () => {
  it("orders by round then bracket position", () => {
    const q = buildQueue([ready("c", 2, 0), ready("a", 1, 1), ready("b", 1, 0)]);
    assert.deepStrictEqual(
      q.map((e) => e.matchId),
      ["b", "a", "c"]
    );
  });

  it("jumps pinned matches to the front, in the order staff pinned them", () => {
    const q = buildQueue([ready("a", 1, 0), ready("b", 1, 1), ready("c", 1, 2)], ["c", "b"]);
    assert.deepStrictEqual(
      q.map((e) => e.matchId),
      ["c", "b", "a"]
    );
  });
});

describe("planDispatch", () => {
  const tables = [venueTable("t1", 0), venueTable("t2", 1), venueTable("t3", 2)];

  it("hands every free table to the front of the queue", () => {
    const plan = planDispatch([ready("a", 1, 0), ready("b", 1, 1)], tables);
    assert.deepStrictEqual(plan.assignments, [
      { matchId: "a", tableId: "t1" },
      { matchId: "b", tableId: "t2" },
    ]);
    assert.strictEqual(plan.waiting.length, 0);
    assert.strictEqual(plan.openTablesRemaining, 1);
  });

  it("leaves the overflow waiting in order", () => {
    const plan = planDispatch(
      [ready("a", 1, 0), ready("b", 1, 1), ready("c", 1, 2), ready("d", 1, 3)],
      [venueTable("t1", 0)]
    );
    assert.deepStrictEqual(plan.assignments, [{ matchId: "a", tableId: "t1" }]);
    assert.deepStrictEqual(
      plan.waiting.map((e) => e.matchId),
      ["b", "c", "d"]
    );
  });

  it("never double-books a table that already has a match on it", () => {
    const live = { ...ready("live", 1, 0), state: "on_table" as const, tableId: "t1" };
    const plan = planDispatch([live, ready("next", 1, 1)], tables);
    assert.deepStrictEqual(plan.assignments, [{ matchId: "next", tableId: "t2" }]);
  });

  it("skips a table staff pulled out of rotation", () => {
    const plan = planDispatch(
      [ready("a", 1, 0)],
      [venueTable("t1", 0, "closed"), venueTable("t2", 1)]
    );
    assert.deepStrictEqual(plan.assignments, [{ matchId: "a", tableId: "t2" }]);
  });

  it("is deterministic — two staff phones compute the same plan", () => {
    const matches = [ready("a", 1, 0), ready("b", 1, 1), ready("c", 2, 0)];
    assert.deepStrictEqual(
      planDispatch(matches, tables),
      planDispatch([...matches].reverse(), tables)
    );
  });
});

describe("tableUtilisation", () => {
  it("counts what the dashboard shows", () => {
    const live = { ...ready("live", 1, 0), state: "on_table" as const, tableId: "t1" };
    assert.deepStrictEqual(
      tableUtilisation(
        [live],
        [venueTable("t1", 0), venueTable("t2", 1), venueTable("t3", 2, "closed")]
      ),
      { inPlay: 1, open: 1, closed: 1 }
    );
  });
});
