import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-session";
import { prisma } from "@beermacs/db";
import { Badge } from "../../_ui/badge";
import { EmptyState } from "../../_ui/empty-state";
import { UsersIcon } from "../../_ui/icons";
import { PageHeader } from "../../_ui/page-header";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminPage();
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const rows = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" as const } },
              { displayName: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    // One extra row tells us whether a next page exists without a count(*).
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      bannedAt: true,
      createdAt: true,
      memberships: { select: { role: true, venue: { select: { id: true, name: true } } } },
    },
  });

  const hasNext = rows.length > PAGE_SIZE;
  const shown = rows.slice(0, PAGE_SIZE);
  const pageHref = (n: number) =>
    `/admin/users?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(n) })}`;

  return (
    <>
      <PageHeader title="Players" subtitle="Every account on the platform. Tap one to ban, log out or delete it." />

      <form method="GET" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name or email…"
          aria-label="Search players"
          className="w-full max-w-sm rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-beer-500 focus-visible:ring-2 focus-visible:ring-beer-500/40"
        />
        <button type="submit" className="rounded-xl bg-beer-500 px-4 py-2.5 text-sm font-semibold text-stout-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beer-500/40">
          Search
        </button>
        {query ? (
          <Link href="/admin/users" className="self-center text-sm text-gray-500 hover:text-gray-700">
            Clear
          </Link>
        ) : null}
      </form>

      {shown.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={28} />}
          title={query ? "No matches" : "No accounts yet"}
          description={query ? `Nothing matched "${query}".` : "Accounts appear here the moment someone signs up."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="block font-medium text-gray-900 hover:text-beer-700">
                        {u.displayName}
                        {u.bannedAt ? (
                          <span className="ml-2 align-middle">
                            <Badge tone="dispute">Banned</Badge>
                          </span>
                        ) : null}
                      </Link>
                      <span className="block text-xs text-gray-500">{u.email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.memberships.length === 0 ? (
                          <span className="text-xs text-gray-400">Player only</span>
                        ) : (
                          u.memberships.map((m) => (
                            <Badge key={m.venue.id} tone={m.role === "PLAYER" ? "neutral" : "brand"}>
                              {m.venue.name} · {m.role.replace("VENUE_", "")}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmt.format(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {page > 1 || hasNext ? (
        <nav className="mt-4 flex items-center gap-4 text-sm" aria-label="Pages">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-beer-700 hover:underline">
              ← Previous
            </Link>
          ) : null}
          <span className="text-gray-400">Page {page}</span>
          {hasNext ? (
            <Link href={pageHref(page + 1)} className="text-beer-700 hover:underline">
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
