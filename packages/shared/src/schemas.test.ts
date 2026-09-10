import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinTournamentInput, registerInput, signInInput } from "./schemas";

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

describe("registerInput", () => {
  it("accepts a full valid registration", () => {
    const r = registerInput.parse({
      email: "Michele@Example.com",
      password: "pour-me-a-pint",
      displayName: "Michele",
      phone: "+39 333 1234567",
    });
    assert.strictEqual(r.email, "michele@example.com");
  });

  it("rejects a password under the minimum length", () => {
    assert.throws(() =>
      registerInput.parse({
        email: "a@b.com",
        password: "short",
        displayName: "A",
        phone: "12345",
      })
    );
  });

  it("rejects a missing phone — mandatory per G-1", () => {
    assert.throws(() =>
      registerInput.parse({
        email: "a@b.com",
        password: "pour-me-a-pint",
        displayName: "A",
        phone: "",
      })
    );
  });

  it("rejects an invalid email", () => {
    assert.throws(() =>
      registerInput.parse({
        email: "not-an-email",
        password: "pour-me-a-pint",
        displayName: "A",
        phone: "12345",
      })
    );
  });
});

describe("signInInput", () => {
  it("lower-cases the email but does not touch the password", () => {
    const r = signInInput.parse({ email: "A@B.com", password: "Whatever1" });
    assert.strictEqual(r.email, "a@b.com");
    assert.strictEqual(r.password, "Whatever1");
  });
});
