// Single-admin 2FA login. SERVER-ONLY.
//
// Beermacs has ONE central platform admin, separate from the per-venue
// PLAYER/VENUE_STAFF/VENUE_ADMIN/VENUE_OWNER roles (VenueMembership) — none
// of those roles should be able to grant venue access to other accounts or
// edit the marketing site, and this account isn't even a `User` row, so
// there's no venue-role check that could accidentally cover it either. It
// signs in with username + password (env, never in the DB) and then a
// 6-digit OTP emailed via the same Resend wrapper the reset-password flow
// uses (lib/email.ts) — two factors, reusing infrastructure this app
// already has rather than adding a second email pipe.
//
// Setup: run `node scripts/create-admin.mjs <username> <email> [password]`
// to generate the three env vars below, then set them on Vercel.
//
//   ADMIN_USERNAME       — the login username
//   ADMIN_EMAIL          — where the OTP is sent
//   ADMIN_PASSWORD_HASH  — scrypt hash (salt:hash) of the password

import crypto from "node:crypto";
import { prisma } from "@beermacs/db";
import { sendEmail } from "./email";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_IDENTIFIER = "beermacs-admin-2fa";

/** OTP second factor: ON in production, OFF locally (usable without an
 *  inbox during dev). Override explicitly with ADMIN_2FA_ENABLED=true|false. */
export function admin2faEnabled(): boolean {
  if (process.env.ADMIN_2FA_ENABLED != null) return process.env.ADMIN_2FA_ENABLED === "true";
  return process.env.NODE_ENV === "production";
}

export function adminConfigured(): boolean {
  return Boolean(ADMIN_USERNAME && ADMIN_EMAIL && ADMIN_PASSWORD_HASH);
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  const known = Buffer.from(hash, "hex");
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

/** Constant-shape username check + scrypt password verify. */
export function verifyAdminCredentials(username: string, password: string): boolean {
  if (!adminConfigured()) return false;
  if (username.trim().toLowerCase() !== ADMIN_USERNAME!.trim().toLowerCase()) return false;
  return verifyPassword(password, ADMIN_PASSWORD_HASH!);
}

/** name@host → n•••@host, for a "code sent to …" hint without leaking the address. */
export function maskEmail(email: string): string {
  const [local, host] = email.split("@");
  if (!local || !host) return "your email";
  return `${local.slice(0, 1)}${"•".repeat(Math.max(1, local.length - 1))}@${host}`;
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Generates, stores (hashed), and emails a fresh OTP — replacing any pending one. */
export async function issueAdminOtp(): Promise<void> {
  const otp = generateOtp();
  await prisma.verification.deleteMany({ where: { identifier: OTP_IDENTIFIER } });
  await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: OTP_IDENTIFIER,
      value: hashOtp(otp),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  await sendEmail({
    to: ADMIN_EMAIL!,
    subject: "Your Beermacs admin sign-in code",
    html: `<p>Your code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p><p>Expires in 10 minutes.</p>`,
  });
}

/** Verify + single-use consume the pending OTP. */
export async function consumeAdminOtp(otp: string): Promise<boolean> {
  const rec = await prisma.verification.findFirst({
    where: { identifier: OTP_IDENTIFIER },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return false;
  if (rec.expiresAt < new Date()) {
    await prisma.verification.deleteMany({ where: { identifier: OTP_IDENTIFIER } });
    return false;
  }
  const expected = Buffer.from(rec.value);
  const got = Buffer.from(hashOtp(otp));
  const ok = expected.length === got.length && crypto.timingSafeEqual(expected, got);
  if (ok) await prisma.verification.deleteMany({ where: { identifier: OTP_IDENTIFIER } });
  return ok;
}
