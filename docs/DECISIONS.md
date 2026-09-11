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

---

## D16 — Home rebuilt around "am I in a tournament", per beermacs-claude-code-prompt.md

The old Home (venue picker + news feed + "type the code") assumed browsing
for a bar; the new spec (`~/Downloads/beermacs-claude-code-prompt.md`, handed
over 2026-09-10) is explicit that a player already knows which bar they're
in and Home's only jobs are: get into a tournament, then show what's
happening in it. Rebuilt `HomeScreen.tsx` around three states —
not-in-anything (code entry), joined-but-no-team (create/join team), and
active (NextUpCard + quick links + invite code) — and deleted
`VenuePicker`/`NewsFeed`/`VenueList`/`lib/fixtures.ts`, none of which had any
other caller once Home stopped using them.

**"Joined but no team" has no server row.** `/api/tournaments/join` only
grants a `VenueMembership` (see that route's own header comment) — team
formation is a separate step, and a player can force-quit between the two.
Rather than add a schema just to represent a transient client-side waiting
room, this is a Zustand store persisted to `expo-secure-store`
(`lib/pending-tournament.ts`) — already a dependency, via the auth session —
keyed off nothing from the server. Home revalidates it against the public
board endpoint on every mount (tournament could have ended, or been
canceled, between joining and forming a team) and drops it silently if
stale, rather than surfacing a dead-end error.

**Deep link built, QR deferred.** U-3 asks for three join methods: numeric
code, QR scan, and a link. The link (`app/join/[code].tsx`, scheme
`beermacs://join/<code>`) needed nothing beyond a new expo-router file — the
scheme is already registered and the route calls the exact same join hook
the code box uses. QR needs `expo-camera`, which isn't a dependency yet, and
adding it means another native rebuild (same category of change as the push
notifications work earlier this session — see the "lazy-import" entry
above). Not done in this pass; the numeric code and the link cover joining
today, and QR is additive once that rebuild happens.

**Also added while touching this path**: `Team.joinCode` is now returned by
`GET /api/me` (it wasn't selected before) and shown on Home's active state
so a captain can read it aloud or show the screen — the only way a
teammate's "join a team" code was reachable before was the create-team
response, which is gone the moment the screen unmounts.

**Not done in this pass** (still open from the spec): sign-in/sign-up
redesign (password show/hide, forgot-password, phone country-code split),
server-side email hardening (normalization/verification/rate-limiting),
Profile screen redesign, bottom-nav audit, team-size capping, and the
spec's ~19 test scenarios. Functional/backend gaps (tournament ending, team
join codes) were prioritized first per the standing instruction to finish
function before visual polish.

**Revisit when:** `expo-camera` is added for QR — at that point fold it into
the same join flow `use-join-tournament.ts` already centralizes, don't
build a second parallel join path.

---

## D17 — Sign-in/sign-up rebuilt: show/hide password, confirm password, phone country-code split, forgot/reset password

Second item off `beermacs-claude-code-prompt.md`'s list, same session as D16.
All in `RegisterScreen.tsx` since it already owned the register/signin mode
toggle — forgot/reset became two more modes of the same screen rather than
new routes, for a reason worth recording: **RootLayout renders this screen
INSTEAD of `<Stack>` while signed out** (`{signedIn ? <Stack /> : <RegisterScreen />}`
in `app/_layout.tsx`), so a `beermacs://reset-password` link tapped by a
signed-out user — the only user who'd ever tap one — has no mounted Stack
for expo-router to navigate into. `app/join/[code].tsx` (D16) gets away with
being a real route because joining assumes you're already signed in; a
password reset is the one flow that's inherently signed-out, so it can't
use the same pattern.

**Fix**: `RegisterScreen` listens for that link itself, with `expo-linking`'s
`getInitialURL`/`addEventListener('url', ...)` directly rather than through
expo-router navigation, and switches its own local `mode` state to `"reset"`.
Self-contained and works regardless of whether a Stack exists.

**Forgot-password needed an email to actually send** — nothing in this app
sends email yet. Added `apps/web/lib/email.ts`, a thin wrapper around
Resend's HTTP API (no SDK — same reasoning as `lib/push.ts`'s raw fetch to
Expo), wired into `emailAndPassword.sendResetPassword` in `lib/auth.ts`.
**Gated on `RESEND_API_KEY`, which is not set anywhere yet** — without it,
`sendEmail` logs the reset link to the server console instead of sending,
so the flow is fully testable in dev with zero setup, but nothing reaches a
real inbox until that key exists as a Vercel env var. Verified live against
the dev server: `POST /api/auth/request-password-reset` with an unknown
email correctly hits Better Auth's timing-attack-safe not-found branch and
returns 200 without calling `sendEmail` — the code path for a real user
wasn't exercised against a live inbox for the same reason (no key yet).

**Phone country-code picker** (`lib/country-codes.ts` +
`CountryCodePicker.tsx`) is a curated ~49-country list (Italy first — this
app's home market — then the rest of the EU, then everywhere large enough
to matter), not every ISO code; searchable by name or dial code, as the
spec asked. Stored phone is still just `dial + digits` concatenated — the
server-side `phone` field (`registerInput`) is unchanged, still a loose
`min(4).max(24)` string (see its own comment on why: no OTP exists to
validate against). The picker only changes *how* it's typed, not what's
validated.

**Not done in this pass**: server-side email hardening (normalization
beyond the schema's existing `.trim().toLowerCase()`, duplicate-account
prevention via normalized comparison, registration/resend cooldowns, rate
limiting) — `registerInput`'s email schema already lowercases/trims, so
duplicate detection is already normalized-comparison in practice (Postgres
unique constraint on the lowercased value), but no rate limiting exists
anywhere in this app yet, for any endpoint. Profile screen redesign, bottom
nav audit, and the spec's test scenarios are also still open.

**Revisit when**: `RESEND_API_KEY` is set in Vercel — nothing else needs to
change for reset emails to start actually sending.

---

## D18 — Profile rebuilt; History goes from permanent placeholder to real data; notification preferences wired end-to-end

Third item off `beermacs-claude-code-prompt.md`. Three things landed together
because they share data:

**History (`app/(tabs)/history.tsx`)** was a permanent `ComingSoon` naming a
specific blocker: "needs tournaments to be archived rather than deleted —
the original app wiped its tables." That blocker is gone — tournaments now
reach `COMPLETE` and stay (D16's `/api/tournaments/:id/end`) — so this reads
real rows from a new `GET /api/me/history`. **Deliberately shows a W-L
record, not a claimed placement** ("you finished 2nd"): computing a real
final standing generically across `single_elimination`,
`group_then_knockout`, and `triangular` means walking each format's own
bracket shape to find "the final," and getting that wrong would show a
player a made-up result. A confirmed-match win/loss count is something this
route can state correctly for any format; that's the line drawn for this
pass.

**Profile** (`ProfileScreen.tsx`) gained: an avatar (initials, no photo
upload — not asked for), inline name/phone editing via
`authClient.updateUser` (works against the existing `additionalFields` with
no new server code — see its own comment on why the payload is built as a
variable, same TS workaround as `RegisterScreen`'s `signUp.email` call),
an email-verified/unverified badge with a "Verify email" action (reuses
D17's Resend wrapper — `emailAndPassword.sendVerificationEmail` is now
wired the same way `sendResetPassword` is, same `RESEND_API_KEY` gate),
tournament/win/loss stat boxes (aggregated client-side from the same
history call, not a second endpoint), a change-password form
(`authClient.changePassword`), and the existing sign-out/delete-account
kept as-is.

**Notification preferences turned out to be half-built already.**
`Device.preferences: Json` existed from Phase 5 with a doc comment
describing exactly this ("per-category opt-outs... a player who mutes
announcements must still get 'you're up'") but nothing ever read it — every
push in `lib/notify.ts` went to every registered device regardless. Added
`PushCategory` ("match" | "news"), threaded it through every
`tokensForTeams`/`tokensForUsers`/`tokensForTournamentPlayers` call site
(staff dispute pushes stay uncategorized on purpose — see the function's own
comment), and added `GET`/`PATCH /api/push/preferences`, which — because
preference lives per-device, not per-user — applies a PATCH to every device
row the viewer currently has. A device that registers later (reinstall, new
phone) starts back at all-enabled; that's the existing `@default("{}")`
behavior, not a new gap.

**Verified live against the dev server**, not just typechecked: registered
a throwaway account, confirmed `GET /api/me` returns `emailVerified`,
`GET /api/me/history` returns `{entries: []}` for a brand-new account,
`GET/PATCH /api/push/preferences` round-trips correctly with zero devices
registered (the PATCH is a no-op transaction over an empty list, not an
error), and `POST /api/auth/request-password-reset` produced the
`[email:dev-fallback]` console line from D17. Deleted the test account
afterward — nothing left in the real database from this check.

**Not done in this pass**: bottom-nav audit and the spec's test scenarios
are what's left of the original checklist.

---

## D19 — Email verification reverted; profile picture added

User call, 2026-09-10, right after D18 shipped: no email verification.
Removed everything D18 added for it — the verified/unverified badge and
"Verify email" button in `ProfileScreen.tsx`, `emailVerification.sendVerificationEmail`
in `lib/auth.ts`, and `emailVerified` from `Viewer`/`GET /api/me`. Back to
D10/D11's original stance with nothing left over. The `sendEmail` wrapper
and `RESEND_API_KEY` gate (D17) stay — the reset-password flow still needs
them.

**Profile picture**, same request. `User.image` already existed (Better
Auth's default field, previously unused). Stored as a **data URI directly
in that column**, not in an object store: this app has no blob storage
provisioned, and provisioning one (Vercel Blob, to match "Vercel+Neon
only") is a setup step nobody's taken yet — same category of gap as
`RESEND_API_KEY`. Rather than block the feature on that, the photo is
cropped square and JPEG-compressed to `quality: 0.5` on-device
(`expo-image-picker`'s own editor) before it ever leaves the phone, capped
at ~2.2MB encoded server-side (`updateAvatarInput`). Real, working today;
swapping in a blob store later only changes what URL ends up in `image`,
nothing about the client contract.

**Added `expo-image-picker`** — a new native module, so this needed the
same category of step as the push-notification work: `app.config.ts` plugin
declaration (with the required `NSPhotoLibraryUsageDescription` string) and
an `expo run:ios --device` rebuild. Ran that rebuild as part of this change;
see the build log if this note is being read before it finished.

**Verified end-to-end against the dev server**: registered a throwaway
account, `PUT /api/me/avatar` with a real (tiny) PNG data URI, confirmed
`GET /api/me` reflects it, `DELETE /api/me/avatar` clears it back to `null`,
deleted the test account after.

---

## D20 — Every network call in RegisterScreen/ProfileScreen now times out and surfaces an explicit error

Direct feedback, 2026-09-11: a TestFlight tester hit "stuck on loading"
after tapping sign-up, with no error shown. Traced it: production's
`/api/auth/sign-up/email` itself responds fine and fast (verified directly),
and no sign-up request reached the database in the relevant window — so the
request died somewhere on the device/network without ever resolving. The
code had no defense against exactly that: every `authClient.*` call in
`RegisterScreen.tsx` and `ProfileScreen.tsx` was `await`ed directly, with no
timeout and (for several of them) no try/catch, so a hung promise left
`busy` true forever — an infinite spinner with no way out.

`use-app-boot.ts` already had this exact pattern solved for the boot
sequence (`timing.bootTimeoutMs`, "never hang on boot") — this extends the
same idea to every later network action instead of just the first one.
Added `lib/with-timeout.ts` (`withTimeout`, `networkErrorMessage`) and wired
it into every branch of `RegisterScreen`'s `submit` (sign-in, forgot,
reset, register), `ProfileScreen`'s profile-save, change-password,
delete-account, and sign-out, and `lib/api.ts`'s shared `request()` (so
every plain `api.*` call — join, create/join team, report a result, etc. —
gets the same protection for free). Sign-out clears local session state
even if the server call itself times out, since "sign me out" shouldn't be
able to leave someone stuck signed in.

**Not yet confirmed as THE root cause** of the reported hang — could still
be a real network condition (bad wifi, a captive portal) that this doesn't
fix so much as make visible. But the missing timeout/error-handling was a
real, independently worth-fixing gap regardless of whether it explains this
specific report, and now every one of these screens fails loud instead of
silent.

---

## D21 — Root cause found: every TestFlight build was silently pointed at a developer's home LAN IP

The real bug behind D20's "stuck on loading" reports (build after build,
sign-in AND sign-up, still failing after the timeout fix landed). Traced by
checking Vercel's request logs directly during a live failed attempt: zero
requests arrived — not a slow response, not a 500, *nothing reached
Vercel's edge at all*. That ruled out the backend entirely and pointed at
the request never leaving the device.

`apps/mobile/lib/config.ts` has always preferred `EXPO_PUBLIC_API_URL`
(from `apps/mobile/.env.local`, gitignored) over `app.config.ts`'s
per-profile `extra.apiUrl`, specifically so local dev-client iteration can
repoint the API without a native rebuild. `.env.local` on this machine holds
`EXPO_PUBLIC_API_URL=http://10.37.0.82:3000` — this developer's home LAN
IP, plain HTTP, for talking to a locally-run `apps/web`.

The leak: `.easignore`'s mere presence makes EAS Build ignore `.gitignore`
**entirely** for archiving — it only excluded `apps/mobile/.env`, not
`.env.local`. So every `eas build --profile production` uploaded
`.env.local` right along with the rest of the project, Metro inlined
`EXPO_PUBLIC_API_URL` into the release JS bundle at build time exactly as
it would in dev, and **every TestFlight build since this app existed has
shipped hardwired to a private IP unreachable from any network but this
one** — explaining "works on simulator" (shares the Mac's network stack)
vs. every real-device failure, and why the symptom reads as a hang: a
packet to an unreachable RFC1918 address from an outside network typically
gets silently dropped rather than instantly refused, so the OS's own
connect timeout (tens of seconds) fires before anything else does.

**Fixed in two independent places**, deliberately not just one:
- `.easignore`: `apps/mobile/.env` widened to `apps/mobile/.env*`, so no
  local env file of any kind can ride along into a cloud build again.
- `lib/config.ts`: `EXPO_PUBLIC_API_URL` is now only honored when
  `__DEV__` is true. `.easignore` stops the leak at the source; `__DEV__`
  means a *future* leak of the same shape still can't redirect a release
  build, since `__DEV__` is false in every EAS build profile regardless of
  what env files happen to be present.

**Revisit when**: never, ideally — but if a build ever again silently fails
to reach the API, check `vercel logs` FIRST (whether the request arrived at
all) before assuming it's a backend bug, exactly what should have narrowed
this down faster.
