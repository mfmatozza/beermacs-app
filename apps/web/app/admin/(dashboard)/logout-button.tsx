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
        try {
          await fetch("/api/admin/auth/logout", { method: "POST" });
        } catch {
          // Best-effort: the cookie is server-verified on every admin route
          // anyway, so a failed sign-out call here just means it'll get
          // caught on the next request rather than immediately.
        }
        router.push("/admin/login");
        router.refresh();
      }}
    >
      <LogoutIcon size={16} />
      Sign out
    </Button>
  );
}
