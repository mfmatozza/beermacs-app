# Roadmap

Rebuilt against `brand/beermacs-feature-spec.md` (the client's feature spec,
adopted as canonical — see docs/DECISIONS.md D9). Feature IDs below (G-, U-,
A-, E-) refer to that document. See docs/APP_STORE_COMPLIANCE.md for what has
to be true before the first submission — that checklist runs alongside every
phase below, not after them.

## Phase 0 — foundations (done)

- npm workspaces + Turborepo, shared ESLint/Prettier/TS config
- Expo Router app with NativeWind, the pour loading screen, a glowing logo and
  ambient beer-particle background, a venue-picker Home screen
- Next.js site: landing, plus the privacy and support pages Apple requires
  before a submission can be made

## Phase 1 — the database and the engine (done)

- Neon project via Vercel Storage; migrations from `packages/db`
- `@beermacs/shared`, rebuilt for the spec rather than extended:
  - `rounds.ts` — a round's explicit open/not-opened lifecycle (A-13), which
    round a new team enters at (E-6/E-7), who is still waiting to play (E-3)
  - `pairing.ts` — random pairing (E-1)
  - `repechage.ts` — the loser pool, and drawing a team back in either
    automatically (E-8) or by admin choice (A-9/A-10)
  - `dispatcher.ts` — handing free tables to playable matches (E-2)
  - `approval.ts` — the dual-confirmation result flow (U-11..14), score now
    optional since the spec never asks for one
  - 65 tests, all passing, covering every rule above
- `Round`/`RoundEntrant` tables in Postgres; `Team.entryRound`/`withdrawn`;
  `Tournament.format` as a structural enum (single elimination / group+
  knockout / triangular) plus a JSON `config` for the tunable knobs

### Open: how live updates work

A client-connected database would have given realtime for free. On Neon behind
Vercel it has to be chosen. In rough order of cost:

1. **Polling** — TanStack Query `refetchInterval` at 2–4s. No new
   infrastructure, and push notifications already cover the one urgent case
   ("you're up — Table 3").
2. **SSE from a route handler** — needs a pub/sub backend anyway to fan out
   across serverless instances.
3. **A managed service** (Ably, Pusher) — robust, recurring bill.

Recommendation: start at (1), move only if a real pilot night shows it isn't
enough.

## Phase 2 — accounts and joining (G-1/G-2, U-1..U-4)

- One registration screen for everyone: email, password, phone, display name
  (docs/DECISIONS.md D10 — no anonymous path, no SMS OTP, no split flow for
  players vs. staff). Phone is stored contact data, never a second factor.
- **In-app account deletion** (App Store guideline 5.1.1(v)) — required for
  this submission, not deferred.
- Join a tournament by numeric code (built), QR code, or link (U-1) — QR needs
  `expo-camera`, a new native module, and its own usage-description string.
- Create a team, name it, invite teammates by code/QR/link (U-2/U-3). Team size
  is whatever the admin set (A-1/U-4), not fixed by the app.

## Phase 3 — the admin console (A-1..A-21) (done)

Every item below is built and verified against Neon, not just typed. In the
order it was actually built:

1. **Create a tournament** (done) — format (A-5), team size, chat on/off
   (A-2), table count and labels (A-3/A-4). `POST /api/venues/:id/tournaments`
   creates the tournament, its Stage(s) (two for group-then-knockout), Round 1
   not-opened (E-7), and upserts the venue's tables idempotently. Verified
   against Neon: role-gated to VENUE_ADMIN+, group-then-knockout produces
   GROUP+ELIMINATION stages, re-running with an overlapping table label
   reuses it rather than duplicating.
2. **Round control** (done) — open a round (A-13), including rounds beyond
   the first, whose Round row is created lazily on first open rather than
   pre-existing; several stay open at once, verified (A-14); pause/resume
   auto-dispatch per round (A-15). Also landed: team creation (U-2), which
   round control needed real entrants to test against — a team's entryRound
   is computed once, at creation, from entryRoundForNewTeam (E-6/E-7).
3. **Team management** (done) — admin-add a team at any point, no join code
   (A-7/A-8) via lib/teams.ts's shared entry-round logic; withdraw one
   (soft flag, does not auto-resolve an in-flight match — A-12 is the tool
   for that, deliberately kept as one explicit action rather than a guessing
   cascade); manual pairing (A-16), checked against the exact waitingTeams()
   the automatic dispatcher will use so a manual and an automatic pairing are
   indistinguishable once created; force a result (A-12) via the same
   transition() state machine a captain's report goes through — no separate
   admin code path to keep in sync with the rules.
4. **Repêchage** (done) — draw a team back in, auto or by name (A-9/A-10),
   any time, independent of parity. Pool scoped to the round's stage.
5. **Player directory** (done) — GET /api/venues/:id/players (A-21), gated
   to VENUE_ADMIN+ specifically (VENUE_STAFF is 403 — bulk contact details are
   an admin action, not a night-of one).
6. **Messaging** (done) — a team, a person, or a broadcast, scoped to a
   tournament (A-18/A-19 — "anyone in the app" read as "anyone in this
   tournament", since every messaging surface the spec describes elsewhere is
   tournament-scoped and ChatChannel.tournamentId is non-nullable by schema).
   VENUE_STAFF+, matching the existing staff chat access (U-10/A-20). Push on
   send is a marked TODO for phase 5, not faked.
7. **Format change mid-tournament** (A-6, done) — config knobs (team size,
   chat, scoring, timeout, repêchage mode) are always a safe field update.
   The structural `format` itself is different: changing it means a
   different Stage shape, and this does not attempt to migrate live matches
   onto a new one — that is real, unscoped work (what happens to a group
   stage's standings if the format becomes single elimination mid-way?). So
   format may only change while nothing has been played yet (no Match row
   exists); once one does, PATCH returns format_locked_after_first_match and
   the config knobs remain freely editable.

## Phase 4 — the live loop (E-1..E-8, U-5..U-7)

1. **The result flow** (U-11..U-14, done) — `report`/`confirm`/`reject` for
   the two-captain path, `resolve` for staff force-settle, all through the
   one `transition()` state machine. Settling a match (any of the three
   routes) now also advances the winner into `RoundEntrant` for the next
   round (`advanceWinnerToNextRound` in `lib/match-mapping.ts`) — a real gap
   found while testing this phase: nothing wrote that row before, so a
   bracket had no way to progress past round 1. A no-op for a group-stage
   match (`groupId` set) — a group's promotion is a standings computation
   after every match in the group, not a per-match advance.
2. **The automatic dispatcher** (E-1..E-3/E-8, done) — `lib/dispatch.ts` +
   `POST /venues/:id/dispatch/run`, VENUE_STAFF+. Pairs waiting teams
   per open/unpaused round (auto-repêchage on an odd count), then hands out
   free tables venue-wide via `planDispatch()`, each table claim applied as
   its own conditional `UPDATE ... WHERE state = 'OPEN'` so two staff phones
   calling this at once can't double-book a table. Verified against real
   Neon end to end: create tournament → join → team → open round → dispatch
   pairs and assigns a table → settle → winner lands in round 2, table
   returns to OPEN — for both the resolve path and the report/confirm path.
   Finding this required first fixing D12 (nothing transitioned a tournament
   to `RUNNING`, which the dispatch pass gates on).
- The public bracket/standings view (U-7, E-5), updating as matches are
  assigned and confirmed.
- "Who I play, when, which table" on the player's own screen (U-5/U-6).

## Phase 5 — push (U-15..U-17)

`expo-notifications` and one route handler. "You're up — Table 3" first; new
match-chat message and admin message follow once chat ships.

## Phase 6 — chat (U-8..U-10)

Per-match channels (auto-created when a match goes on a table), a tournament-
wide channel, admin read/write access to every match's chat. Ships together
with report/block/mute — App Store guideline 1.2 requires the moderation kit
to exist _before_ user-generated content can go live, not after.

## Phase 7 — sell it

Venue onboarding, Stripe subscription on the web (never in-app IAP for this —
see APP_STORE_COMPLIANCE.md), post-tournament archive, the seeded demo venue
for App Review, store submission.
