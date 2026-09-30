import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-session";
import { Prisma, prisma } from "@beermacs/db";
import { UserAdminPanel } from "./user-admin-panel";

export const dynamic = "force-dynamic";

const USER_SELECT = {
  id: true,
  displayName: true,
  email: true,
  phone: true,
  bannedAt: true,
  createdAt: true,
  _count: { select: { sessions: true, messages: true } },
  memberships: { select: { role: true, venue: { select: { id: true, name: true } } } },
  teamMembers: {
    orderBy: { team: { createdAt: "desc" } },
    take: 20,
    select: {
      isCaptain: true,
      team: {
        select: { id: true, name: true, tournament: { select: { id: true, name: true, status: true } } },
      },
    },
  },
  mutedIn: {
    select: { reason: true, createdAt: true, tournament: { select: { id: true, name: true } } },
  },
} satisfies Prisma.UserSelect;

export type UserAdminData = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

/** One page per account: everything the platform admin can do to a person,
 *  so none of it needs a database console in production. */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) notFound();

  return (
    <>
      <Link href="/admin/users" className="mb-3 inline-block text-sm text-gray-500 hover:text-beer-700">
        ← All players
      </Link>
      <UserAdminPanel user={user} />
    </>
  );
}
