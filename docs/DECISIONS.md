# Decisions

Calls made without a blocking question, so they are cheap to find and reverse.
Each one records what was chosen, what it was chosen over, and the trigger that
should make us revisit it.

---

## D1 — Package layout follows astra-app, not the brief's §1

**Chosen:** `packages/shared` + `config` + `db`.
**Over:** the brief's `core` + `ui` + `config` + `animations`.

`core` and `shared` are the same package under two names, and astra parity was
an explicit instruction. UI components and the pour animation live in
`apps/mobile/components/`, as they do in astra, rather than in packages of their
own.

**Revisit when:** a second app needs to render a bracket (a web big-screen view,
or a venue dashboard). At that point `ui` earns its own package, and the pour
animation moves to `animations` so it can be re-skinned per venue for
white-labelling.

---

## D2 — Live updates by polling

**Chosen:** TanStack Query `refetchInterval`, 2–4s on the screens that show live
state (bracket, table strip, dispute queue).
**Over:** SSE + Upstash Redis pub/sub; a managed service (Ably, Pusher).

Dropping Supabase removed the realtime channel the brief assumed. Polling costs
nothing, adds no infrastructure, and is adequate at the actual scale: one venue,
tens of phones, a bracket that changes every few minutes. The one genuinely
time-critical event — "you're up, Table 3" — is a push notification, not a
subscription.

The seam is one hook, so swapping transports later does not touch the screens.

**Revisit when:** a real pilot night shows staleness that matters, or chat ships
(a chat that lags 3s feels broken in a way a bracket does not).

---

## D3 — Anonymous join, phone optional

**Chosen:** players join with a display name and a 6-character code, no account.
Phone OTP offered later, only if they want their record to follow them between
nights. Staff sign in with email.
**Over:** phone OTP for everyone (the brief's §7 lean); email OTP for everyone.

Nobody standing at a beer pong table three pints in will wait for an SMS before
playing, and phone-for-everyone means a per-message bill from the first night.
Anonymous accounts still get a real user row, so push notifications and team
membership work exactly the same.

**Revisit when:** cross-venue player stats become a selling point, or abuse in
chat needs identities that survive a reinstall.

---

## D4 — Placeholder for the centre nav mark

The brief says the Beermacs logo is provided as an asset. It has not been
supplied, so the centre tab currently uses an Ionicons beer glyph — obviously a
stand-in rather than invented branding.

**Revisit when:** the asset arrives. One component, `components/CenterTabButton.tsx`.

---

## D5 — expo-router, which is react-navigation

The brief's §2 asks for `react-navigation` with bottom tabs and native stacks.
`expo-router` is a file-based router built directly on react-navigation and is
what astra uses, so this is the same library reached through a different API.
Not treated as a conflict.

---

## D6 — Venue list, not a venue map

**Chosen:** a distance-sorted list of venues running a tournament.
**Over:** the map §5 also offers.

A map means a native maps SDK — `react-native-maps` or Mapbox, both heavy, and
Mapbox additionally needs a secret download token on every build machine (astra
carries that cost and it is not free of friction). The list answers more of what
a browsing player actually needs anyway: how far, whether it has started, and
how many teams are already in. A map answers only the first.

`Venue` already carries `latitude`/`longitude`, so the data is there when the
map is wanted.

**Revisit when:** after milestone 12 — confirmed. Search over the affiliated
bars carries it until then, and `Venue` already stores lat/lng so the map is a
new component rather than a migration.

---

## D7 — Home does not assume a venue

**Chosen:** Home always leads with "which bar are you at?" — a search field over
the affiliated bars.
**Over:** showing the venue you are already registered at, with the picker as a
fallback (what the first build did).

The app deciding for you is worse than one tap: someone can walk from one
affiliated bar to another on the same night, and a Home screen that has silently
locked onto the wrong one is confusing in a way an explicit list never is. What
is happening _inside_ a tournament lives on the Bracket tab.

**Revisit when:** never, probably — but if the picker becomes a nuisance for
regulars, remember the last venue and pre-scroll to it rather than skipping the
question.

---

## D8 — News is platform-wide as well as per-venue

`News.venueId` is nullable. A null venue is a post from us, shown to everyone
regardless of which bar they are at; a set venue is shown to that venue's
players. Both render as the same card apart from the byline, which is amber for
ours.

That is what makes Home worth opening on a night you are not playing, which is
the whole argument for the feed being the advertising surface.

Post images are supported (`News.imageUrl`). The two in the fixtures are
generated abstract art, deliberately not fake photography.

---

## D9 — Adopt the client feature spec as canonical; supersedes D3

`brand/beermacs-feature-spec.md` (mirrored here from the user's spec doc) is now
the source of truth for product behaviour. Where it conflicts with an earlier
decision in this file, the spec wins. One conflict, explicitly:

**D3 is reversed.** Signup now requires email AND phone (G-1), stored and
readable by venue admins so they can re-contact players for future nights
(G-2, A-21). This is not optional data collection — App Store review will
check that the disclosure and deletion story match what is actually collected.
Consequences, tracked here so they don't get lost:

- `apps/web/app/privacy` must say plainly that we collect email + phone, that
  venue admins can see them, and why (re-contact for future tournaments).
- Guideline 5.1.1(v): the app MUST offer account deletion _in the app_, not
  only by emailing support. This is now a hard requirement for the first
  submission, not a nice-to-have — see the Profile tab.
- Guideline 4.8 (Sign in with Apple): only triggered by offering 3rd-party/
  social login (Google, Facebook, etc.). Plain email+password does NOT
  trigger it. Consequence: do not add a "Sign in with Google" button without
  also adding Sign in with Apple, or first-submission review will bounce it.
- Anonymous player accounts (`better-auth`'s `anonymous` plugin) are dropped
  from the player-facing join flow. The plugin/tables can stay wired for now
  (harmless) but nothing should route through `ensureSession()`'s anonymous
  path once the new registration screen ships.

**The tournament engine is rebuilt**, not extended, to match spec §4 (E-1..E-8):
rounds are explicit entities with an open/not-opened lifecycle (A-13); several
rounds can be open at once and a table serves whichever open round has waiting
teams (A-14); a team added mid-tournament enters at the lowest currently open
round, or "round 1" conceptually before anyone has opened it (E-6/E-7);
repêchage is available on demand, not only when the numbers force it (A-9/A-10),
with the auto-vs-manual choice made explicit; scheduling can be paused per round
without tearing anything down (A-15). See packages/shared/src/rounds.ts,
repechage.ts and the rewritten bracket.ts/dispatcher.ts.

Match scores become OPTIONAL. The spec never asks for a cup count, only "which
team won" (U-11). Beer pong specifically can still record a score; a triangular
or group format may not want to.

**Not solved by this decision, flagged for the App Store compliance pass:**
QR-code join (U-1/U-3) needs `expo-camera` (a new native module → another
native rebuild) and a camera usage string in `app.config.ts`. Per-match chat
with admin read/write-everywhere is UGC and needs the report/block/mute kit
before submission (guideline 1.2) — the chat tab already carries a stub note
about this; it now has to actually ship, not just be planned.

---

## D10 — Auth is unified: email + password + phone, for everyone

Reconciling D9 with G-1 precisely: the spec says _every user_ provides email
and phone at signup, not just staff. The simplest design that satisfies that
without adding cost or review risk is to give players and staff the same
mechanism — no more split between "anonymous player" and "email/password
staff."

- One registration form: email, password, phone, display name. Every account
  goes through it, player or staff.
- Phone is stored data (G-2/A-21), never a second auth factor. There is no
  SMS OTP anywhere in this app — no Twilio/Vonage integration, no per-message
  cost, and nothing for App Store review to test that depends on receiving a
  text.
- `better-auth`'s `anonymous` plugin is removed, not just unrouted. Its
  tables can stay (harmless, or drop them in a later migration) but nothing
  in the app calls `signIn.anonymous()` any more.

**Revisit when:** never, unless a future decision explicitly reopens phone-OTP
(see the original plan's D3, now doubly superseded).

---

## D11 — Registration gates the whole app; account deletion ships with it

Phase 2 of the roadmap, done: one screen (email, password, phone, display
name — no anonymous path, per D10) renders before anything else, including the
tab navigator. `useAppBoot`'s `signedIn` check now decides between it and the
app, via a small zustand store (`session-store.ts`) rather than prop-drilling —
the store exists because account deletion, deep in the Profile tab, needs to
flip the same flag the root layout reads.

Verified against the real API and Neon, not just types:

- `sign-in/anonymous` is now a 404 — the plugin isn't mounted.
- registering without `phone` is rejected server-side (`MISSING_FIELD`),
  confirming the requirement lives in `apps/web/lib/auth.ts`'s config, not
  only in the client-side Zod schema, which a bypassed client could skip.
- a full registration persists phone and returns it from `/api/me`.
- account deletion rejects the wrong password (400), succeeds with the right
  one, and the User row is actually gone from Neon afterward — checked with
  a direct query, not inferred from the 200 response.

Also fixed while in `packages/shared/src/schemas`: every id field validated
with `z.string().uuid()`, but every Prisma id is `@default(cuid())` — a cuid
does not match UUID's hyphenated shape, so `createTeamInput`,
`reportResultInput`, `assignTableInput` and the rest would have rejected every
real id from our own database the moment they were used. Caught before any
endpoint used them, not after.

---

## D12 — Opening a round is what starts a tournament (REGISTRATION → RUNNING)

Found while live-testing the dispatch pass: `Tournament.status` has a
`RUNNING` state, and both the dispatch pass (`lib/dispatch.ts`) and the
read-only dispatch preview gate on it (`status: "RUNNING"`) — but nothing,
anywhere, ever wrote it. Every tournament created through the API sat in
`REGISTRATION` forever, which means E-1 through E-3 and E-8 (automatic
pairing, table assignment, repêchage) could never fire for any real
tournament. This had gone unnoticed because earlier phase testing wrote
`Match` rows directly via Prisma scripts rather than through the dispatch
route.

**Chosen:** `POST /stages/:stageId/rounds/:index/open` (A-13) now flips the
tournament from `REGISTRATION` to `RUNNING` in the same transaction as the
round's `NOT_OPENED` → `OPEN` write, the first time it happens. Opening a
round is already the one explicit admin action that starts scheduling
matches (A-13's whole point); there is no other natural trigger in the spec,
and E-7 already frames "before round 1 is opened" as the one pre-tournament
state.

Verified against real Neon: a fresh tournament stays `REGISTRATION` through
creation and team sign-up, flips to `RUNNING` on its first round-open call
(confirmed by direct query), and a second open call on an already-open round
is a no-op (idempotent, matches `openRound()`'s existing contract).

**Revisit when:** a stage kind needs its own start condition (unlikely —
group stages create Round 1 the same `NOT_OPENED` way).

---

## D13 — Push notifications: Expo's HTTP endpoint, not expo-server-sdk; permission asked for at join, not sign-up

Phase 5 (U-15..U-17, A-17), built mirroring astra-app's own push implementation
(docs/ARCHITECTURE.md already named the mechanism; this just built it):

- **Transport**: a hand-rolled `fetch` to `https://exp.host/--/api/v2/push/send`
  (`apps/web/lib/push.ts`), not the `expo-server-sdk` package — one HTTP call,
  no dependency, same as astra. Chunked by 100 tokens per Expo's own limit.
- **Intent → audience**: `transition()` already emits a pure `NotifyIntent[]`
  (who to tell, not how) — `apps/web/lib/notify.ts` is the one place that
  turns that into an actual token list and a push, so every route that calls
  `transition()` (report/confirm/reject/resolve/assign-table) reaches the
  same copy and the same audience resolution. The automatic dispatch pass
  (`lib/dispatch.ts`) doesn't go through `transition()` for its table
  assignment (no staff actor behind an automated pass), so it constructs the
  same `youre_up` intent by hand rather than duplicating the send logic.
- **Mobile**: `expo-notifications`/`expo-device` loaded lazily inside
  `registerForPush()` (`apps/mobile/lib/push.ts`), matching astra — a dev
  client built before these were added must not crash on boot, only no-op
  until rebuilt. Verified on-device: the current (pre-rebuild) simulator dev
  client boots cleanly despite the native module not being compiled in yet.

**Where permission gets requested — corrected mid-build.** The first pass
called `registerForPush()` from the root layout whenever `signedIn` became
true, which fires at fresh registration — i.e. before the user has done
anything, exactly what this repo's own `docs/APP_STORE_COMPLIANCE.md` push
section says not to do ("not on first launch before the user has done
anything... right after joining a tournament, framed as 'know when your
table's ready'"). Moved the call to `HomeScreen`'s `join()` handler, right
after `api.join()` succeeds — the first moment in the app there's actually
something worth paging the player about. A returning user whose permission
is already granted sees no new prompt either way (`getPermissionsAsync()`
short-circuits before `requestPermissionsAsync()`), so this only changes
when the _first-ever_ prompt appears.

**Not solved**: a device that reinstalls or has its token rotated without
ever joining a new tournament in that session stops receiving pushes
silently — nothing re-registers its token outside the join flow. Rare
enough (and safe enough — no compliance risk either way) not to build a
second call site for yet.

**Revisit when:** a real device build with APNs credentials exists — nothing
here has been verified past Expo's HTTP endpoint accepting/rejecting the
send; actual delivery to a phone needs `eas credentials` set up with a real
Apple Developer APNs key, which is a user action, not a code one.

---

## D14 — Chat/moderation shipped function-first; a real bug found doing it

Phase 6, built the same session the user explicitly asked for backend/
function completeness first and design second ("finish everything function/
backend wise" — visual direction to be described separately, later). The
mobile chat screen (`app/(tabs)/chat.tsx`) is therefore deliberately plain:
this app's existing tokens reused as-is, no new visual language attempted.
Revisit once the user has actually described what "right" looks like — see
the conversation this decision came from, not repeated here.

**A real bug found while verifying this phase, not a design one**: the
lazy-import pattern `apps/mobile/lib/push.ts` uses for `expo-notifications`
(`await import("expo-notifications")` inside a `try/catch`, exactly
astra-app's own pattern, meant to no-op gracefully on a dev client built
before the plugin existed) does **not** actually protect against the
failure it was written for, at least under Metro's dev bundling. Calling
`registerForPush()` on a dev client without the native module compiled in
crashed with an _uncaught_ `Cannot find native module 'ExpoPushTokenManager'`
— the `try/catch` never saw it. The stack trace shows why: the throw
happens at **module evaluation time**, inside `PushTokenManager.native.js`'s
top-level code, not inside any function my code calls. Metro does not do
true lazy code-splitting for a dynamic `import()` the way a bundler like
webpack does — the imported module's top-level code runs when the bundle
loads, not when the `import()` call is awaited, so by the time
`registerForPush()` runs, the module has already thrown, outside every
`try/catch` in reach.

**Chosen**: don't try to out-clever this with a different JS-level guard —
the actual fix is what the plugin declaration in `app.config.ts` already
implied was needed: a real native rebuild (`expo run:ios`) so the module
genuinely exists. That's the only state this app should ship in anyway;
the lazy-import pattern is worth keeping as a safety net for exactly the
dev-loop gap it was designed for (JS reloads instantly, a native rebuild
doesn't, so there's a real window after adding a native plugin where a
stale dev client is still running) — it just cannot be trusted as the
_only_ protection, and does not remove the need to actually rebuild.

**Revisit when**: if this resurfaces after a real native rebuild, the
lazy-import pattern itself needs rethinking (e.g. checking for the native
module's existence some other way before touching the API surface that
transitively imports it) — but that hasn't been necessary here; the
rebuild resolved it.

---

## D15 — Billing and venue onboarding cut from scope; apps/web being rebuilt from scratch

User call, 2026-09-10: no Stripe billing, no self-serve venue onboarding
flow — venues stay manually provisioned (as every venue in this repo has
been all along) until explicitly told otherwise. The original "sell/license
this to bars" framing from the start of the project doesn't currently need
either built.

Separately: `apps/web` is being rebuilt from scratch starting 2026-09-11
(Friday) — direction to be decided in that conversation, not this one nor
anything before it. Until that conversation happens, don't build anything
new against the current `apps/web`, and don't assume its current shape
(routes, structure, or design) survives.

**Revisit when:** the 2026-09-11 conversation happens — this entry should
be superseded by whatever comes out of it, not left standing alongside it.
