// POST /api/admin/auth/login — step 1 of the platform admin's 2FA sign-in
// (see lib/admin-auth.ts's own header comment for why this is a wholly
// separate login from every other account in this app).
//
// On a correct username+password: if 2FA is enabled (production, by
// default), emails a fresh OTP and responds {needsOtp: true} — the browser
// then calls .../verify. If 2FA is off (local dev, by default), issues the
// session cookie directly.

import { adminLoginInput } from "@beermacs/shared";
import { NextResponse } from "next/server";
import {
  admin2faEnabled,
  adminConfigured,
  issueAdminOtp,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { ADMIN_COOKIE_MAX_AGE_SECONDS, ADMIN_COOKIE_NAME, createAdminSessionCookieValue } from "@/lib/admin-session";
import { handleError, parseBody } from "@/lib/http";
import { HttpError } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!adminConfigured()) throw new HttpError(503, "admin_not_configured");
    const body = await parseBody(req, adminLoginInput);

    if (!verifyAdminCredentials(body.username, body.password)) {
      throw new HttpError(401, "invalid_credentials");
    }

    if (!admin2faEnabled()) {
      const res = NextResponse.json({ needsOtp: false });
      res.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionCookieValue(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
        path: "/",
      });
      return res;
    }

    await issueAdminOtp();
    return NextResponse.json({ needsOtp: true });
  } catch (e) {
    return handleError(e);
  }
}
