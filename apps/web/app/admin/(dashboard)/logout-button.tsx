"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="w-full rounded-lg border border-white/15 py-2 text-sm text-beer-100/70 hover:bg-white/5"
    >
      Sign out
    </button>
  );
}
