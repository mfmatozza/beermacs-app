import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-session";
import { LogoutButton } from "./logout-button";

/**
 * Guards every page under app/admin/(dashboard)/* — the route group keeps
 * app/admin/login OUTSIDE this layout, since that's the one admin page that
 * must render for a signed-out visitor.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminSession())) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-stout-900 text-beer-100">
      <div className="flex min-h-screen">
        <nav className="w-56 shrink-0 border-r border-white/10 p-5">
          <p className="mb-6 font-display text-lg uppercase tracking-wide text-beer-500">
            Beermacs admin
          </p>
          <div className="flex flex-col gap-1 text-sm">
            <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-white/5">
              Dashboard
            </Link>
            <Link href="/admin/access" className="rounded-lg px-3 py-2 hover:bg-white/5">
              Access
            </Link>
            <Link href="/admin/content" className="rounded-lg px-3 py-2 hover:bg-white/5">
              Site content
            </Link>
          </div>
          <div className="mt-8">
            <LogoutButton />
          </div>
        </nav>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
