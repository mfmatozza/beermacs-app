import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-session";
import {
  FileIcon,
  HomeIcon,
  ShieldIcon,
  StoreIcon,
  TrophyIcon,
  UsersIcon,
} from "../_ui/icons";
import { LogoutButton } from "./logout-button";

const NAV = [
  { href: "/admin", label: "Overview", icon: HomeIcon },
  { href: "/admin/tournaments", label: "Tournaments", icon: TrophyIcon },
  { href: "/admin/venues", label: "Venues", icon: StoreIcon },
  { href: "/admin/users", label: "Players", icon: UsersIcon },
  { href: "/admin/access", label: "Access", icon: ShieldIcon },
  { href: "/admin/content", label: "Site content", icon: FileIcon },
] as const;

/**
 * Light theme, deliberately NOT the marketing site's dark poster commitment
 * (D23) — an operator console gets scanned for long stretches, not sold to.
 * Guards every page under app/admin/(dashboard)/* — the route group keeps
 * app/admin/login OUTSIDE this layout, since that page must render for a
 * signed-out visitor. See docs/DECISIONS.md D25.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminSession())) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-5">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-2">
          <span className="font-display text-lg uppercase tracking-wide text-beer-600">
            Beermacs
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Admin
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-beer-100 hover:text-beer-700"
            >
              <item.icon size={18} className="text-gray-400" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-100 pt-4">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
