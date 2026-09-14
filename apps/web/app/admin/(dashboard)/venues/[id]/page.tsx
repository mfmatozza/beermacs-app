import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@beermacs/db";
import { Badge } from "../../../_ui/badge";
import { Card } from "../../../_ui/card";
import { PageHeader } from "../../../_ui/page-header";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  DRAFT: "neutral",
  REGISTRATION: "neutral",
  RUNNING: "live",
  COMPLETE: "neutral",
  CANCELED: "dispute",
} as const;

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      city: true,
      slug: true,
      memberships: {
        orderBy: { role: "desc" },
        select: { role: true, user: { select: { id: true, displayName: true, email: true } } },
      },
      tournaments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          joinCode: true,
          _count: { select: { teams: true } },
        },
      },
    },
  });
  if (!venue) notFound();

  return (
    <>
      <Link href="/admin/venues" className="mb-3 inline-block text-sm text-gray-500 hover:text-beer-700">
        ← All venues
      </Link>
      <PageHeader title={venue.name} subtitle={`${venue.city ?? "No city set"} · ${venue.slug}`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Tournaments</h2>
          <Card className="p-0">
            {venue.tournaments.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">No tournaments at this venue yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {venue.tournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/tournaments/${t.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    <span>
                      <span className="font-medium text-gray-900">{t.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{t._count.teams} teams</span>
                    </span>
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Staff</h2>
            <Link href="/admin/access" className="text-xs text-beer-700 hover:underline">
              Manage
            </Link>
          </div>
          <Card className="p-0">
            <div className="divide-y divide-gray-100">
              {venue.memberships.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>
                    <span className="block text-gray-800">{m.user.displayName}</span>
                    <span className="block text-xs text-gray-400">{m.user.email}</span>
                  </span>
                  <Badge tone={m.role === "PLAYER" ? "neutral" : "brand"}>{m.role.replace("VENUE_", "")}</Badge>
                </div>
              ))}
              {venue.memberships.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Nobody yet.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
