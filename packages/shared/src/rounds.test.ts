import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entryRoundForNewTeam, openRound, setSchedulingPaused, waitingTeams } from "./rounds";
import { match, round } from "./testing";

describe("entryRoundForNewTeam", () => {
  it("is round 1 before anything has opened (E-7)", () => {
    const rounds = [round("r1", 1, "not_opened"), round("r2", 2, "not_opened")];
    assert.strictEqual(entryRoundForNewTeam(rounds), 1);
  });

  it("is the lowest OPEN round when several are open (E-6)", () => {
    const rounds = [round("r1", 1, "open"), round("r2", 2, "open"), round("r3", 3, "not_opened")];
    assert.strictEqual(entryRoundForNewTeam(rounds), 1);
  });

  it("skips a not-yet-opened round even if its index is lower", () => {
    const rounds = [round("r1", 1, "not_opened"), round("r2", 2, "open")];
    assert.strictEqual(entryRoundForNewTeam(rounds), 2);
  });
});

describe("openRound", () => {
  it("opens a not-opened round", () => {
    assert.strictEqual(openRound(round("r1", 1, "not_opened")).status, "open");
  });

  it("is a no-op on an already-open round", () => {
    const r = round("r1", 1, "open");
    assert.strictEqual(openRound(r), r);
  });
});

describe("setSchedulingPaused", () => {
  it("toggles the flag and is otherwise a no-op", () => {
    const r = round("r1", 1, "open");
    const paused = setSchedulingPaused(r, true);
    assert.strictEqual(paused.schedulingPaused, true);
    assert.strictEqual(setSchedulingPaused(paused, true), paused);
  });
});

describe("waitingTeams", () => {
  it("lists entrants not yet placed in any match of the round", () => {
    const r = round("r1", 1, "open");
    const entrants = [
      { teamId: "a", roundId: "r1", viaRepechage: false },
      { teamId: "b", roundId: "r1", viaRepechage: false },
      { teamId: "c", roundId: "r1", viaRepechage: false },
    ];
    const matches = [
      match({ id: "m1", roundId: "r1", home: { teamId: "a", viaRepechage: false } }),
    ];
    assert.deepStrictEqual(waitingTeams(r, entrants, matches), ["b", "c"]);
  });

  it("does not return a team once it has been paired, win or lose", () => {
    const r = round("r1", 1, "open");
    const entrants = [{ teamId: "a", roundId: "r1", viaRepechage: false }];
    const matches = [
      match({
        id: "m1",
        roundId: "r1",
        home: { teamId: "a", viaRepechage: false },
        away: { teamId: "b", viaRepechage: false },
        state: "confirmed",
        winnerId: "b",
      }),
    ];
    assert.deepStrictEqual(waitingTeams(r, entrants, matches), []);
  });

  it("ignores matches from a different round", () => {
    const r = round("r2", 2, "open");
    const entrants = [{ teamId: "a", roundId: "r2", viaRepechage: false }];
    const matches = [
      match({ id: "m1", roundId: "r1", home: { teamId: "a", viaRepechage: false } }),
    ];
    assert.deepStrictEqual(waitingTeams(r, entrants, matches), ["a"]);
  });
});
