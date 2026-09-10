import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isEligibleForRepechage, loserPool, pickAutoRepechage } from "./repechage";
import { match } from "./testing";

const confirmed = (id: string, roundId: string, home: string, away: string, winner: string) =>
  match({
    id,
    roundId,
    home: { teamId: home, viaRepechage: false },
    away: { teamId: away, viaRepechage: false },
    state: "confirmed",
    winnerId: winner,
  });

describe("loserPool", () => {
  it("lists eliminated teams, most recently out first", () => {
    // "Most recent" is the input array's position, not a round number — Match
    // no longer carries a round int (only roundId). The caller is expected to
    // pass matches in chronological order, same contract as dispatcher.ts.
    const pool = loserPool([
      confirmed("m1", "r1", "a", "b", "a"), // b out, at position 0
      confirmed("m2", "r1", "c", "d", "c"), // d out, at position 1 — more recent than b
      confirmed("m3", "r2", "a", "c", "a"), // c out, at position 2 — most recent
    ]);
    assert.deepStrictEqual(
      pool.map((p) => p.teamId),
      ["c", "d", "b"]
    );
  });

  it("does not list a team that has been readmitted and is playing again", () => {
    const pool = loserPool([
      confirmed("m1", "r1", "a", "b", "a"),
      match({
        id: "m2",
        roundId: "r2",
        home: { teamId: "a", viaRepechage: false },
        away: { teamId: "b", viaRepechage: true },
        state: "on_table",
      }),
    ]);
    assert.deepStrictEqual(
      pool.map((p) => p.teamId),
      []
    );
  });

  it("does not list a team still mid-match", () => {
    const pool = loserPool([
      match({
        id: "m1",
        roundId: "r1",
        home: { teamId: "a", viaRepechage: false },
        away: { teamId: "b", viaRepechage: false },
        state: "reported",
      }),
    ]);
    assert.deepStrictEqual(pool, []);
  });
});

describe("pickAutoRepechage", () => {
  it("picks the most recently eliminated team", () => {
    const pool = loserPool([
      confirmed("m1", "r1", "a", "b", "a"),
      confirmed("m2", "r2", "a", "c", "a"),
    ]);
    assert.strictEqual(pickAutoRepechage(pool), "c");
  });

  it("returns null when nobody has been eliminated yet", () => {
    assert.strictEqual(pickAutoRepechage([]), null);
  });
});

describe("isEligibleForRepechage", () => {
  it("accepts a team that is actually in the pool", () => {
    const pool = loserPool([confirmed("m1", "r1", "a", "b", "a")]);
    assert.strictEqual(isEligibleForRepechage(pool, "b"), true);
  });

  it("rejects a team that is still alive", () => {
    const pool = loserPool([confirmed("m1", "r1", "a", "b", "a")]);
    assert.strictEqual(isEligibleForRepechage(pool, "a"), false);
  });
});
