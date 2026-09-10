-- Nullable first: 14 existing Team rows have no code yet, backfilled by a
-- one-off script right after this deploys, then locked down by the next
-- migration. Splitting it this way (rather than a default expression) is
-- because the actual code generation — Crockford Base32, collision-checked
-- against the table — lives in TypeScript (join-code.ts), not SQL.
ALTER TABLE "Team" ADD COLUMN "joinCode" TEXT;
