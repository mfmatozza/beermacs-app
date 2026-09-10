# App Store compliance checklist

Written because the goal is explicit: pass review on the first submission.
Each item names the guideline it comes from and what specifically has to exist
in the app or in App Store Connect before submitting. Update this file as items
are done — don't let it go stale.

## The one most likely to cause a first-round rejection

**Reviewers cannot walk into a bar.** Every meaningful screen in this app is
reached by joining a real tournament at a real venue. If the reviewer's account
lands on an empty "search for a bar" screen with nothing to join, the app looks
non-functional and gets bounced (guideline 2.1).

**Required before submitting:** a permanent demo venue and a permanent, always-
open demo tournament, seeded in production, with:

- a join code that never expires and always has open slots
- a demo staff login (email + password) with `VENUE_OWNER` at that venue
- both credentials written into the App Store Connect **App Review
  Information → Notes** field, plus a one-line description of what to tap to
  see the admin console, the bracket, and a chat thread

This has to be seeded and verified _before_ the build is submitted, not added
after a rejection.

## Account & data

- [ ] **Guideline 5.1.1(v) — in-app account deletion.** Not "email us to
      delete your account" — a control inside the app (Profile tab) that
      actually deletes the account and its personal data. This is a hard
      requirement now that signup is mandatory (G-1), not a nice-to-have.
- [ ] **Privacy policy accuracy.** `apps/web/app/privacy` must say plainly:
      we collect email and phone at signup; venue admins can see a player's
      email/phone (A-21, to re-contact for future nights); how to delete an
      account. The current page still describes the old anonymous-first
      design — needs a rewrite alongside the registration screen.
- [ ] **App Privacy "nutrition label"** in App Store Connect must match the
      privacy policy exactly: Contact Info (email, phone) linked to identity,
      used for App Functionality — not for tracking, not for advertising.
- [ ] **No App Tracking Transparency prompt** — we don't track across apps/
      sites for ads, so no ATT entitlement, no prompt. If an analytics SDK is
      ever added, re-check this before it ships.
- [ ] **PrivacyInfo.xcprivacy** (privacy manifest) — required since native
      modules that touch "required-reason" APIs (e.g. `expo-secure-store`
      reading UserDefaults-equivalent storage) need a declared reason. Check
      this again after `expo-camera` is added — new native module, new manifest
      entries to verify.

## Sign-in

- [ ] **No Sign in with Apple needed** _as long as_ the only auth is our own
      email+password (D10). If a social login (Google/Facebook) is ever added,
      Sign in with Apple becomes mandatory in the same release (guideline 4.8)
      — don't ship one without the other.

## User-generated content (chat, U-8/U-9/U-10)

Guideline 1.2 requires all four of these before UGC can ship, not just some:

- [ ] A way to report objectionable content or a user, reachable from inside
      the chat screen itself.
- [ ] A way to block a user (at minimum: stop seeing their messages).
- [ ] Venue staff can remove content or mute a player in their own tournament
      (already the intended admin capability, U-10/A-20 — needs to actually be
      reachable from the chat UI, not just possible via the API).
- [ ] A published way to contact us about content — `apps/web/app/support`
      already exists; make sure it's linked from inside the chat screen too,
      not only from the marketing site.

## Content rating

- [ ] **Age rating.** Beer pong is inseparable from alcohol. Declare
      "Alcohol, Tobacco, or Drug Use — Simulated" honestly in App Store
      Connect rather than picking 4+; a rating that doesn't match the content
      is its own rejection reason.
- [ ] **Framing.** Marketing copy and in-app text should read as "tournament
      night organiser," not as an app that encourages drinking. No prize money,
      no wagering, no drinking-game mechanics beyond naming the sport — the
      moment the app touches entry fees or payouts it becomes a gambling/
      payments review problem in every jurisdiction it's sold into (unchanged
      from the very first plan's analysis of the old app).

## Payments (if a subscription ships before this app does)

- [ ] **In-app purchase vs. web billing.** The default Apple assumption for
      anything unlocking paid functionality is IAP and Apple's cut. The
      defensible path for B2B SaaS is: the _venue_ subscribes on the web
      (Stripe), the app is a client of an already-paid account, no purchase
      flow inside the app at all. Confirm this reading holds before building
      billing — it is a judgement call, not settled by writing it down here.

## Functional completeness (guideline 2.1)

- [ ] No placeholder screen should read as broken. The `ComingSoon` component
      already names the milestone rather than saying nothing — keep that
      pattern for anything still stubbed at submission time, and prefer
      finishing the feature over shipping the stub if there's a choice.
- [ ] Every screen reachable from the tab bar must do something real for the
      demo account above — a screen unreachable during review is functionally
      the same as a crash, from the reviewer's side.

## Push notifications

- [ ] Real APNs key uploaded to EAS credentials before the first build that
      requests notification permission — a push permission prompt that then
      fails silently in production reads as broken, even though it's invisible
      in TestFlight if the sandbox cert is used instead.
- [ ] Permission is requested at a point in the flow where its purpose is
      obvious (e.g. right after joining a tournament, framed as "know when
      your table's ready") — not on first launch before the user has done
      anything. Not an Apple requirement, but a rejection-adjacent bad review
      is still worth avoiding.

## Camera (once QR join / QR invite ships — U-1/U-3)

- [ ] `NSCameraUsageDescription` in `app.config.ts`, worded around what it's
      actually for ("scan a tournament or team QR code"), not a generic string.
- [ ] `expo-camera` added as a dependency — new native module, means another
      full simulator/device rebuild, not a JS-only change.
