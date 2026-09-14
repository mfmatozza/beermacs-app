// POST /api/admin/auth/verify — step 2: the emailed OTP. See login/route.ts.

import { adminVerifyOtpInput } from "@beermacs/shared";
import { NextResponse } from "next/server";
import { consumeAdminOtp } from "@/lib/admin-auth";
import { ADMIN_COOKIE_MAX_AGE_SECONDS, ADMIN_COOKIE_NAME, createAdminSessionCookieValue } from "@/lib/admin-session";
import { handleError, parseBody } from "@/lib/http";
import { HttpError } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, adminVerifyOtpInput);
    const ok = await consumeAdminOtp(body.otp);
    if (!ok) throw new HttpError(401, "invalid_or_expired_code");

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionCookieValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
