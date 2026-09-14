import Link from "next/link";
import { prisma } from "@beermacs/db";
import { EmptyState } from "../../_ui/empty-state";
import { StoreIcon } from "../../_ui/icons";
import { PageHeader } from "../../_ui/page-header";
import { CreateVenueForm } from "./create-venue-form";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function VenuesPage() {
  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      createdAt: true,
      _count: { select: { memberships: true, tournaments: true } },
    },
  });

  return (
    <>
      <PageHeader title="Venues" subtitle="Every venue running Beermacs. No self-serve signup (D15) — this is the only way one exists." />

      <CreateVenueForm />

      {venues.length === 0 ? (
        <EmptyState icon={<StoreIcon size={28} />} title="No venues yet" description="Add the first one above." />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Tournaments</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {venues.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/venues/${v.id}`} className="font-medium text-gray-900 hover:text-beer-700">
                      {v.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.city ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{v._count.memberships}</td>
                  <td className="px-4 py-3 text-gray-600">{v._count.tournaments}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmt.format(v.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
