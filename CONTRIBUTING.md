# Contributing

## Conventions

- **Prettier decides formatting.** Double quotes, semicolons, 100 columns,
  `es5` trailing commas. Run `npm run format` before pushing; don't argue with
  it in review.
- **TypeScript is strict**, including `noUncheckedIndexedAccess`. If an index
  access needs a guard, write the guard — that rule is why `planRoundOne` checks
  its pairs instead of dereferencing `undefined.id` the way the old app did.
- **`any` is an ESLint error**, not a warning.
- **Naming**: `components/` is PascalCase and default-exports one component per
  file. `lib/` is kebab-case. Packages are `@beermacs/*`.

## Where code goes

Anything that is a _rule_ — who may confirm a result, which match gets the next
free table, how a round advances — goes in `packages/shared` as a pure function
with a test. Not in a component, and not in a hook.

A rule that lives in a screen is a rule the server does not enforce.

## Before opening a PR

```sh
npm run format && npm run lint && npm run typecheck && npm run test
```
