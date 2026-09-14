"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileIcon,
  HomeIcon,
  MenuIcon,
  ShieldIcon,
  StoreIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "./icons";

const NAV = [
  { href: "/admin", label: "Overview", icon: HomeIcon },
  { href: "/admin/tournaments", label: "Tournaments", icon: TrophyIcon },
  { href: "/admin/venues", label: "Venues", icon: StoreIcon },
  { href: "/admin/users", label: "Players", icon: UsersIcon },
  { href: "/admin/access", label: "Access", icon: ShieldIcon },
  { href: "/admin/content", label: "Site content", icon: FileIcon },
] as const;

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <span className="font-display text-lg uppercase tracking-wide text-beer-600">Beermacs</span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
        Admin
      </span>
    </span>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-beer-100 text-beer-700" : "text-gray-600 hover:bg-beer-100 hover:text-beer-700"
            }`}
          >
            <item.icon size={18} className={active ? "text-beer-600" : "text-gray-400"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children, logout }: { children: React.ReactNode; logout: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever navigation actually completes, not just on tap
  // (covers back/forward and any programmatic router.push from a page below).
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-5 md:flex">
        <Link href="/admin" className="mb-8 px-2">
          <Brand />
        </Link>
        <NavLinks />
        <div className="mt-auto border-t border-gray-100 pt-4">{logout}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 md:hidden">
        <Link href="/admin">
          <Brand />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <MenuIcon size={22} />
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-gray-900/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white px-4 py-5 shadow-xl">
            <div className="mb-8 flex items-center justify-between px-2">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <XIcon size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-gray-100 pt-4">{logout}</div>
          </div>
        </div>
      ) : null}

      <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
