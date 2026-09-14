#!/usr/bin/env node
// Generate the Beermacs platform-admin credentials (env vars).
//
// Usage:
//   node scripts/create-admin.mjs <username> <email> [password]
//
// If no password is given, a strong one is generated and printed once. Copy
// the three lines into apps/web/.env (and the Vercel project env — mark
// ADMIN_PASSWORD_HASH "Sensitive" the same way BETTER_AUTH_SECRET is).

import crypto from "node:crypto";

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const [, , username, email, providedPassword] = process.argv;

if (!username || !email) {
  console.error("Usage: node scripts/create-admin.mjs <username> <email> [password]");
  process.exit(1);
}

const password = providedPassword ?? crypto.randomBytes(12).toString("base64url");
const hash = hashPassword(password);

console.log("\n# ── Beermacs admin credentials — add to apps/web/.env (and Vercel) ──");
console.log(`ADMIN_USERNAME="${username}"`);
console.log(`ADMIN_EMAIL="${email}"`);
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
if (!providedPassword) {
  console.log(`\n# Generated password (store in a password manager — shown ONCE):`);
  console.log(`#   ${password}`);
}
console.log("");
