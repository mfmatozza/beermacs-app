"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "../../../_ui/badge";
import { Button } from "../../../_ui/button";
import { Card, StatCard } from "../../../_ui/card";
import { Field, Input, Select, Toggle } from "../../../_ui/field";
import { PageHeader } from "../../../_ui/page-header";
import type { TournamentAdminData } from "./page";

type Team = TournamentAdminData["teams"][number];
type Stage = TournamentAdminData["stages"][number];
type Round = Stage["rounds"][number];
type Match = Round["matches"][number];
type VenueTable = TournamentAdminData["venue"]["tables"][number];

const STATUS_TONE = {
  DRAFT: "neutral",
  REGISTRATION: "neutral",
  RUNNING: "live",
  COMPLETE: "neutral",
  CANCELED: "dispute",
} as const;

const MATCH_STATE_TONE: Record<string, "neutral" | "live" | "dispute"> = {
  DISPUTED: "dispute",
  ON_TABLE: "live",
};

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

export function TournamentAdminPanel({ tournament: t }: { tournament: TournamentAdminData }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = t.config as {
    playersPerTeam?: number | null;
    chatEnabled?: boolean;
    cupsToWin?: number | null;
    confirmTimeoutMins?: number | null;
    autoRepechageMode?: "auto" | "manual";
  };

  const endTournament = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tournaments/${t.id}/end`, { method: "POST" });
      refresh();
    } catch {
      setError("Couldn't end the tournament.");
    } finally {
      setBusy(false);
    }
  };

  const deleteTournament = async () => {
    if (!confirm(`Permanently delete "${t.name}"? This removes every team, match, and message in it. This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tournaments/${t.id}`, { method: "DELETE" });
      router.push("/admin/tournaments");
    } catch {
      setError("Couldn't delete the tournament.");
      setBusy(false);
    }
  };

  const teamsById = new Map(t.teams.map((team) => [team.id, team.name] as const));
  const matchCount = t.stages.reduce((s, st) => s + st.rounds.reduce((n, r) => n + r.matches.length, 0), 0);
  const disputedCount = t.stages.reduce(
    (s, st) => s + st.rounds.reduce((n, r) => n + r.matches.filter((m) => m.state === "DISPUTED").length, 0),
    0
  );

  return (
    <>
      <Link href="/admin/tournaments" className="mb-3 inline-block text-sm text-gray-500 hover:text-beer-700">
        ← All tournaments
      </Link>
      <PageHeader
        title={t.name}
        subtitle={`${t.venue.name} · join code ${t.joinCode} · ${t.format.replace(/_/g, " ").toLowerCase()}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
            {t.status !== "COMPLETE" ? (
              <Button variant="secondary" onClick={() => void endTournament()} disabled={busy}>
                End
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => void deleteTournament()} disabled={busy}>
              Delete
            </Button>
          </>
        }
      />
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Teams" value={t.teams.length} />
        <StatCard label="Matches" value={matchCount} />
        <StatCard label="Rounds" value={t.stages.reduce((n, s) => n + s.rounds.length, 0)} />
        <StatCard label="Disputed" value={disputedCount} tone={disputedCount > 0 ? "brand" : "plain"} />
      </div>

      <SettingsPanel tournamentId={t.id} config={config} onSaved={refresh} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Bracket</h2>
          {t.stages.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              tournamentEnded={t.status === "COMPLETE"}
              teamsById={teamsById}
              venueTables={t.venue.tables}
              onChanged={refresh}
            />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <TeamsPanel tournamentId={t.id} teams={t.teams} onChanged={refresh} />
        </div>
      </div>
    </>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────

function SettingsPanel({
  tournamentId,
  config,
  onSaved,
}: {
  tournamentId: string;
  config: {
    playersPerTeam?: number | null;
    chatEnabled?: boolean;
    cupsToWin?: number | null;
    confirmTimeoutMins?: number | null;
    autoRepechageMode?: "auto" | "manual";
  };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [playersPerTeam, setPlayersPerTeam] = useState(String(config.playersPerTeam ?? ""));
  const [chatEnabled, setChatEnabled] = useState(config.chatEnabled ?? false);
  const [cupsToWin, setCupsToWin] = useState(config.cupsToWin == null ? "" : String(config.cupsToWin));
  const [confirmTimeoutMins, setConfirmTimeoutMins] = useState(String(config.confirmTimeoutMins ?? ""));
  const [autoRepechageMode, setAutoRepechageMode] = useState(config.autoRepechageMode ?? "auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          playersPerTeam: playersPerTeam ? Number(playersPerTeam) : undefined,
          chatEnabled,
          cupsToWin: cupsToWin === "" ? null : Number(cupsToWin),
          confirmTimeoutMins: confirmTimeoutMins ? Number(confirmTimeoutMins) : undefined,
          autoRepechageMode,
        }),
      });
      onSaved();
    } catch {
      setError("Couldn't save those settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-beer-700">Settings</span>
        <span className="text-xs text-gray-400">{open ? "Hide" : "Edit"}</span>
      </button>

      {open ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Players per team">
              <Input value={playersPerTeam} onChange={(e) => setPlayersPerTeam(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Cups to win" hint="Blank = not scored">
              <Input value={cupsToWin} onChange={(e) => setCupsToWin(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Confirm timeout (min)">
              <Input
                value={confirmTimeoutMins}
                onChange={(e) => setConfirmTimeoutMins(e.target.value)}
                inputMode="numeric"
              />
            </Field>
          </div>
          <Toggle label="Tournament chat" checked={chatEnabled} onChange={setChatEnabled} />
          <Field label="Repêchage mode">
            <Select value={autoRepechageMode} onChange={(e) => setAutoRepechageMode(e.target.value as "auto" | "manual")}>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </Select>
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button onClick={() => void save()} disabled={busy} className="self-start">
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

// ── Bracket ──────────────────────────────────────────────────────────────

function StageCard({
  stage,
  tournamentEnded,
  teamsById,
  venueTables,
  onChanged,
}: {
  stage: Stage;
  tournamentEnded: boolean;
  teamsById: ReadonlyMap<string, string>;
  venueTables: readonly VenueTable[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRound = async (index: number) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/stages/${stage.id}/rounds/${index}/open`, { method: "POST" });
      onChanged();
    } catch {
      setError("Couldn't open that round.");
    } finally {
      setBusy(false);
    }
  };

  // The bottom button only ever creates a genuinely new round beyond the last
  // one that exists — every existing-but-unopened round (round 1's row already
  // exists, unopened, from tournament creation) gets its own "Open" button on
  // its own RoundRow instead, so this never has to guess which round is "next".
  const allOpened = stage.rounds.every((r) => r.status === "OPEN");
  const nextRoundIndex = (stage.rounds[stage.rounds.length - 1]?.index ?? 0) + 1;

  return (
    <Card>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-beer-700">
        {stage.type === "GROUP" ? "Group stage" : "Elimination"}
      </p>
      <div className="flex flex-col gap-4">
        {stage.rounds.map((round) => (
          <RoundRow
            key={round.id}
            round={round}
            tournamentEnded={tournamentEnded}
            teamsById={teamsById}
            venueTables={venueTables}
            onOpen={() => void openRound(round.index)}
            openBusy={busy}
            onChanged={onChanged}
          />
        ))}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!tournamentEnded && allOpened ? (
          <Button variant="secondary" onClick={() => void openRound(nextRoundIndex)} disabled={busy}>
            Open round {nextRoundIndex}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function RoundRow({
  round,
  tournamentEnded,
  teamsById,
  venueTables,
  onOpen,
  openBusy,
  onChanged,
}: {
  round: Round;
  tournamentEnded: boolean;
  teamsById: ReadonlyMap<string, string>;
  venueTables: readonly VenueTable[];
  onOpen: () => void;
  openBusy: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  // Same rule POST /rounds/:id/pair enforces server-side (waitingTeams() in
  // @beermacs/shared): an entrant of this round not yet on either side of
  // any of its matches, in any state — that's who a manual pair can use.
  const pairedIds = new Set(
    round.matches.flatMap((m) => [m.homeTeam?.id, m.awayTeam?.id].filter((id): id is string => Boolean(id)))
  );
  const waitingTeamIds = round.entrants.map((e) => e.teamId).filter((id) => !pairedIds.has(id));

  const togglePause = async () => {
    setBusy(true);
    try {
      await api(`/api/rounds/${round.id}/scheduling`, {
        method: "POST",
        body: JSON.stringify({ paused: !round.schedulingPaused }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-800">Round {round.index}</span>
        <Badge tone={round.status === "OPEN" ? "live" : "neutral"}>
          {round.status === "OPEN" ? "OPEN" : "NOT OPENED"}
        </Badge>
        {round.status === "OPEN" && !tournamentEnded ? (
          <button
            type="button"
            onClick={() => void togglePause()}
            disabled={busy}
            className="ml-auto text-xs text-gray-500 hover:text-beer-700 disabled:opacity-40"
          >
            {round.schedulingPaused ? "Resume auto-dispatch" : "Pause auto-dispatch"}
          </button>
        ) : null}
        {round.status !== "OPEN" && !tournamentEnded ? (
          <button
            type="button"
            onClick={onOpen}
            disabled={openBusy}
            className="ml-auto text-xs font-medium text-beer-700 hover:underline disabled:opacity-40"
          >
            Open
          </button>
        ) : null}
      </div>
      {round.matches.length === 0 ? (
        <p className="text-xs text-gray-400">No matches paired yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {round.matches.map((m) => (
            <MatchRow key={m.id} match={m} tournamentEnded={tournamentEnded} venueTables={venueTables} onChanged={onChanged} />
          ))}
        </div>
      )}
      {round.status === "OPEN" && !tournamentEnded && waitingTeamIds.length >= 2 ? (
        <ManualPairForm roundId={round.id} waitingTeamIds={waitingTeamIds} teamsById={teamsById} onChanged={onChanged} />
      ) : null}
    </div>
  );
}

function ManualPairForm({
  roundId,
  waitingTeamIds,
  teamsById,
  onChanged,
}: {
  roundId: string;
  waitingTeamIds: readonly string[];
  teamsById: ReadonlyMap<string, string>;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pair = async () => {
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rounds/${roundId}/pair`, {
        method: "POST",
        body: JSON.stringify({ homeTeamId, awayTeamId }),
      });
      setHomeTeamId("");
      setAwayTeamId("");
      setOpen(false);
      onChanged();
    } catch {
      setError("Couldn't pair those teams — one may already be on a match.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs font-medium text-beer-700 hover:underline"
      >
        Pair teams manually ({waitingTeamIds.length} waiting)
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2.5">
      <Field label="Home">
        <Select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)} className="text-xs">
          <option value="">Pick a team</option>
          {waitingTeamIds.map((id) => (
            <option key={id} value={id} disabled={id === awayTeamId}>
              {teamsById.get(id) ?? id}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Away">
        <Select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)} className="text-xs">
          <option value="">Pick a team</option>
          {waitingTeamIds.map((id) => (
            <option key={id} value={id} disabled={id === homeTeamId}>
              {teamsById.get(id) ?? id}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        onClick={() => void pair()}
        disabled={busy || !homeTeamId || !awayTeamId || homeTeamId === awayTeamId}
        className="text-xs"
      >
        {busy ? "Pairing…" : "Create match"}
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:underline">
        Cancel
      </button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function MatchRow({
  match,
  tournamentEnded,
  venueTables,
  onChanged,
}: {
  match: Match;
  tournamentEnded: boolean;
  venueTables: readonly VenueTable[];
  onChanged: () => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [tableId, setTableId] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors assign-table/route.ts's own transition() guard: only a match
  // with both slots filled and not already on a table can take one.
  const assignable =
    !tournamentEnded &&
    !match.venueTable &&
    (match.state === "QUEUED" || match.state === "SCHEDULED") &&
    Boolean(match.homeTeam) &&
    Boolean(match.awayTeam);

  const assignTable = async () => {
    if (!tableId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/matches/${match.id}/assign-table`, {
        method: "POST",
        body: JSON.stringify({ tableId }),
      });
      setAssigning(false);
      setTableId("");
      onChanged();
    } catch {
      setError("Couldn't assign that table.");
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    if (!winnerId || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/matches/${match.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ winnerId, reason: reason.trim() }),
      });
      onChanged();
    } catch {
      setError("Couldn't settle that match.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-gray-700">
          {match.homeTeam?.name ?? "TBD"} <span className="text-gray-400">vs</span>{" "}
          {match.awayTeam?.name ?? "TBD"}
        </span>
        <span className="flex items-center gap-2">
          {match.venueTable ? <span className="text-gray-400">{match.venueTable.label}</span> : null}
          <Badge tone={MATCH_STATE_TONE[match.state] ?? "neutral"}>{match.state.replace(/_/g, " ")}</Badge>
          {assignable && venueTables.length > 0 ? (
            <button
              type="button"
              onClick={() => setAssigning((v) => !v)}
              className="font-medium text-beer-700 hover:underline"
            >
              {assigning ? "Cancel" : "Assign table"}
            </button>
          ) : null}
          {match.state === "DISPUTED" && !tournamentEnded ? (
            <button
              type="button"
              onClick={() => setResolving((v) => !v)}
              className="font-medium text-beer-700 hover:underline"
            >
              {resolving ? "Cancel" : "Settle"}
            </button>
          ) : null}
        </span>
      </div>

      {assigning ? (
        <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-gray-200 pt-2">
          <Field label="Table">
            <Select value={tableId} onChange={(e) => setTableId(e.target.value)} className="text-xs">
              <option value="">Pick a table</option>
              {venueTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.label}
                </option>
              ))}
            </Select>
          </Field>
          {error ? <p className="text-red-600">{error}</p> : null}
          <Button onClick={() => void assignTable()} disabled={busy || !tableId} className="self-start text-xs">
            {busy ? "Assigning…" : "Send to table"}
          </Button>
        </div>
      ) : null}

      {resolving ? (
        <div className="mt-2 flex flex-col gap-2 border-t border-gray-200 pt-2">
          <div className="flex gap-2">
            {[match.homeTeam, match.awayTeam].map((team) =>
              team ? (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setWinnerId(team.id)}
                  className={`rounded-lg border px-2.5 py-1.5 ${
                    winnerId === team.id ? "border-beer-500 bg-beer-100 text-beer-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {team.name} won
                </button>
              ) : null
            )}
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (goes in the audit log)"
          />
          {error ? <p className="text-red-600">{error}</p> : null}
          <Button onClick={() => void resolve()} disabled={busy || !winnerId || !reason.trim()} className="self-start">
            {busy ? "Settling…" : "Confirm"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ── Teams ────────────────────────────────────────────────────────────────

function TeamsPanel({
  tournamentId,
  teams,
  onChanged,
}: {
  tournamentId: string;
  teams: readonly Team[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTeam = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tournaments/${tournamentId}/teams/admin-add`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName("");
      onChanged();
    } catch {
      setError("Couldn't add that team.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Teams</h2>
      <Card className="p-0">
        <div className="flex gap-2 border-b border-gray-100 p-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" className="text-sm" />
          <Button onClick={() => void addTeam()} disabled={busy || !name.trim()}>
            Add
          </Button>
        </div>
        {error ? <p className="px-3 py-2 text-xs text-red-600">{error}</p> : null}
        <div className="divide-y divide-gray-100">
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} onChanged={onChanged} />
          ))}
          {teams.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No teams yet.</p> : null}
        </div>
      </Card>
    </>
  );
}

function TeamRow({ team, onChanged }: { team: Team; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState(false);

  const rename = async () => {
    if (!name.trim() || name === team.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/teams/${team.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      onChanged();
    } finally {
      setBusy(false);
      setEditing(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      await api(`/api/teams/${team.id}/withdraw`, { method: "POST", body: JSON.stringify({}) });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${team.name}? This removes the team entirely, not just withdraws it.`)) return;
    setBusy(true);
    try {
      await api(`/api/teams/${team.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm ${team.withdrawn ? "opacity-50" : ""}`}>
      {editing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void rename()}
          onKeyDown={(e) => e.key === "Enter" && void rename()}
          autoFocus
          className="flex-1"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={team.withdrawn ? "text-gray-400 line-through" : "text-gray-800 hover:text-beer-700"}
        >
          {team.name}
        </button>
      )}
      <span className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">R{team.entryRound}</span>
        {!team.withdrawn ? (
          <button onClick={() => void withdraw()} disabled={busy} className="text-gray-500 hover:underline disabled:opacity-40">
            Withdraw
          </button>
        ) : null}
        <button onClick={() => void remove()} disabled={busy} className="text-red-600 hover:underline disabled:opacity-40">
          Delete
        </button>
      </span>
    </div>
  );
}
