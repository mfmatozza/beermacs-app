import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinTournamentInput } from "./schemas";

describe("joinTournamentInput", () => {
  it("accepts a code as it is actually typed, and normalises it", () => {
    const r = joinTournamentInput.parse({ code: " 4kq-7bm ", displayName: "Michele" });
    assert.strictEqual(r.code, "4KQ7BM");
  });

  it("folds confusable glyphs before checking the length", () => {
    // O→0 and I→1; still six characters, so this must pass.
    assert.strictEqual(
      joinTournamentInput.parse({ code: "OI2345", displayName: "M" }).code,
      "012345"
    );
  });

  it("rejects a code that is short once normalised", () => {
    assert.throws(() => joinTournamentInput.parse({ code: "4kq7b", displayName: "M" }));
  });

  it("rejects a blank display name", () => {
    assert.throws(() => joinTournamentInput.parse({ code: "4KQ7BM", displayName: "   " }));
  });
});
