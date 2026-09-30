// Account-level admin operations shared by Better Auth's own hooks (self-
// service deletion from the app) and the platform admin's /admin/users page.
// SERVER-ONLY.

import { prisma } from "@beermacs/db";

/**
 * SupportMessage rows keep a copy of name/email/phone on purpose (so an
 * inbox thread survives the account) — but not past a deletion request.
 * Chat bodies stay (authorId goes NULL via the FK), shown as "Deleted user".
 */
export async function scrubUserPii(userId: string): Promise<void> {
  await prisma.supportMessage.updateMany({
    where: { userId },
    data: { name: "Deleted user", email: "", phone: null },
  });
}

/** Admin-initiated delete. Every FK to User is Cascade or SetNull. */
export async function deleteUserAccount(userId: string): Promise<void> {
  await scrubUserPii(userId);
  await prisma.user.delete({ where: { id: userId } });
}

/** Ban = refuse every current session and every future sign-in. */
export async function setUserBanned(userId: string, banned: boolean): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { bannedAt: banned ? new Date() : null } }),
    ...(banned ? [prisma.session.deleteMany({ where: { userId } })] : []),
  ]);
}
