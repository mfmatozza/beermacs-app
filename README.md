# Beermacs

Beer pong tournament software for bars. A monorepo: an Expo app for phones,
with the tournament rules in a shared package so the app and the database
enforce the same ones.

Replaces [beermacs.com](https://beermacs.com), a single-tenant Vite app that ran
one bar's tournament with the admin password hard-coded in the client bundle.
Nothing is ported from it except the bracket format, which is the good part.

## Layout

```
apps/
  mobile/            Expo Router app (iOS + Android). Staff, captains and
                     spectators in one binary, routes gated by role.
  web/               Next.js App Router. Marketing site now; venue signup,
                     billing and the big-screen bracket later.
packages/
  config/            shared ESLint / Prettier / TypeScript base config
  shared/            tournament rules + Zod schemas. No React, no database.
docs/                architecture, setup, roadmap
```

## Getting started

```sh
npm install
npm run typecheck && npm run test
cd apps/mobile && npm run ios      # builds a dev client (Skia needs one)
```

`apps/mobile` cannot run in Expo Go — `@shopify/react-native-skia` is a native
module. See [docs/SETUP.md](docs/SETUP.md).

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Metro for the mobile app              |
| `npm run typecheck` | `tsc --noEmit` across every workspace |
| `npm run test`      | `node --test` over the shared package |
| `npm run lint`      | ESLint across every workspace         |
| `npm run format`    | Prettier, write mode                  |
