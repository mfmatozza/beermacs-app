import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-session";
import { prisma } from "@beermacs/db";
import { Badge } from "../../_ui/badge";
import { EmptyState } from "../../_ui/empty-state";
import { TrophyIcon } from "../../_ui/icons";
import { PageHeader } from "../../_ui/page-header";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  DRAFT: "neutral",
  REGISTRATION: "neutral",
  RUNNING: "live",
  COMPLETE: "neutral",
  CANCELED: "dispute",
} as const;

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminPage();
  const { status: rawStatus, q } = await searchParams;
  const query = q?.trim() ?? "";
  const STATUSES = ["DRAFT", "REGISTRATION", "RUNNING", "COMPLETE", "CANCELED"] as const;
  const status = STATUSES.find((s) => s === rawStatus);

  const tournaments = await prisma.tournament.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { joinCode: { equals: query.toUpperCase() } },
              { venue: { name: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      format: true,
      status: true,
      joinCode: true,
      createdAt: true,
      venue: { select: { name: true } },
      _count: { select: { teams: true, matches: true } },
    },
  });

  return (
    <>
      <PageHeader title="Tournaments" subtitle="Every tournament, across every venue. Newest 200 shown; search for older." />

      <form method="GET" className="mb-3 flex gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input
          name="q"
          defaultValue={query}
          placeholder="Name, venue or join code…"
          aria-label="Search tournaments"
          className="w-full max-w-sm rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-beer-500 focus-visible:ring-2 focus-visible:ring-beer-500/30"
        />
        <button type="submit" className="rounded-xl bg-beer-500 px-4 py-2.5 text-sm font-semibold text-stout-900">
          Search
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/tournaments"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide ${
            !status ? "border-beer-500 bg-beer-100 text-beer-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/tournaments?status=${s}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide ${
              status === s ? "border-beer-500 bg-beer-100 text-beer-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon size={28} />}
          title="No tournaments"
          description={status ? `Nothing with status ${status}.` : "None have been created yet."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tournament</th>
                  <th className="px-4 py-3 font-medium">Venue</th>
                  <th className="px-4 py-3 font-medium">Format</th>
                  <th className="px-4 py-3 font-medium">Teams</th>
                  <th className="px-4 py-3 font-medium">Matches</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tournaments.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tournaments/${t.id}`} className="font-medium text-gray-900 hover:text-beer-700">
                        {t.name}
                      </Link>
                      <span className="block text-xs text-gray-400">{t.joinCode}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.venue.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.format.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="px-4 py-3 text-gray-600">{t._count.teams}</td>
                    <td className="px-4 py-3 text-gray-600">{t._count.matches}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmt.format(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
