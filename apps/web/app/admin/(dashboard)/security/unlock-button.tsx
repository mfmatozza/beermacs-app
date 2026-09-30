"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "../../_ui/api";
import { Button } from "../../_ui/button";

export function UnlockButton({ ip, locked }: { ip: string; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const unlock = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/security?ip=${encodeURIComponent(ip)}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(errorText(e, "Couldn't unlock."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={locked ? "primary" : "secondary"} onClick={() => void unlock()} disabled={busy}>
      {locked ? "Unlock" : "Reset"}
    </Button>
  );
}
