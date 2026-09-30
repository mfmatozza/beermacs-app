// DELETE /api/admin/security?ip=… — unlock an IP the admin login locked
// after too many failures (lib/admin-auth.ts). Listing is done server-side
// by the /admin/security page itself.

import { NextResponse } from "next/server";
import { clearAdminFailures } from "@/lib/admin-auth";
import { requireAdminApi } from "@/lib/admin-session";
import { handleError } from "@/lib/http";
import { HttpError } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    await requireAdminApi();
    const ip = new URL(req.url).searchParams.get("ip");
    if (!ip) throw new HttpError(422, "ip_required");
    await clearAdminFailures(ip);
    return NextResponse.json({ ip, unlocked: true });
  } catch (e) {
    return handleError(e);
  }
}
