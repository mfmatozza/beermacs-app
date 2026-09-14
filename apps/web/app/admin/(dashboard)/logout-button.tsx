"use client";

import { useRouter } from "next/navigation";
import { Button } from "../_ui/button";
import { LogoutIcon } from "../_ui/icons";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      block
      onClick={async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
    >
      <LogoutIcon size={16} />
      Sign out
    </Button>
  );
}
