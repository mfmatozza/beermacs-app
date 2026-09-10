import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createTournamentInput,
  joinTournamentInput,
  mutePlayerInput,
  pushRegisterInput,
  registerInput,
  reportResultInput,
  sendAdminMessageInput,
  sendChatMessageInput,
  signInInput,
  staffResolveInput,
} from "./schemas";

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

describe("reportResultInput / staffResolveInput", () => {
  it("accepts a report with no score at all — U-11 only asks who won", () => {
    const r = reportResultInput.parse({ winnerId: "t1" });
    assert.strictEqual(r.score, undefined);
  });

  it("still accepts a score when the format wants one", () => {
    const r = reportResultInput.parse({ winnerId: "t1", score: { home: 10, away: 7 } });
    assert.deepStrictEqual(r.score, { home: 10, away: 7 });
  });

  it("requires a reason on a staff resolve, even with no score", () => {
    assert.throws(() => staffResolveInput.parse({ winnerId: "t1", reason: "" }));
    const r = staffResolveInput.parse({ winnerId: "t1", reason: "no-show" });
    assert.strictEqual(r.reason, "no-show");
  });
});

describe("createTournamentInput", () => {
  it("accepts a full valid payload", () => {
    const r = createTournamentInput.parse({
      name: "Friday Night Cups",
      format: "single_elimination",
      playersPerTeam: 2,
      chatEnabled: true,
      cupsToWin: 10,
      confirmTimeoutMins: 15,
      autoRepechageMode: "auto",
      tableLabels: ["Table 1", "Table 2"],
    });
    assert.strictEqual(r.tableLabels.length, 2);
  });

  it("allows cupsToWin to be null — a format that doesn't score", () => {
    const r = createTournamentInput.parse({
      name: "Triangular Night",
      format: "triangular",
      playersPerTeam: 2,
      chatEnabled: false,
      cupsToWin: null,
      confirmTimeoutMins: 15,
      autoRepechageMode: "manual",
      tableLabels: ["Table 1"],
    });
    assert.strictEqual(r.cupsToWin, null);
  });

  it("rejects an empty table list", () => {
    assert.throws(() =>
      createTournamentInput.parse({
        name: "X",
        format: "single_elimination",
        playersPerTeam: 2,
        chatEnabled: true,
        cupsToWin: 10,
        confirmTimeoutMins: 15,
        autoRepechageMode: "auto",
        tableLabels: [],
      })
    );
  });
});

describe("sendAdminMessageInput", () => {
  it("accepts a broadcast (no team, no recipient)", () => {
    const r = sendAdminMessageInput.parse({ body: "Round 2 starts in 10 minutes" });
    assert.strictEqual(r.teamId, undefined);
  });

  it("accepts a message to one team, or to one person, but not both", () => {
    assert.doesNotThrow(() => sendAdminMessageInput.parse({ body: "hi", teamId: "t1" }));
    assert.doesNotThrow(() => sendAdminMessageInput.parse({ body: "hi", recipientUserId: "u1" }));
    assert.throws(() =>
      sendAdminMessageInput.parse({ body: "hi", teamId: "t1", recipientUserId: "u1" })
    );
  });
});

describe("pushRegisterInput", () => {
  it("accepts a real-shaped Expo token on either platform", () => {
    const r = pushRegisterInput.parse({
      expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      platform: "IOS",
    });
    assert.strictEqual(r.platform, "IOS");
  });

  it("rejects an empty token", () => {
    assert.throws(() => pushRegisterInput.parse({ expoPushToken: "", platform: "ANDROID" }));
  });

  it("rejects a platform outside IOS/ANDROID", () => {
    assert.throws(() => pushRegisterInput.parse({ expoPushToken: "t", platform: "WEB" }));
  });
});

describe("sendChatMessageInput", () => {
  it("accepts a normal message and trims it", () => {
    const r = sendChatMessageInput.parse({ body: "  gl hf  " });
    assert.strictEqual(r.body, "gl hf");
  });

  it("rejects an empty or whitespace-only message", () => {
    assert.throws(() => sendChatMessageInput.parse({ body: "" }));
    assert.throws(() => sendChatMessageInput.parse({ body: "   " }));
  });

  it("rejects a message over 2000 characters", () => {
    assert.throws(() => sendChatMessageInput.parse({ body: "x".repeat(2001) }));
  });
});

describe("mutePlayerInput", () => {
  it("accepts no reason at all", () => {
    assert.doesNotThrow(() => mutePlayerInput.parse({}));
  });

  it("accepts a short reason", () => {
    const r = mutePlayerInput.parse({ reason: "trash talk" });
    assert.strictEqual(r.reason, "trash talk");
  });
});
