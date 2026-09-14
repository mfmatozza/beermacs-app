"use client";

import { useEffect, useState } from "react";

interface Venue {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  _count: { memberships: number; tournaments: number };
}

interface FoundUser {
  id: string;
  displayName: string;
  email: string;
  memberships: readonly { role: string; venue: { id: string; name: string } }[];
}

const ROLES = ["PLAYER", "VENUE_STAFF", "VENUE_ADMIN", "VENUE_OWNER"] as const;

export default function AccessPage() {
  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-3xl uppercase tracking-wide text-white">Access</h1>
      <VenuesPanel />
      <GrantPanel />
    </div>
  );
}

function VenuesPanel() {
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch("/api/admin/venues")
      .then((r) => r.json())
      .then((d) => setVenues(d.venues));

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setBusy(true);
    await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, city: city || undefined }),
    });
    setName("");
    setCity("");
    setBusy(false);
    void load();
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-xl uppercase text-beer-500">Venues</h2>
      <div className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New venue name"
          className="rounded-lg border border-white/15 bg-stout-800 px-3 py-2 text-sm text-beer-100 outline-none focus:border-beer-500"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City (optional)"
          className="rounded-lg border border-white/15 bg-stout-800 px-3 py-2 text-sm text-beer-100 outline-none focus:border-beer-500"
        />
        <button
          onClick={() => void create()}
          disabled={!name.trim() || busy}
          className="rounded-lg bg-beer-500 px-4 py-2 text-sm font-semibold text-stout-900 disabled:opacity-40"
        >
          Add venue
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-beer-100/50">
              <th className="p-3">Name</th>
              <th className="p-3">City</th>
              <th className="p-3">Members</th>
              <th className="p-3">Tournaments</th>
            </tr>
          </thead>
          <tbody>
            {venues?.map((v) => (
              <tr key={v.id} className="border-b border-white/5 last:border-0">
                <td className="p-3 text-white">{v.name}</td>
                <td className="p-3 text-beer-100/60">{v.city ?? "—"}</td>
                <td className="p-3 text-beer-100/60">{v._count.memberships}</td>
                <td className="p-3 text-beer-100/60">{v._count.tournaments}</td>
              </tr>
            ))}
            {venues && venues.length === 0 ? (
              <tr>
                <td className="p-3 text-beer-100/50" colSpan={4}>
                  No venues yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
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

  useEffect(() => {
    void fetch("/api/admin/venues")
      .then((r) => r.json())
      .then((d) => setVenues(d.venues ?? []));
  }, []);

  const search = async () => {
    setError(null);
    setBusy(true);
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
    void search();
  };

  const revoke = async (uid: string, vid: string) => {
    setBusy(true);
    await fetch(`/api/admin/access?userId=${uid}&venueId=${vid}`, { method: "DELETE" });
    setBusy(false);
    void search();
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-xl uppercase text-beer-500">Grant or revoke access</h2>
      <div className="mb-4 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Account email"
          className="w-64 rounded-lg border border-white/15 bg-stout-800 px-3 py-2 text-sm text-beer-100 outline-none focus:border-beer-500"
        />
        <button
          onClick={() => void search()}
          disabled={!email.trim() || busy}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-beer-100 disabled:opacity-40"
        >
          Look up
        </button>
      </div>

      {found === null ? (
        <p className="text-sm text-beer-100/60">No account with that email.</p>
      ) : found ? (
        <div className="rounded-xl border border-white/10 bg-stout-800 p-4">
          <p className="mb-3 text-sm text-white">
            {found.displayName} <span className="text-beer-100/50">— {found.email}</span>
          </p>

          <div className="mb-4 flex flex-col gap-1">
            {found.memberships.length === 0 ? (
              <p className="text-sm text-beer-100/50">No venue roles yet.</p>
            ) : (
              found.memberships.map((m) => (
                <div key={m.venue.id} className="flex items-center justify-between rounded-lg bg-stout-900 px-3 py-2 text-sm">
                  <span className="text-beer-100">
                    {m.venue.name} — <span className="text-beer-400">{m.role}</span>
                  </span>
                  <button
                    onClick={() => void revoke(found.id, m.venue.id)}
                    disabled={busy}
                    className="text-xs uppercase tracking-wide text-dispute hover:underline"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="rounded-lg border border-white/15 bg-stout-900 px-3 py-2 text-sm text-beer-100"
            >
              <option value="">Choose a venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              className="rounded-lg border border-white/15 bg-stout-900 px-3 py-2 text-sm text-beer-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={() => void grant()}
              disabled={!venueId || busy}
              className="rounded-lg bg-beer-500 px-4 py-2 text-sm font-semibold text-stout-900 disabled:opacity-40"
            >
              Grant
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-dispute">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
