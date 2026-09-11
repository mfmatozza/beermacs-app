// PUT/DELETE /api/me/avatar — set or clear the profile picture.
//
// Stored directly on User.image as a data URI, not in an object store: this
// app has no blob storage provisioned (no Vercel Blob store attached — that
// would need its own setup step, the same category of gap as
// RESEND_API_KEY/lib/email.ts), and a profile photo, cropped square and
// compressed to a few hundred KB on-device before upload
// (ProfileScreen.tsx's picker call), is small enough that a text column is
// a real, working answer rather than a stub waiting on infra that doesn't
// exist yet. Revisit if avatars turn out to bloat GET /api/me in practice —
// nothing here stops swapping this for a real object store later, since the
// client only ever deals with "a URI to put in an <Image>," which a
// blob-store URL satisfies identically.

import { updateAvatarInput } from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { requireViewer } from "@/lib/session";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  try {
    const viewer = await requireViewer();
    const body = await parseBody(req, updateAvatarInput);
    await prisma.user.update({ where: { id: viewer.userId }, data: { image: body.image } });
    return NextResponse.json({ image: body.image });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  try {
    const viewer = await requireViewer();
    await prisma.user.update({ where: { id: viewer.userId }, data: { image: null } });
    return NextResponse.json({ image: null });
  } catch (e) {
    return handleError(e);
  }
}
