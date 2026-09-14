import Link from "next/link";
import { prisma } from "@beermacs/db";
import { Card, StatCard } from "../_ui/card";
import {
  ChevronRightIcon,
  FileIcon,
  ShieldIcon,
  StoreIcon,
  TrophyIcon,
  UsersIcon,
} from "../_ui/icons";
import { PageHeader } from "../_ui/page-header";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    href: "/admin/tournaments",
    label: "Tournaments",
    blurb: "Every tournament, every venue — status, teams, live matches.",
    icon: TrophyIcon,
  },
  {
    href: "/admin/venues",
    label: "Venues",
    blurb: "Create a venue and see who's running it.",
    icon: StoreIcon,
  },
  {
    href: "/admin/users",
    label: "Players",
    blurb: "Every account on the platform, searchable.",
    icon: UsersIcon,
  },
  {
    href: "/admin/access",
    label: "Access",
    blurb: "Grant or revoke a venue role for any account.",
    icon: ShieldIcon,
  },
  {
    href: "/admin/content",
    label: "Site content",
    blurb: "Edit the marketing landing page's copy.",
    icon: FileIcon,
  },
] as const;

export default async function AdminHomePage() {
  const [venues, users, tournaments, runningNow, matchesToday] = await Promise.all([
    prisma.venue.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.tournament.count(),
    prisma.tournament.count({ where: { status: "RUNNING" } }),
    prisma.match.count({
      where: { settledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);

  return (
    <>
      <PageHeader title="Overview" subtitle="What's happening across every venue right now." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard tone="brand" label="Running now" value={runningNow} hint="Tournaments" icon={<TrophyIcon size={20} />} />
        <StatCard label="Venues" value={venues} icon={<StoreIcon size={20} />} />
        <StatCard label="Accounts" value={users} icon={<UsersIcon size={20} />} />
        <StatCard label="Tournaments" value={tournaments} hint="All time" icon={<TrophyIcon size={20} />} />
        <StatCard label="Matches settled" value={matchesToday} hint="Today" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="flex items-center gap-3 transition-all hover:border-beer-200 hover:shadow-md">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-beer-100 text-beer-700">
                <s.icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-gray-900">{s.label}</span>
                <span className="block truncate text-sm text-gray-500">{s.blurb}</span>
              </span>
              <span className="text-gray-300 transition-colors group-hover:text-beer-600">
                <ChevronRightIcon size={20} />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
