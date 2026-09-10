// POST /api/venues/:venueId/dispatch/run — E-1/E-2/E-3/E-8: pair whoever is
// waiting, hand out whatever tables are free.
//
// VENUE_STAFF+. Safe to call repeatedly and safe to call from two staff
// phones at once — see lib/dispatch.ts for how table claims are made
// individually atomic rather than relying on one all-or-nothing transaction.
// This is also the natural place a future scheduled job would call from once
// the stack has one; for now it's an explicit staff action, matching how
// "run the round" is framed everywhere else in the admin console.

import { Role } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { runDispatchPass } from "@/lib/dispatch";
import { requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try {
    const { venueId } = await params;
    await requireVenueRole(venueId, Role.VENUE_STAFF);

    const summary = await runDispatchPass(venueId);
    return NextResponse.json(summary);
  } catch (e) {
    return handleError(e);
  }
}
