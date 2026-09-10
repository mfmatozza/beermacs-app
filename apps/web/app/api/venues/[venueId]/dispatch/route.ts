// GET /api/venues/:venueId/dispatch — which matches should go to which tables.
//
// Staff only. Exists as much to demonstrate the architecture as to be useful:
// the answer is computed by `planDispatch` from @beermacs/shared, the same pure
// function the app calls to render the queue optimistically. One implementation,
// two callers, and the authoritative one is behind a role check that the phone
// cannot influence.
//
// Pairing brand-new matches out of a round's waiting pool (E-1/E-3) is a
// separate, heavier endpoint — this one only ever hands tables to matches that
// already exist and have both slots filled. See docs/ROADMAP.md.

import { planDispatch, type VenueTable } from "@beermacs/shared";
import { Role, TableState, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { MATCH_SELECT, toDomainMatch } from "@/lib/match-mapping";
import { requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

const toTable = (t: {
  id: string;
  label: string;
  state: TableState;
  sortOrder: number;
}): VenueTable => ({
  id: t.id,
  label: t.label,
  state: ({ OPEN: "open", BUSY: "busy", CLOSED: "closed" } as const)[t.state],
  sortOrder: t.sortOrder,
});

export async function GET(_req: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try {
    const { venueId } = await params;
    await requireVenueRole(venueId, Role.VENUE_STAFF);

    const [rows, tableRows] = await Promise.all([
      // Priority order is this function's job now, not buildQueue's (Match no
      // longer carries a round NUMBER, only a roundId) — order by the round's
      // own index, then position within it.
      prisma.match.findMany({
        where: { tournament: { venueId, status: "RUNNING" } },
        orderBy: [{ round: { index: "asc" } }, { position: "asc" }],
        select: { ...MATCH_SELECT, roundId: true },
      }),
      prisma.venueTable.findMany({ where: { venueId }, orderBy: { sortOrder: "asc" } }),
    ]);

    const plan = planDispatch(
      rows.map((m) => toDomainMatch(m.roundId, m)),
      tableRows.map(toTable)
    );
    return NextResponse.json(plan);
  } catch (e) {
    return handleError(e);
  }
}
