import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-session";
import { Prisma, prisma } from "@beermacs/db";
import { VenueAdminPanel } from "./venue-admin-panel";

export const dynamic = "force-dynamic";

const VENUE_SELECT = {
  id: true,
  name: true,
  city: true,
  slug: true,
  deletedAt: true,
  memberships: {
    orderBy: { role: "desc" },
    select: { role: true, user: { select: { id: true, displayName: true, email: true } } },
  },
  tournaments: {
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true, joinCode: true, _count: { select: { teams: true } } },
  },
  tables: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, state: true } },
} satisfies Prisma.VenueSelect;

export type VenueAdminData = Prisma.VenueGetPayload<{ select: typeof VENUE_SELECT }>;

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const venue = await prisma.venue.findUnique({ where: { id }, select: VENUE_SELECT });
  if (!venue) notFound();

  return <VenueAdminPanel venue={venue} />;
}
