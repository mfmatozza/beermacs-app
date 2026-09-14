import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@beermacs/db";
import { Badge } from "../../../_ui/badge";
import { Card, StatCard } from "../../../_ui/card";
import { PageHeader } from "../../../_ui/page-header";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  DRAFT: "neutral",
  REGISTRATION: "neutral",
  RUNNING: "live",
  COMPLETE: "neutral",
  CANCELED: "dispute",
} as const;

const MATCH_STATE_TONE: Record<string, "neutral" | "live" | "dispute"> = {
  DISPUTED: "dispute",
  ON_TABLE: "live",
};

/**
 * Read-only — this is oversight, not the running console. Every action that
 * changes a tournament's state lives in the mobile admin (docs/DECISIONS.md
 * D22), which already has the full "gods" toolkit; duplicating force-result
 * / round-open / etc. here would be a second code path to keep in sync with
 * no real benefit, since the platform admin isn't who runs match night.
 */
export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      format: true,
      status: true,
      joinCode: true,
      createdAt: true,
      endedAt: true,
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
              matches: {
                select: {
                  id: true,
                  position: true,
                  state: true,
                  homeTeam: { select: { name: true } },
                  awayTeam: { select: { name: true } },
                  venueTable: { select: { label: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!tournament) notFound();

  const matchCount = tournament.stages.reduce((sum, s) => sum + s.rounds.reduce((n, r) => n + r.matches.length, 0), 0);
  const disputedCount = tournament.stages.reduce(
    (sum, s) => sum + s.rounds.reduce((n, r) => n + r.matches.filter((m) => m.state === "DISPUTED").length, 0),
    0
  );

  return (
    <>
      <Link href="/admin/tournaments" className="mb-3 inline-block text-sm text-gray-500 hover:text-beer-700">
        ← All tournaments
      </Link>
      <PageHeader
        title={tournament.name}
        subtitle={`${tournament.venue.name} · join code ${tournament.joinCode} · ${tournament.format.replace(/_/g, " ").toLowerCase()}`}
        actions={<Badge tone={STATUS_TONE[tournament.status]}>{tournament.status}</Badge>}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Teams" value={tournament.teams.length} />
        <StatCard label="Matches" value={matchCount} />
        <StatCard label="Rounds" value={tournament.stages.reduce((n, s) => n + s.rounds.length, 0)} />
        <StatCard
          label="Disputed"
          value={disputedCount}
          tone={disputedCount > 0 ? "brand" : "plain"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Bracket</h2>
          {tournament.stages.map((stage) => (
            <Card key={stage.id}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beer-700">
                {stage.type === "GROUP" ? "Group stage" : "Elimination"}
              </p>
              <div className="flex flex-col gap-4">
                {stage.rounds.map((round) => (
                  <div key={round.id}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">Round {round.index}</span>
                      <Badge tone={round.status === "OPEN" ? "live" : "neutral"}>
                        {round.status === "OPEN" ? "OPEN" : "NOT OPENED"}
                      </Badge>
                    </div>
                    {round.matches.length === 0 ? (
                      <p className="text-xs text-gray-400">No matches paired yet.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {round.matches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                          >
                            <span className="text-gray-700">
                              {m.homeTeam?.name ?? "TBD"} <span className="text-gray-400">vs</span>{" "}
                              {m.awayTeam?.name ?? "TBD"}
                            </span>
                            <span className="flex items-center gap-2">
                              {m.venueTable ? <span className="text-gray-400">{m.venueTable.label}</span> : null}
                              <Badge tone={MATCH_STATE_TONE[m.state] ?? "neutral"}>{m.state.replace(/_/g, " ")}</Badge>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Teams</h2>
          <Card className="p-0">
            <div className="divide-y divide-gray-100">
              {tournament.teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className={team.withdrawn ? "text-gray-400 line-through" : "text-gray-800"}>
                    {team.name}
                  </span>
                  <span className="text-xs text-gray-400">R{team.entryRound}</span>
                </div>
              ))}
              {tournament.teams.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No teams yet.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
