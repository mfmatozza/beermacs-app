// Better Auth server instance.
//
// SERVER-ONLY. Never import from a client component.
//
// One door in, per docs/DECISIONS.md D10: every account — player or staff —
// registers with email + password + phone. Phone is stored contact data
// (G-2/A-21), never a second factor; there is no SMS OTP anywhere in this app.
// The earlier anonymous-player / staff-only-email split (D3, then D9) is
// fully retired, not just unrouted — the plugin is gone.
//
// The `bearer` plugin lets the mobile app authenticate with
// `Authorization: Bearer <token>` instead of cookies, which is what
// @better-auth/expo stores.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { prisma } from "@beermacs/db";

if (!process.env.BETTER_AUTH_SECRET) {
  // Fail loudly at import rather than issuing tokens signed with a default.
  throw new Error("BETTER_AUTH_SECRET is not set. See apps/web/.env.example.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  // The mobile app's scheme, so Better Auth accepts its redirects.
  trustedOrigins: ["beermacs://", "beermacs://*"],

  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 10,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      // The app shows `displayName`; Better Auth only knows about `name`.
      displayName: { type: "string", required: true, input: true },
      // G-1: mandatory for every account, not just staff. Stored as data
      // (A-21), never used to authenticate — see the module doc above.
      phone: { type: "string", required: true, input: true },
    },
    // App Store guideline 5.1.1(v): account deletion must be reachable INSIDE
    // the app, not "email us." This is that mechanism — DELETE /api/auth/
    // delete-user, called from the Profile screen. No re-verification email:
    // we don't require email verification anywhere else either, so gating
    // deletion behind one would be a worse experience than the rest of the
    // app for no real safety gain (the session itself is the proof of
    // identity; Better Auth still asks for the current password by default
    // when one is set).
    deleteUser: {
      enabled: true,
    },
  },

  plugins: [bearer(), expo()],
});

export type Auth = typeof auth;
