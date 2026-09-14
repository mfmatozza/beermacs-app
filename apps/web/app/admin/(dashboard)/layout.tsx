import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-session";
import { AdminShell } from "../_ui/admin-shell";
import { LogoutButton } from "./logout-button";

/**
 * Light theme, deliberately NOT the marketing site's dark poster commitment
 * (D23) — an operator console gets scanned for long stretches, not sold to.
 * Guards every page under app/admin/(dashboard)/* — the route group keeps
 * app/admin/login OUTSIDE this layout, since that page must render for a
 * signed-out visitor. See docs/DECISIONS.md D25.
 *
 * The sidebar/nav/drawer live in AdminShell (a client component) since the
 * mobile drawer needs interaction state (D26) — this file stays a server
 * component so the session check never ships to the client.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminSession())) redirect("/admin/login");

  return <AdminShell logout={<LogoutButton />}>{children}</AdminShell>;
}
