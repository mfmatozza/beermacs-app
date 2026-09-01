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

Concretely:

- `bracket.ts` — the house format. Round one pairs in registration order (no
  shuffle), an odd count gives the last team a bye, rounds are generated one at
  a time, and losers drop into a pool staff can draw from to fill an odd slot.
- `approval.ts` — the result state machine. `transition()` is the only way a
  match acquires a winner. It refuses to let the reporting team confirm its own
  report, treats silence as a dispute rather than as agreement, and lets staff
  force any transition while flagging it `forced` so the caller must write an
  audit row.
- `dispatcher.ts` — table assignment. A bar has three tables and a bracket has
  sixteen matches; this is a constrained-resource queue, not a column.
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
