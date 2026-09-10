import { z } from "zod";
import { joinCodeLength, normaliseJoinCode } from "../join-code";

// Zod schemas are the single source of truth for anything crossing the network
// boundary. TS types are inferred from them (`z.infer<...>`), never duplicated.
//
// The entity shapes themselves live in ../domain.ts — these are the *payloads*
// an app sends. Each one is also what the matching route handler in apps/web
// validates, so a client that skips the schema still can't get past the server.

// Every Prisma id is @default(cuid()), not a UUID — cuids don't match the
// hyphenated 8-4-4-4-12 hex shape z.string().uuid() checks for, so that
// validator would have rejected every real id from our own database the
// moment any of these schemas were actually used against it.
const id = z.string().min(1);

// ── Accounts (G-1/G-2, D10) ──────────────────────────────────────────────────

/**
 * One form for everyone — player or staff. Phone is mandatory (G-1): it is
 * contact data for the venue to re-use next time (G-2/A-21), never a second
 * auth factor, so there is no OTP round trip to validate here.
 */
export const registerInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10),
  displayName: z.string().trim().min(1).max(40),
  /** Loose on purpose — international formats vary too much to pattern-match
   *  usefully. A junk value still lets the venue attempt contact; it isn't a
   *  gate on using the app. */
  phone: z.string().trim().min(4).max(24),
});
export type RegisterInput = z.infer<typeof registerInput>;

export const signInInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInInput>;

// ── Joining a tournament (U-1..U-4) ──────────────────────────────────────────

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

/** Payload for POST /api/tournaments/:id/teams — a player forming their team. */
export const createTeamInput = z.object({
  name: z.string().trim().min(1).max(40),
});
export type CreateTeamInput = z.infer<typeof createTeamInput>;

/** Payload for POST /api/teams/:id/join — a teammate using the invite code. */
export const joinTeamInput = z.object({
  code: z
    .string()
    .min(1)
    .max(32)
    .transform(normaliseJoinCode)
    .refine((c) => c.length === joinCodeLength, {
      message: `Team codes are ${joinCodeLength} characters`,
    }),
});
export type JoinTeamInput = z.infer<typeof joinTeamInput>;

// ── Results (U-11..U-14, A-12) ───────────────────────────────────────────────

/**
 * A beer pong score. Optional wherever it's used below — U-11 only asks who
 * won; a triangular or group format may not score matches at all. Bounds are
 * checked again in @beermacs/shared's `plausible()` against the tournament's
 * own `cupsToWin`, which this schema can't see.
 */
export const scoreInput = z.object({
  home: z.number().int().min(0).max(30),
  away: z.number().int().min(0).max(30),
});
export type ScoreInput = z.infer<typeof scoreInput>;

/** Payload for POST /api/matches/:id/report — a captain claiming a result. */
export const reportResultInput = z.object({
  winnerId: id,
  score: scoreInput.optional(),
});
export type ReportResultInput = z.infer<typeof reportResultInput>;

/** Payload for POST /api/matches/:id/confirm — the *other* captain agreeing. */
export const confirmResultInput = z.object({});
export type ConfirmResultInput = z.infer<typeof confirmResultInput>;

/** Payload for POST /api/matches/:id/reject — the other captain disagreeing. */
export const rejectResultInput = z.object({
  reason: z.string().trim().max(280).optional(),
});
export type RejectResultInput = z.infer<typeof rejectResultInput>;

/**
 * Payload for POST /api/matches/:id/resolve — an admin settling it (A-12),
 * from any state. `reason` is required, not optional: every forced result
 * writes an audit row, and an audit row with no reason is not worth writing.
 */
export const staffResolveInput = z.object({
  winnerId: id,
  score: scoreInput.optional(),
  reason: z.string().trim().min(1).max(280),
});
export type StaffResolveInput = z.infer<typeof staffResolveInput>;

// ── Tables (A-3/A-4) ──────────────────────────────────────────────────────────

/** Payload for POST /api/matches/:id/assign-table — send a match to a table. */
export const assignTableInput = z.object({
  tableId: id,
});
export type AssignTableInput = z.infer<typeof assignTableInput>;

/** Payload for POST /api/tables/:id/state — pull a wobbly table out of rotation. */
export const setTableStateInput = z.object({
  state: z.enum(["open", "closed"]),
});
export type SetTableStateInput = z.infer<typeof setTableStateInput>;

// ── Creating and configuring a tournament (A-1..A-6) ─────────────────────────

/**
 * Payload for POST /api/venues/:id/tournaments.
 *
 * `tableLabels` upserts the venue's physical tables (A-3/A-4) — tables belong
 * to the venue, not the tournament, so re-running this with the same labels on
 * a venue's second tournament is a no-op, not a duplicate set.
 */
export const createTournamentInput = z.object({
  name: z.string().trim().min(1).max(60),
  format: z.enum(["single_elimination", "group_then_knockout", "triangular"]),
  playersPerTeam: z.number().int().min(1).max(12),
  chatEnabled: z.boolean(),
  /** Null = this format doesn't score matches at all. */
  cupsToWin: z.number().int().min(1).max(30).nullable(),
  confirmTimeoutMins: z.number().int().min(1).max(180),
  autoRepechageMode: z.enum(["auto", "manual"]),
  tableLabels: z.array(z.string().trim().min(1).max(24)).min(1).max(64),
});
export type CreateTournamentInput = z.infer<typeof createTournamentInput>;

/**
 * Payload for PATCH /api/tournaments/:id — A-6, changing the format while the
 * tournament is running. A field update, deliberately: see docs/DECISIONS.md
 * D9. Every field optional, since this also covers smaller config edits
 * (toggling chat, changing the confirm timeout) that aren't a format change.
 */
export const updateTournamentInput = z.object({
  format: z.enum(["single_elimination", "group_then_knockout", "triangular"]).optional(),
  playersPerTeam: z.number().int().min(1).max(12).optional(),
  chatEnabled: z.boolean().optional(),
  cupsToWin: z.number().int().min(1).max(30).nullable().optional(),
  confirmTimeoutMins: z.number().int().min(1).max(180).optional(),
  autoRepechageMode: z.enum(["auto", "manual"]).optional(),
});
export type UpdateTournamentInput = z.infer<typeof updateTournamentInput>;

// ── Rounds (A-13..A-17) ───────────────────────────────────────────────────────

/** Payload for POST /api/rounds/:id/open — A-13. No body; the id says it all. */
export const openRoundInput = z.object({});
export type OpenRoundInput = z.infer<typeof openRoundInput>;

/** Payload for POST /api/rounds/:id/scheduling — A-15, pause or resume. */
export const setRoundSchedulingInput = z.object({
  paused: z.boolean(),
});
export type SetRoundSchedulingInput = z.infer<typeof setRoundSchedulingInput>;

/**
 * Payload for POST /api/rounds/:id/pair — A-16, an admin manually pairing two
 * specific teams into this round, overriding random matchmaking. Both teams
 * must already be entrants of this round with nothing paired yet — the route
 * handler checks that against `waitingTeams()`, this schema only checks shape.
 */
export const manualPairInput = z.object({
  homeTeamId: id,
  awayTeamId: id,
});
export type ManualPairInput = z.infer<typeof manualPairInput>;

// ── Teams (A-7..A-11) ─────────────────────────────────────────────────────────

/** Payload for POST /api/tournaments/:id/teams/admin-add — A-7/A-8, staff
 *  adding a team directly (no join code needed) at any point. */
export const adminAddTeamInput = z.object({
  name: z.string().trim().min(1).max(40),
});
export type AdminAddTeamInput = z.infer<typeof adminAddTeamInput>;

/** Payload for POST /api/teams/:id/withdraw — A-8. */
export const withdrawTeamInput = z.object({
  reason: z.string().trim().max(280).optional(),
});
export type WithdrawTeamInput = z.infer<typeof withdrawTeamInput>;

/**
 * Payload for POST /api/rounds/:id/repechage — A-9/A-10, drawing a team back
 * in at any time, independent of whether the round's count is actually odd.
 * `teamId` omitted = "pick one for me" (the same auto-pick E-8 uses); named =
 * the admin's own choice. Both are legitimate any time (A-9).
 */
export const repechageInput = z.object({
  teamId: id.optional(),
});
export type RepechageInput = z.infer<typeof repechageInput>;

// ── Messaging (A-18/A-19) ─────────────────────────────────────────────────────

/**
 * Payload for POST /api/venues/:id/messages. Exactly one target field —
 * enforced by `.refine` below, not by three separate endpoints, since it's the
 * same send action with a different recipient set (A-18: one team, one
 * person, or — all fields omitted — everyone at the venue, A-19).
 */
export const sendAdminMessageInput = z
  .object({
    body: z.string().trim().min(1).max(2000),
    teamId: id.optional(),
    recipientUserId: id.optional(),
  })
  .refine((v) => !(v.teamId && v.recipientUserId), {
    message: "Target either a team or a person, not both",
  });
export type SendAdminMessageInput = z.infer<typeof sendAdminMessageInput>;
