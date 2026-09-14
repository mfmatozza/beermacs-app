import Link from "next/link";
import { prisma } from "@beermacs/db";

export default async function AdminHomePage() {
  const [venues, users, tournaments] = await Promise.all([
    prisma.venue.count(),
    prisma.user.count(),
    prisma.tournament.count(),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide text-white">Dashboard</h1>
      <div className="mb-10 grid grid-cols-3 gap-4">
        <Stat label="Venues" value={venues} />
        <Stat label="Accounts" value={users} />
        <Stat label="Tournaments" value={tournaments} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/admin/access"
          className="rounded-xl border border-white/10 bg-stout-800 p-5 hover:border-beer-500/50"
        >
          <h2 className="mb-1 font-display text-xl uppercase text-beer-500">Access</h2>
          <p className="text-sm text-beer-100/60">
            Grant or revoke venue roles for any account, and create new venues.
          </p>
        </Link>
        <Link
          href="/admin/content"
          className="rounded-xl border border-white/10 bg-stout-800 p-5 hover:border-beer-500/50"
        >
          <h2 className="mb-1 font-display text-xl uppercase text-beer-500">Site content</h2>
          <p className="text-sm text-beer-100/60">
            Edit the copy on the marketing landing page — no deploy needed.
          </p>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-stout-800 p-5">
      <p className="font-display text-3xl text-white">{value}</p>
      <p className="text-xs uppercase tracking-wide text-beer-100/50">{label}</p>
    </div>
  );
}
