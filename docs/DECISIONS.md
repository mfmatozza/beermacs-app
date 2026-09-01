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
