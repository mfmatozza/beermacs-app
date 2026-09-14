"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "../../../_ui/badge";
import { Button } from "../../../_ui/button";
import { Card } from "../../../_ui/card";
import { Input } from "../../../_ui/field";
import { PageHeader } from "../../../_ui/page-header";
import type { VenueAdminData } from "./page";

type Table = VenueAdminData["tables"][number];

const STATUS_TONE = {
  DRAFT: "neutral",
  REGISTRATION: "neutral",
  RUNNING: "live",
  COMPLETE: "neutral",
  CANCELED: "dispute",
} as const;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `http_${res.status}`);
  }
  return res.json().catch(() => ({}));
}

export function VenueAdminPanel({ venue: v }: { venue: VenueAdminData }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(v.name);
  const [city, setCity] = useState(v.city ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/venues/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), city: city.trim() || null }),
      });
      setEditing(false);
      refresh();
    } catch {
      setError("Couldn't save those changes.");
    } finally {
      setBusy(false);
    }
  };

  const deleteVenue = async () => {
    if (!confirm(`Delete "${v.name}"? Its tournaments and history stay, but the venue itself is retired.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/venues/${v.id}`, { method: "DELETE" });
      router.push("/admin/venues");
    } catch {
      setError("Couldn't delete this venue.");
      setBusy(false);
    }
  };

  return (
    <>
      <Link href="/admin/venues" className="mb-3 inline-block text-sm text-gray-500 hover:text-beer-700">
        ← All venues
      </Link>

      {editing ? (
        <Card className="mb-6 max-w-md">
          <div className="flex flex-col gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Venue name" />
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button onClick={() => void save()} disabled={busy || !name.trim()}>
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <PageHeader
          title={v.name}
          subtitle={`${v.city ?? "No city set"} · ${v.slug}`}
          actions={
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => void deleteVenue()} disabled={busy}>
                Delete
              </Button>
            </>
          }
        />
      )}
      {!editing && error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Tournaments</h2>
            <Card className="p-0">
              {v.tournaments.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400">No tournaments at this venue yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {v.tournaments.map((t) => (
                    <Link
                      key={t.id}
                      href={`/admin/tournaments/${t.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <span>
                        <span className="font-medium text-gray-900">{t.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{t._count.teams} teams</span>
                      </span>
                      <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <TablesPanel venueId={v.id} tables={v.tables} onChanged={refresh} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Staff</h2>
            <Link href="/admin/access" className="text-xs text-beer-700 hover:underline">
              Manage
            </Link>
          </div>
          <Card className="p-0">
            <div className="divide-y divide-gray-100">
              {v.memberships.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>
                    <span className="block text-gray-800">{m.user.displayName}</span>
                    <span className="block text-xs text-gray-400">{m.user.email}</span>
                  </span>
                  <Badge tone={m.role === "PLAYER" ? "neutral" : "brand"}>{m.role.replace("VENUE_", "")}</Badge>
                </div>
              ))}
              {v.memberships.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">Nobody yet.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────

function TablesPanel({
  venueId,
  tables,
  onChanged,
}: {
  venueId: string;
  tables: readonly Table[];
  onChanged: () => void;
}) {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTable = async () => {
    if (!label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/venues/${venueId}/tables`, { method: "POST", body: JSON.stringify({ label: label.trim() }) });
      setLabel("");
      onChanged();
    } catch {
      setError("Couldn't add that table — the label may already be used.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Tables</h2>
      <Card className="p-0">
        <div className="flex gap-2 border-b border-gray-100 p-3">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Table 5" className="max-w-[160px]" />
          <Button onClick={() => void addTable()} disabled={busy || !label.trim()}>
            Add table
          </Button>
        </div>
        {error ? <p className="px-3 py-2 text-xs text-red-600">{error}</p> : null}
        {tables.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">No tables yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {tables.map((table) => (
              <TableTile key={table.id} table={table} onChanged={onChanged} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TableTile({ table, onChanged }: { table: Table; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(table.label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rename = async () => {
    if (!label.trim() || label === table.label) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/tables/${table.id}`, { method: "PATCH", body: JSON.stringify({ label: label.trim() }) });
      onChanged();
    } catch {
      setError("Label already used.");
    } finally {
      setBusy(false);
      setEditing(false);
    }
  };

  const toggle = async (force = false) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tables/${table.id}/state`, {
        method: "POST",
        body: JSON.stringify({ state: table.state === "OPEN" ? "closed" : "open", force }),
      });
      onChanged();
    } catch {
      setError("That table has a live match on it.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove ${table.label}?`)) return;
    setBusy(true);
    try {
      await api(`/api/tables/${table.id}`, { method: "DELETE" });
      onChanged();
    } catch {
      setError("Couldn't remove — it's in use.");
    } finally {
      setBusy(false);
    }
  };

  const toneClass =
    table.state === "BUSY" ? "border-green-200 bg-green-50" : table.state === "OPEN" ? "border-gray-200" : "border-red-200 bg-red-50";

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      {editing ? (
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => void rename()}
          onKeyDown={(e) => e.key === "Enter" && void rename()}
          autoFocus
          className="mb-1 text-sm"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="mb-1 block text-sm font-medium text-gray-900">
          {table.label}
        </button>
      )}
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
        {table.state === "BUSY" ? "In play" : table.state === "OPEN" ? "Open" : "Closed"}
      </p>
      {error ? <p className="mb-1 text-xs text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {table.state === "BUSY" ? (
          <button onClick={() => void toggle(true)} disabled={busy} className="text-red-600 hover:underline disabled:opacity-40">
            Force release
          </button>
        ) : (
          <button onClick={() => void toggle(false)} disabled={busy} className="text-gray-600 hover:underline disabled:opacity-40">
            {table.state === "OPEN" ? "Close" : "Reopen"}
          </button>
        )}
        <button onClick={() => void remove()} disabled={busy} className="text-red-600 hover:underline disabled:opacity-40">
          Remove
        </button>
      </div>
    </div>
  );
}
