# Architecture

## The rule that shapes everything

Tournament logic lives in `packages/shared` as pure functions, and nothing in
there imports React or a database client.

The same rules have to run in two places and agree in both: the mobile app
renders them, and the route handlers in `apps/web` enforce them. `node --test`
exercises the same code.

This matters more than it would on a client-accessible database. **The phone
holds no database credentials.** `DATABASE_URL` exists only in `apps/web` on
Vercel, so there is no client-to-Postgres connection and therefore no row-level
security to fall back on — the API layer _is_ the security boundary. The old web
app put its rules in a React hook and its permissions in a modal, which meant
"both teams must approve the result" was a promise the UI made and the database
happily ignored.

Concretely (rebuilt against `brand/beermacs-feature-spec.md` — see
docs/DECISIONS.md D9, which supersedes the earlier house-format description
this section used to have):

- `rounds.ts` — a round's own lifecycle. A round starts `not_opened`; opening
  one is an explicit admin action (A-13), and there is no `closed` state — the
  spec never asks a round to shut, and "no fixed cut-off" for adding teams
  (A-8) reads as "an open round stays a valid target forever." `RoundEntrant`
  rows (in `packages/db`) are how a team's membership in a round is recorded —
  explicitly, at the moment it happens (initial registration, a winner
  advancing, a repêchage draw) — never reconstructed after the fact from match
  history. `waitingTeams()` answers E-3's "who hasn't played yet in this round."
- `pairing.ts` — random pairing (E-1), a Fisher–Yates shuffle over whoever's
  waiting.
- `repechage.ts` — the loser pool, derived from match history the same way the
  old lucky-loser pool was (never stored, so it can't drift), plus drawing a
  team back in either automatically on an odd count (E-8) or by an admin's own
  choice at any time (A-9/A-10).
- `dispatcher.ts` — handing free tables to matches that already have both slots
  filled (E-2). Pairing brand-new matches out of a round's waiting pool is a
  separate step (`pairing.ts` + `rounds.ts`) — this module only ever assigns
  tables, which is what lets a manually-paired match (A-16) and a freshly
  auto-paired one queue for a table through the exact same path.
- `approval.ts` — the result state machine (U-11..14). `transition()` is the
  only way a match acquires a winner. It refuses to let the reporting team
  confirm its own report, treats silence as a dispute rather than as
  agreement, and lets staff force any transition (A-12) while flagging it
  `forced` so the caller must write an audit row. Score is optional — the spec
  only asks who won (U-11); a triangular or group format may not score at all.
- `join-code.ts` — Crockford Base32, so a code read aloud in a loud room
  survives the trip.

## Workspaces

| Package            | Role                                                   |
| ------------------ | ------------------------------------------------------ |
| `@beermacs/mobile` | Expo Router app. `app/` routes, `components/`, `lib/`. |
| `@beermacs/shared` | Rules + Zod schemas. The contract with the database.   |
| `@beermacs/config` | ESLint, Prettier and TypeScript base config.           |

## Mobile app conventions

- No `src/`. `app/` holds routes, `components/` holds PascalCase components,
  `lib/` holds kebab-case modules.
- Styling is NativeWind. Colours, fonts and spacing live in
  `tailwind.config.js`; `lib/theme.ts` holds only what cannot be a class —
  Skia's canvas colours and Reanimated's timings.
- Screens never compute bracket state. They call `@beermacs/shared`.

## Web app conventions

- `app/` is the App Router. `app/_ui/` holds primitives — kebab-case files,
  named exports — so they cannot be mistaken for routes.
- Tailwind 4, configured in `app/globals.css` via `@theme` rather than a
  `tailwind.config.js`. The palette mirrors `apps/mobile/tailwind.config.js`.
- The app is dark because it is used in a bar at 11pm. The site is light because
  it is read by a bar owner at a desk. Same palette, opposite ground.
- `apps/web` is excluded in `.easignore`: nothing in the mobile build graph
  depends on it, so EAS should not install its dependencies.

## Infrastructure

Everything runs on Vercel; Postgres is Neon, provisioned through Vercel Storage.

| Concern       | Choice                                                  |
| ------------- | ------------------------------------------------------- |
| Hosting + API | Vercel (`apps/web` route handlers)                      |
| Database      | Neon Postgres, pooled at runtime, direct for migrations |
| ORM           | Prisma 7 with the `@prisma/adapter-pg` driver adapter   |
| Push          | Expo push service, called from a route handler          |

There is no Supabase and no Firebase. One consequence is worth stating plainly:
the security model is _not_ row-level security. See above — authorisation is
server-side code in `apps/web`, calling `@beermacs/shared`.

The second consequence is **live updates**, which a client-connected database
would have given for free. See [ROADMAP.md](ROADMAP.md) — this is an open
decision, not a solved problem.

## Not built yet

`packages/db` has the schema and the Neon client, but no migration has been run
and there is no Neon project yet. Until there is, `apps/mobile/lib/fixtures.ts`
stands in, typed against `@beermacs/shared` so the screens do not move when the
real queries land. See [ROADMAP.md](ROADMAP.md).
