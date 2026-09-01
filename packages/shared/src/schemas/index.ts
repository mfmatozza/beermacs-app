import { z } from "zod";
import { joinCodeLength, normaliseJoinCode } from "../join-code";

// Zod schemas are the single source of truth for anything crossing the network
// boundary. TS types are inferred from them (`z.infer<...>`), never duplicated.
//
// The entity shapes themselves live in ../domain.ts — these are the *payloads*
// an app sends. Each one is also what the matching Postgres function validates,
// so a client that skips the schema still can't get past the server.

const uuid = z.string().uuid();

// ── Joining ─────────────────────────────────────────────────────────────────

/**
 * Payload for POST /api/tournaments/join — the code off the table tent.
 *
 * The code is normalised INSIDE the schema, not by the caller. Validating the
 * raw string first defeats the point of tolerant codes: "4kq-7bm" is exactly
 * what someone types, and a length check that runs before the dash is stripped
 * rejects a perfectly good code. Because this schema is shared, the app and the
 * route handler now normalise identically and neither has to trust the other.
 */
export const joinTournamentInput = z.object({
  code: z
    .string()
    .min(1)
    .max(32)
    .transform(normaliseJoinCode)
    .refine((c) => c.length === joinCodeLength, {
      message: `Join codes are ${joinCodeLength} characters`,
    }),
  displayName: z.string().trim().min(1).max(40),
});
export type JoinTournamentInput = z.infer<typeof joinTournamentInput>;

/** Payload for POST /rpc/create_team. */
export const createTeamInput = z.object({
  tournamentId: uuid,
  name: z.string().trim().min(1).max(40),
});
export type CreateTeamInput = z.infer<typeof createTeamInput>;

// ── Results ─────────────────────────────────────────────────────────────────

/**
 * A beer pong score. Bounds are checked again in `plausibleScore` against the
 * tournament's own `cupsToWin`, which this schema can't see.
 */
export const scoreInput = z.object({
  home: z.number().int().min(0).max(30),
  away: z.number().int().min(0).max(30),
});
export type ScoreInput = z.infer<typeof scoreInput>;

/** Payload for POST /rpc/report_result — a captain claiming a result. */
export const reportResultInput = z.object({
  matchId: uuid,
  winnerId: uuid,
  score: scoreInput,
});
export type ReportResultInput = z.infer<typeof reportResultInput>;

/** Payload for POST /rpc/confirm_result — the *other* captain agreeing. */
export const confirmResultInput = z.object({
  matchId: uuid,
});
export type ConfirmResultInput = z.infer<typeof confirmResultInput>;

/** Payload for POST /rpc/reject_result — the other captain disagreeing. */
export const rejectResultInput = z.object({
  matchId: uuid,
  reason: z.string().trim().max(280).optional(),
});
export type RejectResultInput = z.infer<typeof rejectResultInput>;

/**
 * Payload for POST /rpc/staff_resolve — staff settling it from any state.
 * `reason` is required, not optional: every forced result writes an audit row,
 * and an audit row with no reason is not worth writing.
 */
export const staffResolveInput = z.object({
  matchId: uuid,
  winnerId: uuid,
  score: scoreInput,
  reason: z.string().trim().min(1).max(280),
});
export type StaffResolveInput = z.infer<typeof staffResolveInput>;

// ── Tables ──────────────────────────────────────────────────────────────────

/** Payload for POST /rpc/assign_table — send a match to a physical table. */
export const assignTableInput = z.object({
  matchId: uuid,
  tableId: uuid,
});
export type AssignTableInput = z.infer<typeof assignTableInput>;

/** Payload for POST /rpc/set_table_state — pull a wobbly table out of rotation. */
export const setTableStateInput = z.object({
  tableId: uuid,
  state: z.enum(["open", "closed"]),
});
export type SetTableStateInput = z.infer<typeof setTableStateInput>;

// ── Bracket ─────────────────────────────────────────────────────────────────

/** Payload for POST /rpc/advance_round. */
export const advanceRoundInput = z.object({
  tournamentId: uuid,
  round: z.number().int().min(1),
});
export type AdvanceRoundInput = z.infer<typeof advanceRoundInput>;

/**
 * Payload for POST /rpc/swap_slots — what eight commits of hand-written SQL
 * were doing to the old app's production database, mid-tournament.
 */
export const swapSlotsInput = z.object({
  tournamentId: uuid,
  from: z.object({ matchId: uuid, slot: z.enum(["home", "away"]) }),
  to: z.object({ matchId: uuid, slot: z.enum(["home", "away"]) }),
  reason: z.string().trim().min(1).max(280),
});
export type SwapSlotsInput = z.infer<typeof swapSlotsInput>;
