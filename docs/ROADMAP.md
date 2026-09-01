# Roadmap

Ordered so a sellable product exists at the end of phase 2 and everything after
is differentiation.

## Phase 0 — foundations (done)

- npm workspaces + Turborepo, shared ESLint/Prettier/TS config
- `@beermacs/shared`: bracket engine, result state machine, table dispatcher,
  join codes — pure TypeScript, covered by `node --test`
- Expo Router app with NativeWind, the pour loading screen, and a home screen
  reading typed fixtures
- Next.js site: landing, plus the privacy and support pages Apple requires
  before a submission can be made

## Phase 1 — the database

- Neon project via Vercel Storage; first migration from `packages/db`
- Auth: phone OTP for players, email for staff
- Route handlers in `apps/web` for join-by-code and team registration

### Open: how live updates work

A client-connected database would have given realtime for free. On Neon behind
Vercel it has to be chosen. In rough order of cost:

1. **Polling** — TanStack Query `refetchInterval` at 2–4s. No new
   infrastructure. A bar has ~40 phones and a bracket changes every few
   minutes, so this is very likely sufficient, and push notifications already
   cover the one urgent case ("you're up — Table 3").
2. **SSE from a route handler** — needs a pub/sub backend anyway to fan out
   across serverless instances, and each open connection occupies one.
3. **A managed service** (Ably, Pusher) — robust, and a recurring bill.

Recommendation: start at (1), and only move if a real pilot night shows it
isn't enough.

## Phase 2 — the sellable core

Team registration from a phone, live bracket, tables + dispatcher, and an admin
panel that can swap, drop, re-seed and override **from a phone, mid-tournament**
— the old repo's last eight commits were hand-written SQL doing exactly that
against production, four times in one night.

## Phase 3 — result approval

The `approval.ts` state machine wired to Postgres functions, with disputes and a
timeout escalation. RLS denies direct writes to `matches.winner_id`.

## Phase 4 — push

`expo-notifications` and one edge function. "You're up — Table 3" is the
notification that sells the product.

## Phase 5 — chat

Tournament, match and staff-broadcast channels, shipped with report/block/mute.
App Store guideline 1.2 requires them for user-generated content.

## Phase 6 — sell it

Venue onboarding, Stripe subscription on the web, post-tournament archive, store
submission, and a pilot night in one real bar.
