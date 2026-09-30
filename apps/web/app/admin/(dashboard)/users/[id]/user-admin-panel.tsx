"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorText } from "../../../_ui/api";
import { Badge } from "../../../_ui/badge";
import { Button } from "../../../_ui/button";
import { Card } from "../../../_ui/card";
import { PageHeader } from "../../../_ui/page-header";
import type { UserAdminData } from "./page";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function UserAdminPanel({ user: u }: { user: UserAdminData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (done) setNotice(done);
      router.refresh();
    } catch (e) {
      setError(errorText(e, `Couldn't ${label}.`));
    } finally {
      setBusy(false);
    }
  };

  const post = (action: "ban" | "unban" | "logout") =>
    api(`/api/admin/users/${u.id}`, { method: "POST", body: JSON.stringify({ action }) });

  const ban = () => {
    if (!confirm(`Ban ${u.displayName}? They're signed out everywhere and can't sign back in.`)) return;
    void run("ban this account", () => post("ban"), "Banned.");
  };
  const unban = () => void run("unban this account", () => post("unban"), "Unbanned. They can sign in again.");
  const logout = () =>
    void run("sign them out", () => post("logout"), "Signed out of every device.");
  const remove = () => {
    if (
      prompt(`Type DELETE to permanently delete ${u.displayName}'s account. This cannot be undone.`) !== "DELETE"
    )
      return;
    void run("delete this account", async () => {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      router.push("/admin/users");
    });
  };
  const leaveTeam = (teamId: string, teamName: string) => {
    if (!confirm(`Remove ${u.displayName} from ${teamName}?`)) return;
    void run("remove them from that team", () =>
      api(`/api/teams/${teamId}/members/${u.id}`, { method: "DELETE" })
    );
  };
  const unmute = (tournamentId: string) =>
    void run("unmute", () =>
      api(`/api/tournaments/${tournamentId}/players/${u.id}/mute`, { method: "DELETE" })
    );

  return (
    <>
      <PageHeader
        title={u.displayName}
        subtitle={`${u.email ?? "no email"}${u.phone ? ` · ${u.phone}` : ""} · joined ${fmt.format(u.createdAt)}`}
        actions={
          <>
            {u.bannedAt ? <Badge tone="dispute">Banned {fmt.format(u.bannedAt)}</Badge> : null}
            <Button variant="secondary" onClick={logout} disabled={busy || u._count.sessions === 0}>
              Sign out everywhere
            </Button>
            {u.bannedAt ? (
              <Button variant="secondary" onClick={unban} disabled={busy}>
                Unban
              </Button>
            ) : (
              <Button variant="danger" onClick={ban} disabled={busy}>
                Ban
              </Button>
            )}
            <Button variant="danger" onClick={remove} disabled={busy}>
              Delete account
            </Button>
          </>
        }
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-green-700">{notice}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <h2 className="px-4 pt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Teams</h2>
          <div className="divide-y divide-gray-100">
            {u.teamMembers.map(({ team, isCaptain }) => (
              <div key={team.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <span className="block text-gray-800">
                    {team.name}
                    {isCaptain ? <span className="ml-1.5 text-xs text-gray-400">captain</span> : null}
                  </span>
                  <Link
                    href={`/admin/tournaments/${team.tournament.id}`}
                    className="block text-xs text-gray-500 hover:text-beer-700"
                  >
                    {team.tournament.name} · {team.tournament.status}
                  </Link>
                </span>
                <button
                  onClick={() => leaveTeam(team.id, team.name)}
                  disabled={busy}
                  className="py-1 text-xs text-red-600 hover:underline disabled:opacity-40"
                >
                  Remove from team
                </button>
              </div>
            ))}
            {u.teamMembers.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No teams.</p> : null}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Venue roles</h2>
              <Link href="/admin/access" className="text-xs text-beer-700 hover:underline">
                Manage
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5 p-4">
              {u.memberships.map((m) => (
                <Badge key={m.venue.id} tone={m.role === "PLAYER" ? "neutral" : "brand"}>
                  {m.venue.name} · {m.role.replace("VENUE_", "")}
                </Badge>
              ))}
              {u.memberships.length === 0 ? <span className="text-sm text-gray-400">None.</span> : null}
            </div>
          </Card>

          <Card className="p-0">
            <h2 className="px-4 pt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Chat mutes</h2>
            <div className="divide-y divide-gray-100">
              {u.mutedIn.map((m) => (
                <div key={m.tournament.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span>
                    <span className="block text-gray-800">{m.tournament.name}</span>
                    {m.reason ? <span className="block text-xs text-gray-500">{m.reason}</span> : null}
                  </span>
                  <button
                    onClick={() => unmute(m.tournament.id)}
                    disabled={busy}
                    className="py-1 text-xs text-beer-700 hover:underline disabled:opacity-40"
                  >
                    Unmute
                  </button>
                </div>
              ))}
              {u.mutedIn.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">Not muted anywhere.</p> : null}
            </div>
          </Card>

          <p className="text-xs text-gray-400">
            {u._count.sessions} active session{u._count.sessions === 1 ? "" : "s"} · {u._count.messages} chat
            message{u._count.messages === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </>
  );
}
