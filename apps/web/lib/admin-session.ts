// The platform admin's own session — SERVER-ONLY, and deliberately NOT a
// Better Auth session: this account isn't a `User` row (see admin-auth.ts),
// so it needs its own cookie, not `requireViewer()`'s.
//
// A signed, stateless token rather than a DB-backed session table: there is
// exactly one admin, so there is nothing to look up or revoke-by-row that a
// short expiry doesn't already handle. Signed with BETTER_AUTH_SECRET —
// reusing the secret this app already treats as sensitive rather than
// introducing a second one to rotate and protect.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "./session";

const COOKIE_NAME = "beermacs_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set.");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminSessionCookieValue(): string {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token: string): boolean {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return false;
  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      exp: number;
    };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return Boolean(token && verifyToken(token));
}

/** Throws (via the caller's own handleError) style guard for /api/admin/*
 *  route handlers — mirrors requireViewer()'s shape so these routes read
 *  the same as every other guarded route in this app. */
export async function requireAdminApi(): Promise<void> {
  if (!(await isAdminSession())) throw new HttpError(401, "not_admin");
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
