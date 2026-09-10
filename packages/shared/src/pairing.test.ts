import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomPairs } from "./pairing";
import { seededRandom } from "./testing";

describe("randomPairs", () => {
  it("pairs every team when the count is even", () => {
    const r = randomPairs(["a", "b", "c", "d"], seededRandom(1));
    assert.strictEqual(r.pairs.length, 2);
    assert.strictEqual(r.leftover, null);
    const seen = r.pairs.flat();
    assert.deepStrictEqual([...seen].sort(), ["a", "b", "c", "d"]);
  });

  it("leaves exactly one team over on an odd count", () => {
    const r = randomPairs(["a", "b", "c"], seededRandom(2));
    assert.strictEqual(r.pairs.length, 1);
    assert.notStrictEqual(r.leftover, null);
    const used = new Set([...r.pairs[0]!, r.leftover]);
    assert.strictEqual(used.size, 3);
  });

  it("is deterministic for a given random source", () => {
    const a = randomPairs(["a", "b", "c", "d", "e"], seededRandom(7));
    const b = randomPairs(["a", "b", "c", "d", "e"], seededRandom(7));
    assert.deepStrictEqual(a, b);
  });

  it("does not always return the input order (actually shuffles)", () => {
    const teams = Array.from({ length: 12 }, (_, i) => `t${i}`);
    const identity = teams
      .reduce<string[]>((acc, _, i) => (i % 2 === 0 ? [...acc, teams[i]!, teams[i + 1]!] : acc), [])
      .join(",");
    let differed = false;
    for (let seed = 1; seed <= 20; seed++) {
      const r = randomPairs(teams, seededRandom(seed));
      if (r.pairs.flat().join(",") !== identity) {
        differed = true;
        break;
      }
    }
    assert.ok(differed, "20 seeds all reproduced the identity pairing — shuffle is not working");
  });

  it("handles an empty list", () => {
    assert.deepStrictEqual(randomPairs([]), { pairs: [], leftover: null });
  });

  it("handles a single team", () => {
    assert.deepStrictEqual(randomPairs(["a"]), { pairs: [], leftover: "a" });
  });
});
