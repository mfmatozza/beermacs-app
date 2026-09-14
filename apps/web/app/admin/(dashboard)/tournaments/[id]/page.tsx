import { notFound } from "next/navigation";
import { Prisma, prisma } from "@beermacs/db";
import { TournamentAdminPanel } from "./tournament-admin-panel";

export const dynamic = "force-dynamic";

const TOURNAMENT_SELECT = {
  id: true,
  name: true,
  format: true,
  status: true,
  joinCode: true,
  config: true,
  venue: { select: { id: true, name: true } },
  teams: {
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, entryRound: true, withdrawn: true, joinCode: true },
  },
  stages: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      type: true,
      rounds: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          index: true,
          status: true,
          schedulingPaused: true,
          matches: {
            select: {
              id: true,
              position: true,
              state: true,
              homeTeam: { select: { id: true, name: true } },
              awayTeam: { select: { id: true, name: true } },
              venueTable: { select: { label: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TournamentSelect;

export type TournamentAdminData = Prisma.TournamentGetPayload<{ select: typeof TOURNAMENT_SELECT }>;

/**
 * D26: this used to be read-only ("oversight, not the running console" —
 * see the old comment, now wrong). Direct feedback reversed that: the web
 * console needs to edit/delete everything, not just watch. Mutations reuse
 * the EXACT same routes the mobile admin console calls
 * (requireVenueRoleOrAdmin, lib/session.ts) rather than a parallel set of
 * admin-only routes reimplementing the same writes — one code path for
 * "open a round" or "resolve a dispute," not two that can drift.
 */
export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: TOURNAMENT_SELECT });
  if (!tournament) notFound();

  return <TournamentAdminPanel tournament={tournament} />;
}
