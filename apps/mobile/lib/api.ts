// Typed client for our own route handlers.
//
// Separate from `authClient`, which only speaks to /api/auth. This carries the
// session cookie that @better-auth/expo stores, so the handlers' `requireViewer`
// sees the same user.

import type {
  CreateTeamInput,
  CreateTournamentInput,
  JoinTournamentInput,
  RejectResultInput,
  ReportResultInput,
  SetRoundSchedulingInput,
} from "@beermacs/shared";
import { authClient } from "./auth-client";
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // The expo client keeps the session in SecureStore, so reading it is async.
  const cookie = await authClient.getCookie();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) code = body.error;
    } catch {
      // Non-JSON error body; the status code is all we have.
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

// ── Shapes the handlers return. Kept here rather than in @beermacs/shared
// because they are response shapes, not rules — see docs/ARCHITECTURE.md.

export interface MeResponse {
  readonly user: { id: string; displayName: string; email: string; phone: string };
  readonly memberships: readonly {
    role: string;
    venue: { id: string; name: string; slug: string; city: string | null };
  }[];
  readonly teams: readonly {
    isCaptain: boolean;
    team: {
      id: string;
      name: string;
      tournament: { id: string; name: string; status: string; venueId: string };
    };
  }[];
}

export interface JoinResponse {
  readonly tournament: { id: string; name: string; status: string };
  readonly venue: { id: string; name: string; city: string | null };
}

export interface CreateTournamentResponse {
  readonly id: string;
  readonly name: string;
  readonly joinCode: string;
  readonly status: string;
}

export interface TournamentListItem {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly status: string;
  readonly joinCode: string;
}

export interface RoundSummary {
  readonly id: string;
  readonly index: number;
  readonly status: "open" | "not_opened";
  readonly schedulingPaused: boolean;
  readonly matchCount: number;
  readonly waitingCount: number;
}

export interface StageSummary {
  readonly id: string;
  readonly type: "GROUP" | "ELIMINATION";
  readonly order: number;
  readonly advanceCount: number | null;
  readonly rounds: readonly RoundSummary[];
}

export interface TournamentDetail {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly status: string;
  readonly joinCode: string;
  readonly stages: readonly StageSummary[];
  readonly tables: readonly { id: string; label: string; state: string; sortOrder: number }[];
}

// ── The public board (U-7/E-5) ───────────────────────────────────────────

export type MatchStateName =
  "scheduled" | "queued" | "on_table" | "reported" | "disputed" | "confirmed";

export interface BoardTeam {
  readonly teamId: string;
  readonly name: string;
  readonly viaRepechage: boolean;
}

export interface BoardPendingReport {
  readonly reportedByTeamId: string;
  readonly winnerId: string;
  readonly score: { home: number; away: number } | null;
  readonly at: string;
}

export interface BoardMatch {
  readonly id: string;
  readonly position: number;
  readonly state: MatchStateName;
  readonly home: BoardTeam | null;
  readonly away: BoardTeam | null;
  readonly winnerTeamId: string | null;
  readonly score: { home: number; away: number } | null;
  readonly tableLabel: string | null;
  readonly pendingReport: BoardPendingReport | null;
}

export interface BoardRound {
  readonly id: string;
  readonly index: number;
  readonly status: "open" | "not_opened";
  /** Teams belonging to this round with no match yet — just added, or
   *  repêchaged, and not yet paired (E-6/E-7). */
  readonly entrantTeamIds: readonly string[];
  readonly matches: readonly BoardMatch[];
}

export interface BoardStage {
  readonly id: string;
  readonly type: "GROUP" | "ELIMINATION";
  readonly order: number;
  readonly rounds: readonly BoardRound[];
}

export interface TournamentBoard {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly status: string;
  readonly config: { cupsToWin: number | null; playersPerTeam: number | null };
  readonly stages: readonly BoardStage[];
}

export const api = {
  me: () => request<MeResponse>("/api/me"),
  join: (body: JoinTournamentInput) =>
    request<JoinResponse>("/api/tournaments/join", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createTournament: (venueId: string, body: CreateTournamentInput) =>
    request<CreateTournamentResponse>(`/api/venues/${venueId}/tournaments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listTournaments: (venueId: string) =>
    request<{ tournaments: readonly TournamentListItem[] }>(`/api/venues/${venueId}/tournaments`),
  tournamentDetail: (tournamentId: string) =>
    request<TournamentDetail>(`/api/tournaments/${tournamentId}`),
  createTeam: (tournamentId: string, body: CreateTeamInput) =>
    request<{ id: string; name: string; entryRound: number }>(
      `/api/tournaments/${tournamentId}/teams`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  openRound: (stageId: string, index: number) =>
    request<{ id: string; index: number; status: string }>(
      `/api/stages/${stageId}/rounds/${index}/open`,
      { method: "POST" }
    ),
  setRoundScheduling: (roundId: string, body: SetRoundSchedulingInput) =>
    request<{ id: string; schedulingPaused: boolean }>(`/api/rounds/${roundId}/scheduling`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  board: (tournamentId: string) =>
    request<TournamentBoard>(`/api/tournaments/${tournamentId}/board`),
  reportMatch: (matchId: string, body: ReportResultInput) =>
    request<{ id: string; state: MatchStateName }>(`/api/matches/${matchId}/report`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  confirmMatch: (matchId: string) =>
    request<{ id: string; state: MatchStateName; winnerId: string | null }>(
      `/api/matches/${matchId}/confirm`,
      { method: "POST", body: JSON.stringify({}) }
    ),
  rejectMatch: (matchId: string, body: RejectResultInput) =>
    request<{ id: string; state: MatchStateName }>(`/api/matches/${matchId}/reject`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  registerDevice: (expoPushToken: string, platform: "IOS" | "ANDROID") =>
    request<{ id: string }>("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ expoPushToken, platform }),
    }),
};
