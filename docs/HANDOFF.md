# Handoff — where things stand (2026-09-18)

Written because the machine this was built on is being sold. Full decision
history is in `docs/DECISIONS.md` (D1–D27) — this file is just "what's live,
what's pending, what you need to know before touching it again."

## Where things actually are right now

- **Build #11** is the current submission — includes everything: mobile
  admin fixes, the full error-message audit, the support inbox, and
  `app.beermacs.com` as the production API URL. It's `FINISHED` on EAS and
  was submitted to App Store Connect; check
  https://appstoreconnect.apple.com/apps/6810998044/testflight/ios for
  Apple's processing status.
- **App Store Connect submission is NOT finished** — the copy, screenshots,
  and App Review notes below were drafted and verified but never actually
  pasted into ASC and submitted for review. That's the next real step.
- **Production domain**: `https://app.beermacs.com` — live, verified SSL,
  confirmed serving `/`, `/privacy`, `/terms`, `/support` correctly. The old
  `beermacs-app.vercel.app` still works too (Vercel keeps both live) but
  the app itself now points at the real domain.
- **Admin login is fixed and confirmed working in production** as of this
  session — it was completely broken before (`ADMIN_USERNAME`/`ADMIN_EMAIL`/
  `ADMIN_PASSWORD_HASH` were never set on Vercel, a gap that had existed
  since the admin console was built and never caught because it was only
  ever tested locally). 2FA is now **off** in production (`ADMIN_2FA_ENABLED=
  false`) at the user's explicit request — re-enable once `RESEND_API_KEY`
  is actually configured (see Known gaps below), otherwise the OTP email
  never sends and locks the admin out.

## Credentials

- **Platform admin** (`https://app.beermacs.com/admin`): `admin` /
  `G7xMT8UxdwSZto_-`
- **App Review demo account** (for Apple, or for testing): `review@beermacs.com`
  / `AppleReview2026!` — on team "The Reviewers" in a live, running
  tournament "Porter House Open" (vs "House Team", on Table 1 at Porter
  House). Also has venue-owner access, so it can reach `/admin` in the
  mobile app too. Deliberately real and honestly-named (not joke data) —
  this one is meant to stay, unlike the elaborate screenshot-only bracket
  that was seeded and deleted this session.

## App Store Connect — copy ready to paste

- Name: `Beermacs` · Subtitle: `Beer pong tournaments, live`
- Category: Sports (primary) / Social Networking (secondary)
- Privacy Policy: `https://app.beermacs.com/privacy`
- Support URL: `https://app.beermacs.com/support`
- Marketing URL: `https://app.beermacs.com`
- Promotional text, full description, keywords, age-rating guidance
  (alcohol-reference questionnaire answer), and the App Review notes
  (pointing at the demo account above) were all drafted earlier in this
  conversation — if that conversation isn't available, ask for a fresh
  draft; the app itself hasn't changed shape since, so the same content
  still applies.
- **Screenshots**: `~/Desktop/beermacs-app-store-screenshots/` — three
  shots (Home, Bracket, Chat), all real populated data, resized to
  1284×2778 (one of Apple's accepted exact sizes for the "6.5-inch
  Display" slot — the native iPhone 17 Pro Max simulator resolution,
  1320×2868, is NOT an accepted size and gets rejected by ASC's upload
  validator).

## Known gaps, deliberately not fixed this session

- **No transactional email provider configured** (`RESEND_API_KEY` unset in
  production) — `lib/email.ts` falls back to logging the email to the
  server console instead of sending it. This silently breaks: forgot-
  password emails, and the admin 2FA OTP if `ADMIN_2FA_ENABLED` is ever set
  back to `true` without fixing this first. Needs a real Resend account +
  verified sending domain.
- **Two stray empty Vercel projects** exist as collateral damage from a
  Vercel CLI scope mixup this session: one called `web` (created under
  whatever scope was active at the time) and one called `beermacs-app`
  under the `astra-bocconi` team (a completely different account/team than
  the real one). Both are empty, unused, harmless — delete them from the
  Vercel dashboard whenever, or ignore them.
- **The Vercel CLI's authenticated session on this machine ended up scoped
  to `astra-bocconi`**, not the account that actually owns the real
  `beermacs-app` project — `vercel teams ls` only shows `astra-bocconi`
  from that login. On a new machine, just `vercel login` fresh with
  whichever account owns `beermacs-app` (the one with `orgId
  team_8p6bEVi9zGDweBscLWzinda8` per `.vercel/project.json` history) and
  this won't recur.
- **`docs/DECISIONS.md`'s D-numbering has a gap** — this session's entries
  are D26, D26.1, D26.2, D27. Nothing missing, just noting the scheme in
  case a future session wonders.

## Project shape, if this is a genuinely fresh start

Monorepo: `apps/web` (Next.js — admin console + marketing/legal pages,
Vercel+Neon), `apps/mobile` (Expo/React Native, EAS Build/Submit),
`packages/db` (Prisma), `packages/shared` (Zod schemas + pure domain logic
used by both apps). Never Supabase. See `docs/ARCHITECTURE.md` and
`docs/ROADMAP.md` for the actual spec/build history predating this
session's work, and `docs/APP_STORE_COMPLIANCE.md` for the guideline-by-
guideline compliance notes this session's fixes fed into.
