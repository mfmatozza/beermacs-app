// POST /api/support — the one inbox behind both entry points: the public
// /support contact form (apps/web) and the mobile app's "?" help button in
// Profile. Guideline 1.2 wants "a published way to contact us" independent
// of chat's own report/block/mute kit, which only covers in-tournament
// conduct — this is the general one.
//
// Deliberately no auth requirement: a signed-in caller (mobile) gets name/
// email/phone read off the session so it can't lie about who it is; a
// signed-out one (the web form) must supply name+email itself.

import { submitSupportMessageInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { HttpError, currentViewer } from "@/lib/session";
import { handleError, parseBody } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, submitSupportMessageInput);
    const viewer = await currentViewer();

    const name = viewer?.displayName ?? body.name;
    const email = viewer?.email ?? body.email;
    if (!name || !email) throw new HttpError(422, "name_and_email_required");

    const message = await prisma.supportMessage.create({
      data: {
        userId: viewer?.userId ?? null,
        name,
        email,
        phone: viewer?.phone || null,
        body: body.body,
        source: viewer ? "MOBILE" : "WEB",
      },
      select: { id: true },
    });

    return NextResponse.json({ id: message.id });
  } catch (e) {
    return handleError(e);
  }
}
