import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateJoinCode,
  isCompleteJoinCode,
  joinCodeAlphabet,
  joinCodeLength,
  normaliseJoinCode,
} from "./join-code";
import { seededRandom } from "./testing";

describe("generateJoinCode", () => {
  it("produces codes of the right length, from the alphabet only", () => {
    const rnd = seededRandom(42);
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode(rnd);
      assert.strictEqual(code.length, joinCodeLength);
      for (const ch of code) assert.ok(joinCodeAlphabet.includes(ch));
    }
  });

  it("is deterministic given a seeded source, so tests can assert on codes", () => {
    assert.strictEqual(generateJoinCode(seededRandom(1)), generateJoinCode(seededRandom(1)));
  });
});

describe("normaliseJoinCode", () => {
  it("accepts what people actually type", () => {
    assert.strictEqual(normaliseJoinCode(" 4kq-7bm "), "4KQ7BM");
  });

  it("folds the four confusable glyphs onto characters in the alphabet", () => {
    // O→0, I→1, L→1, U→V
    assert.strictEqual(normaliseJoinCode("OILU4X"), "011V4X");
    for (const ch of normaliseJoinCode("OILU4X")) {
      assert.ok(joinCodeAlphabet.includes(ch));
    }
  });

  it("never lets a substitution shift the rest of the code", () => {
    assert.strictEqual(normaliseJoinCode("O23456").length, 6);
  });

  it("stops at the code length", () => {
    assert.strictEqual(normaliseJoinCode("ABCDEFGHJK"), "ABCDEF");
  });

  it("knows when a partly-typed code is finished", () => {
    assert.strictEqual(isCompleteJoinCode("4kq7b"), false);
    assert.strictEqual(isCompleteJoinCode("4kq-7bm"), true);
  });
});
