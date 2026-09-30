// Better Auth server instance.
//
// SERVER-ONLY. Never import from a client component.
//
// One door in, per docs/DECISIONS.md D10: every account — player or staff —
// registers with email + password; phone is optional contact data (A-21) —
// App Review rejected build 11 for requiring it (5.1.1(v)). Never a second
// factor; there is no SMS OTP anywhere in this app.
// The earlier anonymous-player / staff-only-email split (D3, then D9) is
// fully retired, not just unrouted — the plugin is gone.
//
// The `bearer` plugin lets the mobile app authenticate with
// `Authorization: Bearer <token>` instead of cookies, which is what
// @better-auth/expo stores.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { prisma } from "@beermacs/db";
import { sendEmail } from "./email";
import { scrubUserPii } from "./users";

function buildAuth() {
  if (!process.env.BETTER_AUTH_SECRET) {
    // Fail loudly on first real use rather than issuing tokens signed with a
    // default. This must NOT throw at module import: Next collects page data
    // for /api/auth/[...all] at build time, before Vercel injects Sensitive-
    // typed env vars (those are runtime-only, withheld from the build step),
    // so an eager throw here would fail the build itself.
    throw new Error("BETTER_AUTH_SECRET is not set. See apps/web/.env.example.");
  }

  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: authBaseUrl(),

    // The mobile app's scheme, so Better Auth accepts its redirects.
    trustedOrigins: ["beermacs://", "beermacs://*"],

    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 10,
      requireEmailVerification: false,
      // `url` already carries the reset token as a query param and points at
      // Better Auth's own /api/auth/reset-password/:token — the mobile app's
      // reset screen (app/reset-password.tsx) reads the token back out of it
      // rather than this constructing a beermacs:// link by hand, so there is
      // exactly one place that assembles a reset URL.
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your Beermacs password",
          html: `<p>Someone asked to reset the password on this Beermacs account.</p>
<p><a href="${url}">Tap here to set a new password</a>. If this wasn't you, ignore this email.</p>
<p>This link expires in 1 hour.</p>`,
        });
      },
    },

    user: {
      additionalFields: {
        // The app shows `displayName`; Better Auth only knows about `name`.
        displayName: { type: "string", required: true, input: true },
        // Optional (App Review 5.1.1(v)). Stored as data (A-21), never used
        // to authenticate — see the module doc above.
        phone: { type: "string", required: false, input: true },
        // Read by lib/session.ts to refuse a banned user's live sessions.
        bannedAt: { type: "date", required: false, input: false },
      },
      // App Store guideline 5.1.1(v): account deletion must be reachable
      // INSIDE the app, not "email us." This is that mechanism — DELETE
      // /api/auth/delete-user, called from the Profile screen. No
      // re-verification email: we don't require email verification anywhere
      // else either, so gating deletion behind one would be a worse
      // experience than the rest of the app for no real safety gain (the
      // session itself is the proof of identity; Better Auth still asks for
      // the current password by default when one is set).
      deleteUser: {
        enabled: true,
      },
    },

    // The in-memory default is per serverless instance, i.e. barely a limit
    // on Vercel. The `RateLimit` table (packages/db) makes it global.
    rateLimit: { enabled: true, storage: "database" },

    databaseHooks: {
      user: {
        // A cleared phone must be NULL, not "", so "no phone" means one
        // thing everywhere.
        create: { before: async (user) => ({ data: { ...user, phone: blankToNull(user.phone) } }) },
        update: {
          before: async (user) =>
            "phone" in user ? { data: { ...user, phone: blankToNull(user.phone) } } : { data: user },
        },
        delete: { before: async (user) => void (await scrubUserPii(user.id)) },
      },
      session: {
        // Banned from /admin/users: no new sessions, whatever the method.
        create: {
          before: async (session) => {
            const u = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { bannedAt: true },
            });
            if (u?.bannedAt) throw new APIError("FORBIDDEN", { message: "account_banned" });
          },
        },
      },
    },

    plugins: [bearer(), expo()],
  });
}

function blankToNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function authBaseUrl(): string {
  const url = process.env.BETTER_AUTH_URL;
  // A missing URL in production silently mints reset links to localhost.
  if (!url && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_URL is not set.");
  return url ?? "http://localhost:3000";
}

type BetterAuthInstance = ReturnType<typeof buildAuth>;

let instance: BetterAuthInstance | undefined;

/** Lazily builds (and memoizes) the Better Auth instance on first use — same
 *  pattern packages/db uses for Prisma; see its comment for why. */
export function getAuth(): BetterAuthInstance {
  if (!instance) instance = buildAuth();
  return instance;
}

export type Auth = BetterAuthInstance;
