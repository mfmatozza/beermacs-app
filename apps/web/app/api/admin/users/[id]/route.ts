// POST/DELETE /api/admin/users/:id — the platform admin's account controls.
// POST {action}: "ban" | "unban" | "logout" (revoke every session).
// DELETE: delete the account (same end state as the player deleting it
// themselves from the app — see lib/users.ts).

import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError, parseBody } from "@/lib/http";
import { HttpError } from "@/lib/session";
import { deleteUserAccount, setUserBanned } from "@/lib/users";

export const runtime = "nodejs";

const actionInput = z.object({ action: z.enum(["ban", "unban", "logout"]) });

async function findUser(id: string) {
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!u) throw new HttpError(404, "user_not_found");
  // The admin's own backing row (lib/admin-auth.ts) — banning or deleting it
  // would break attribution on every admin write.
  if (u.email && u.email === process.env.ADMIN_EMAIL) throw new HttpError(409, "cannot_target_admin");
  return u;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const { action } = await parseBody(req, actionInput);
    await findUser(id);

    if (action === "logout") await prisma.session.deleteMany({ where: { userId: id } });
    else await setUserBanned(id, action === "ban");

    return NextResponse.json({ id, action });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    await findUser(id);
    await deleteUserAccount(id);
    return NextResponse.json({ id, deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
