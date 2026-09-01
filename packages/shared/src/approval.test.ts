import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Actor, ApprovalContext, PendingReport } from "./approval";
import { transition } from "./approval";
import { isErr, unwrap } from "./result";
import { match, played, score } from "./testing";

const NOW = "2026-08-31T22:15:00.000Z";

const captain = (teamId: string): Actor => ({ kind: "captain", userId: `u-${teamId}`, teamId });
const staff: Actor = { kind: "staff", userId: "u-bar" };

const ctx = (actor: Actor, pending: PendingReport | null = null): ApprovalContext => ({
  actor,
  pending,
  cupsToWin: 10,
  now: NOW,
});

const onTable = () =>
  match({
    id: "m1",
    home: { teamId: "hellas", viaLuckyLoser: false },
    away: { teamId: "larp", viaLuckyLoser: false },
    state: "on_table",
    tableId: "t3",
  });

const pending: PendingReport = {
  reportedByTeamId: "hellas",
  winnerId: "hellas",
  score: score(10, 7),
  at: NOW,
};

describe("reporting a result", () => {
  it("moves to reported and asks the other captain to confirm", () => {
    const t = unwrap(
      transition(
        onTable(),
        { type: "report", winnerId: "hellas", score: score(10, 7) },
        ctx(captain("hellas"))
      )
    );
    assert.strictEqual(t.match.state, "reported");
    assert.strictEqual(t.match.winnerId, null); // not settled yet — this is the point
    assert.deepStrictEqual(t.notify, [{ kind: "confirm_result", team: "larp" }]);
  });

  it("rejects a report from a team that is not in the match", () => {
    const r = transition(
      onTable(),
      { type: "report", winnerId: "hellas", score: score(10, 7) },
      ctx(captain("some-other-team"))
    );
    assert.strictEqual(isErr(r), true);
    if (isErr(r)) {
      assert.deepStrictEqual(r.error, { kind: "not_in_match", teamId: "some-other-team" });
    }
  });

  it("rejects a winner who is not in the match", () => {
    const r = transition(
      onTable(),
      { type: "report", winnerId: "gate-crashers", score: score(10, 7) },
      ctx(captain("hellas"))
    );
    if (!isErr(r)) throw new Error("expected an error");
    assert.deepStrictEqual(r.error, { kind: "winner_not_in_match", teamId: "gate-crashers" });
  });

  it("rejects a score that cannot happen", () => {
    for (const s of [score(9, 7), score(10, 10), score(12, 3), score(-1, 10)]) {
      const r = transition(
        onTable(),
        { type: "report", winnerId: "hellas", score: s },
        ctx(captain("hellas"))
      );
      assert.strictEqual(isErr(r), true);
    }
  });

  it("settles immediately when staff report, since there is nobody to argue with", () => {
    const t = unwrap(
      transition(onTable(), { type: "report", winnerId: "larp", score: score(10, 4) }, ctx(staff))
    );
    assert.strictEqual(t.match.state, "confirmed");
    assert.strictEqual(t.match.winnerId, "larp");
    assert.strictEqual(t.forced, true);
    assert.strictEqual(t.releasesTable, "t3");
  });

  it("will not accept a report on a match that is not on a table", () => {
    const r = transition(
      played("m9", 1, 0, "hellas", "larp", "hellas"),
      { type: "report", winnerId: "hellas", score: score(10, 7) },
      ctx(captain("hellas"))
    );
    if (!isErr(r)) throw new Error("expected an error");
    assert.partialDeepStrictEqual(r.error, { kind: "wrong_state", state: "confirmed" });
  });
});

describe("confirming a result", () => {
  const reported = () => ({ ...onTable(), state: "reported" as const });

  it("settles when the other captain agrees", () => {
    const t = unwrap(transition(reported(), { type: "confirm" }, ctx(captain("larp"), pending)));
    assert.strictEqual(t.match.state, "confirmed");
    assert.strictEqual(t.match.winnerId, "hellas");
    assert.deepStrictEqual(t.match.score, score(10, 7));
    assert.strictEqual(t.forced, false);
    assert.strictEqual(t.releasesTable, "t3");
    assert.strictEqual(t.match.tableId, null);
  });

  /**
   * The hole in the old app. Approval logic in React is decoration: the losing
   * captain just calls the endpoint. This has to fail here, in the code that
   * also runs server-side, or the feature does not exist.
   */
  it("refuses to let the reporting team confirm its own report", () => {
    const r = transition(reported(), { type: "confirm" }, ctx(captain("hellas"), pending));
    if (!isErr(r)) {
      throw new Error("a team confirmed its own result — the rule is not enforced");
    }
    assert.deepStrictEqual(r.error, { kind: "self_confirmation" });
  });

  it("refuses a confirmation from a bystander", () => {
    const r = transition(reported(), { type: "confirm" }, ctx(captain("nobody"), pending));
    if (!isErr(r)) throw new Error("expected an error");
    assert.deepStrictEqual(r.error, { kind: "not_in_match", teamId: "nobody" });
  });

  it("lets staff confirm on either team's behalf, flagged as forced", () => {
    const t = unwrap(transition(reported(), { type: "confirm" }, ctx(staff, pending)));
    assert.strictEqual(t.match.state, "confirmed");
    assert.strictEqual(t.forced, true);
  });
});

describe("disputes", () => {
  const reported = () => ({ ...onTable(), state: "reported" as const });

  it("sends a rejection to staff rather than settling it", () => {
    const t = unwrap(
      transition(
        reported(),
        { type: "reject", reason: "that was a re-rack" },
        ctx(captain("larp"), pending)
      )
    );
    assert.strictEqual(t.match.state, "disputed");
    assert.strictEqual(t.match.winnerId, null);
    assert.deepStrictEqual(t.notify, [{ kind: "staff_needed" }]);
  });

  it("treats silence as a dispute, never as agreement", () => {
    const t = unwrap(transition(reported(), { type: "timeout" }, ctx(staff, pending)));
    assert.strictEqual(t.match.state, "disputed");
    assert.strictEqual(t.match.winnerId, null);
  });

  it("lets staff settle a dispute from any state, and records that it was forced", () => {
    const disputed = { ...onTable(), state: "disputed" as const };
    const t = unwrap(
      transition(
        disputed,
        {
          type: "staff_resolve",
          winnerId: "larp",
          score: score(10, 8),
          reason: "replayed the last cup",
        },
        ctx(staff, pending)
      )
    );
    assert.strictEqual(t.match.state, "confirmed");
    assert.strictEqual(t.match.winnerId, "larp");
    assert.strictEqual(t.forced, true);
  });

  it("does not let a captain call themselves staff", () => {
    const r = transition(
      { ...onTable(), state: "disputed" },
      { type: "staff_resolve", winnerId: "hellas", score: score(10, 0), reason: "we won" },
      ctx(captain("hellas"), pending)
    );
    if (!isErr(r)) throw new Error("expected an error");
    assert.deepStrictEqual(r.error, { kind: "staff_only", event: "staff_resolve" });
  });
});

describe("table assignment", () => {
  it("notifies both teams when a match goes on a table", () => {
    const scheduled = match({
      id: "m2",
      home: { teamId: "hellas", viaLuckyLoser: false },
      away: { teamId: "larp", viaLuckyLoser: false },
      state: "queued",
    });
    const t = unwrap(transition(scheduled, { type: "assign_table", tableId: "t1" }, ctx(staff)));
    assert.strictEqual(t.match.state, "on_table");
    assert.strictEqual(t.match.tableId, "t1");
    assert.deepStrictEqual(t.notify, [
      { kind: "youre_up", teams: ["hellas", "larp"], tableId: "t1" },
    ]);
  });

  it("will not put a half-empty match on a table", () => {
    const half = match({
      id: "m3",
      home: { teamId: "hellas", viaLuckyLoser: false },
      state: "scheduled",
    });
    const r = transition(half, { type: "assign_table", tableId: "t1" }, ctx(staff));
    if (!isErr(r)) throw new Error("expected an error");
    assert.deepStrictEqual(r.error, { kind: "incomplete_slots" });
  });
});
