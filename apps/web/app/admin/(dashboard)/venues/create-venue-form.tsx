"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../../_ui/button";
import { Card } from "../../_ui/card";
import { Field, Input } from "../../_ui/field";
import { PlusIcon } from "../../_ui/icons";

export function CreateVenueForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, city: city || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't create that venue.");
      return;
    }
    setName("");
    setCity("");
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <PlusIcon size={16} />
        New venue
      </Button>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Porter House" required />
          </Field>
          <Field label="City" hint="Optional">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Milano" />
          </Field>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create venue"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
