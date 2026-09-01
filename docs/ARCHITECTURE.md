# Architecture

## The rule that shapes everything

Tournament logic lives in `packages/shared` as pure functions, and nothing in
there imports React or Supabase.

That constraint exists because the same rules have to run in three places and
agree in all of them: the app renders them, Postgres functions enforce them, and
`node --test` exercises them. The old web app put its rules in a React hook and
its permissions in a modal, which meant "both teams must approve the result" was
a promise the UI made and the API happily ignored — every RLS policy was
`USING (true)`, so a losing captain could have set `winner_id` from the console.

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

## Not built yet

`packages/db` is the slot for the Supabase project: schema, RLS and the
generated types. It does not exist yet because the project does not. Until then
`apps/mobile/lib/fixtures.ts` stands in, typed against `@beermacs/shared` so the
screens do not move when the real queries land. See [ROADMAP.md](ROADMAP.md).
