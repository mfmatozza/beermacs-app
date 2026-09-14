"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../_ui/badge";
import { Button } from "../../_ui/button";
import { Card } from "../../_ui/card";
import { Field, Input, Select } from "../../_ui/field";
import { ShieldIcon } from "../../_ui/icons";
import { PageHeader } from "../../_ui/page-header";

interface Venue {
  id: string;
  name: string;
}

interface FoundUser {
  id: string;
  displayName: string;
  email: string;
  memberships: readonly { role: string; venue: { id: string; name: string } }[];
}

const ROLES = ["PLAYER", "VENUE_STAFF", "VENUE_ADMIN", "VENUE_OWNER"] as const;
const ROLE_LABEL: Record<string, string> = {
  PLAYER: "Player",
  VENUE_STAFF: "Staff",
  VENUE_ADMIN: "Admin",
  VENUE_OWNER: "Owner",
};

export default function AccessPage() {
  return (
    <>
      <PageHeader
        title="Access"
        subtitle="Grant or revoke a venue role for any account — the only way this happens outside a database script."
      />
      <GrantPanel />
    </>
  );
}

function GrantPanel() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<FoundUser | null | undefined>(undefined);
  const [venueId, setVenueId] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("VENUE_STAFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/venues")
      .then((r) => r.json())
      .then((d) => setVenues(d.venues ?? []));
  }, []);

  const search = async () => {
    if (!email.trim()) return;
    setError(null);
    setBusy(true);
    setSearched(true);
    const res = await fetch(`/api/admin/access?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    const data = await res.json();
    setFound(data.user ?? null);
    setBusy(false);
  };

  const grant = async () => {
    if (!venueId) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), venueId, role }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't grant that role.");
      return;
    }
    setVenueId("");
    void search();
  };

  const revoke = async (uid: string, vid: string) => {
    setBusy(true);
    await fetch(`/api/admin/access?userId=${uid}&venueId=${vid}`, { method: "DELETE" });
    setBusy(false);
    void search();
  };

  return (
    <Card className="max-w-2xl">
      <Field label="Account email" hint="The email they signed up with.">
        <div className="flex gap-2">
          <Input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSearched(false);
              setFound(undefined);
            }}
            onKeyDown={(e) => e.key === "Enter" && void search()}
            placeholder="name@example.com"
          />
          <Button type="button" variant="secondary" onClick={() => void search()} disabled={!email.trim() || busy}>
            Look up
          </Button>
        </div>
      </Field>

      {searched && found === null ? (
        <p className="mt-4 text-sm text-gray-500">No account with that email.</p>
      ) : null}

      {found ? (
        <div className="mt-5 flex flex-col gap-5 border-t border-gray-100 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beer-100 text-sm font-semibold uppercase text-beer-700">
              {found.displayName.charAt(0)}
            </span>
            <div>
              <p className="font-medium text-gray-900">{found.displayName}</p>
              <p className="text-xs text-gray-500">{found.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current access</p>
            {found.memberships.length === 0 ? (
              <p className="text-sm text-gray-400">No venue roles yet.</p>
            ) : (
              found.memberships.map((m) => (
                <div key={m.venue.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-gray-800">
                    {m.venue.name}
                    <Badge tone={m.role === "PLAYER" ? "neutral" : "brand"}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  </span>
                  <button
                    onClick={() => void revoke(found.id, m.venue.id)}
                    disabled={busy}
                    className="text-xs font-medium uppercase tracking-wide text-red-600 hover:underline disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Grant a role</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="max-w-[220px]">
                <option value="">Choose a venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                className="max-w-[160px]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
              <Button type="button" onClick={() => void grant()} disabled={!venueId || busy}>
                Grant
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {!found && !searched ? (
        <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-5 text-sm text-gray-400">
          <ShieldIcon size={16} />
          Look up an account to grant or revoke access.
        </div>
      ) : null}
    </Card>
  );
}
