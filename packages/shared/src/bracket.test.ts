import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeBracket,
  luckyLoserPool,
  planNextRound,
  planRoundOne,
  roundLabel,
} from "./bracket";
import { unwrap } from "./result";
import { bye, played, teams } from "./testing";

describe("describeBracket", () => {
  it("reports nothing for fewer than two teams", () => {
    assert.deepStrictEqual(describeBracket(1), {
      teamCount: 1,
      firstRoundMatches: 0,
      byes: 0,
      estimatedRounds: 0,
    });
  });

  it("gives an odd team count exactly one bye", () => {
    assert.deepStrictEqual(describeBracket(9), {
      teamCount: 9,
      firstRoundMatches: 4,
      byes: 1,
      estimatedRounds: 4,
    });
  });
});

describe("planRoundOne", () => {
  it("refuses to build a bracket from one team", () => {
    const r = planRoundOne(teams("solo"));
    assert.strictEqual(r.ok, false);
    if (!r.ok) assert.deepStrictEqual(r.error, { kind: "not_enough_teams", count: 1 });
  });

  it("pairs in registration order and does not shuffle", () => {
    const plan = unwrap(planRoundOne(teams("a", "b", "c", "d")));
    assert.deepStrictEqual(
      plan.map((m) => [m.homeTeamId, m.awayTeamId]),
      [
        ["a", "b"],
        ["c", "d"],
      ]
    );
  });

  it("honours seed order even when the input array is shuffled", () => {
    const [a, b, c, d] = teams("a", "b", "c", "d");
    const plan = unwrap(planRoundOne([d!, b!, a!, c!]));
    assert.deepStrictEqual(
      plan.map((m) => [m.homeTeamId, m.awayTeamId]),
      [
        ["a", "b"],
        ["c", "d"],
      ]
    );
  });

  it("gives the last-registered team a bye on an odd count", () => {
    const plan = unwrap(planRoundOne(teams("a", "b", "c", "d", "e")));
    assert.strictEqual(plan.length, 3);
    assert.partialDeepStrictEqual(plan[2], {
      homeTeamId: "e",
      awayTeamId: null,
      isBye: true,
      position: 2,
    });
  });
});

describe("planNextRound", () => {
  it("will not advance while a match is unsettled", () => {
    const r = planNextRound([played("m1", 1, 0, "a", "b", "a"), played("m2", 1, 1, "c", "d")], 1);
    assert.strictEqual(r.ok, false);
    if (!r.ok) assert.deepStrictEqual(r.error, { kind: "round_incomplete", unfinished: ["m2"] });
  });

  it("pairs winners in bracket order", () => {
    const advance = unwrap(
      planNextRound(
        [
          played("m1", 1, 0, "a", "b", "a"),
          played("m2", 1, 1, "c", "d", "d"),
          played("m3", 1, 2, "e", "f", "e"),
          played("m4", 1, 3, "g", "h", "h"),
        ],
        1
      )
    );
    assert.strictEqual(advance.kind, "next_round");
    if (advance.kind !== "next_round") return;
    assert.strictEqual(advance.round, 2);
    assert.deepStrictEqual(
      advance.matches.map((m) => [m.homeTeamId, m.awayTeamId]),
      [
        ["a", "d"],
        ["e", "h"],
      ]
    );
  });

  it("opens a lucky-loser slot when a round yields an odd number of winners", () => {
    const advance = unwrap(
      planNextRound(
        [
          played("m1", 1, 0, "a", "b", "a"),
          played("m2", 1, 1, "c", "d", "c"),
          bye("m3", 1, 2, "e"),
        ],
        1
      )
    );
    if (advance.kind !== "next_round") throw new Error("expected next_round");
    assert.strictEqual(advance.matches.length, 2);
    assert.partialDeepStrictEqual(advance.matches[0], { homeTeamId: "a", awayTeamId: "c" });
    // The spare winner waits for staff to draw someone back in — this is an
    // empty slot, NOT a bye. The distinction is the whole lucky-loser format.
    assert.partialDeepStrictEqual(advance.matches[1], {
      homeTeamId: "e",
      awayTeamId: null,
      isBye: false,
      awaitsLuckyLoser: true,
    });
  });

  it("declares a champion when one winner is left", () => {
    const advance = unwrap(planNextRound([played("f", 3, 0, "a", "c", "a")], 3));
    assert.deepStrictEqual(advance, { kind: "champion", teamId: "a" });
  });

  it("treats a bye as already settled rather than as an obstacle", () => {
    const r = planNextRound([played("m1", 1, 0, "a", "b", "a"), bye("m2", 1, 1, "c")], 1);
    assert.strictEqual(r.ok, true);
  });
});

describe("luckyLoserPool", () => {
  it("lists eliminated teams, most recently out first", () => {
    const pool = luckyLoserPool([
      played("m1", 1, 0, "a", "b", "a"),
      played("m2", 1, 1, "c", "d", "c"),
      played("m3", 2, 0, "a", "c", "a"),
    ]);
    assert.deepStrictEqual(pool, [
      { teamId: "c", eliminatedInRound: 2 },
      { teamId: "b", eliminatedInRound: 1 },
      { teamId: "d", eliminatedInRound: 1 },
    ]);
  });

  it("drops a team from the pool once it has been drawn back in", () => {
    const pool = luckyLoserPool([
      played("m1", 1, 0, "a", "b", "a"),
      played("m2", 1, 1, "c", "d", "c"),
      // "b" was drawn back in for round two and is playing again.
      played("m3", 2, 0, "a", "b"),
    ]);
    assert.deepStrictEqual(
      pool.map((p) => p.teamId),
      ["d"]
    );
  });
});

describe("roundLabel", () => {
  it("names rounds by their size, not their number", () => {
    assert.strictEqual(roundLabel(1, 5), "Final");
    assert.strictEqual(roundLabel(2, 4), "Semifinals");
    assert.strictEqual(roundLabel(4, 3), "Quarterfinals");
    assert.strictEqual(roundLabel(7, 1), "Round 1");
  });
});
