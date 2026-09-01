// Better Auth server instance.
//
// SERVER-ONLY. Never import from a client component.
//
// Two doors in, per docs/DECISIONS.md D3:
//
//   - PLAYERS sign in anonymously. The `anonymous` plugin creates a real user
//     row with a real session, so team membership and push notifications work
//     exactly as they do for a named account — it simply has no credential to
//     sign back in with from another device. This is deliberate: nobody standing
//     at a beer pong table waits for an SMS before playing.
//   - STAFF sign in with email and password. Not email OTP, which is what astra
//     uses: OTP needs a mail provider, and a bar manager signing in behind the
//     counter is not the same friction problem as a player at a table.
//
// The `bearer` plugin lets the mobile app authenticate with
// `Authorization: Bearer <token>` instead of cookies, which is what
// @better-auth/expo stores.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { anonymous, bearer } from "better-auth/plugins";
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
    // Staff accounts are issued by a venue owner, not self-served. There is no
    // public sign-up form; accounts are created through the venue's staff
    // management screen (milestone 6+).
    disableSignUp: false,
    minPasswordLength: 10,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      // The app shows `displayName`; Better Auth only knows about `name`.
      displayName: { type: "string", required: false, input: true },
      phone: { type: "string", required: false, input: true },
    },
  },

  plugins: [
    anonymous({
      // A display name is set straight after joining, so this is only ever a
      // brief placeholder in the UI.
      emailDomainName: "anon.beermacs.local",
      /**
       * Called when an anonymous player later signs in properly — they wanted
       * their record to follow them between nights. Everything the anonymous
       * user did has to move across, or "keep my history" is a lie.
       */
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await prisma.$transaction([
          prisma.teamMember.updateMany({
            where: { userId: anonymousUser.user.id },
            data: { userId: newUser.user.id },
          }),
          prisma.venueMembership.updateMany({
            where: { userId: anonymousUser.user.id },
            data: { userId: newUser.user.id },
          }),
          prisma.matchReport.updateMany({
            where: { actorUserId: anonymousUser.user.id },
            data: { actorUserId: newUser.user.id },
          }),
          prisma.chatMessage.updateMany({
            where: { authorId: anonymousUser.user.id },
            data: { authorId: newUser.user.id },
          }),
          prisma.device.updateMany({
            where: { userId: anonymousUser.user.id },
            data: { userId: newUser.user.id },
          }),
        ]);
      },
    }),
    bearer(),
    expo(),
  ],
});

export type Auth = typeof auth;
