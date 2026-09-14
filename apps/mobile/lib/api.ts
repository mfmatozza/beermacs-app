// Typed client for our own route handlers.
//
// Separate from `authClient`, which only speaks to /api/auth. This carries the
// session cookie that @better-auth/expo stores, so the handlers' `requireViewer`
// sees the same user.

import type {
  AdminAddTeamInput,
  AssignTableInput,
  CreateTeamInput,
  CreateTournamentInput,
  JoinTeamInput,
  JoinTournamentInput,
  ManualPairInput,
  PushPreferencesInput,
  RejectResultInput,
  RepechageInput,
  ReportResultInput,
  SendAdminMessageInput,
  SetRoundSchedulingInput,
  SetTableStateInput,
  StaffResolveInput,
  UpdateAvatarInput,
  UpdateTournamentInput,
  WithdrawTeamInput,
} from "@beermacs/shared";
import { authClient } from "./auth-client";
import { API_URL } from "./config";
import { withTimeout } from "./with-timeout";

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

  let res: Response;
  try {
    res = await withTimeout(
      fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...init?.headers,
        },
      })
    );
  } catch {
    // fetch() rejecting (no connection, DNS failure, etc.) is what turns
    // into an error a screen can show, rather than an unhandled rejection —
    // every caller already handles a thrown ApiError; see e.g.
    // use-join-tournament.ts's joinErrorMessage default branch.
    throw new ApiError(0, "network_error");
  }

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
  readonly user: {
    id: string;
    displayName: string;
    email: string;
    phone: string;
    image: string | null;
  };
  readonly memberships: readonly {
    role: string;
    venue: { id: string; name: string; slug: string; city: string | null };
  }[];
  readonly teams: readonly {
    isCaptain: boolean;
    team: {
      id: string;
      name: string;
      joinCode: string;
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
  readonly venueId: string;
  readonly config: {
    playersPerTeam: number | null;
    chatEnabled: boolean;
    cupsToWin: number | null;
    confirmTimeoutMins: number | null;
    autoRepechageMode: "auto" | "manual" | null;
  };
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

// ── Chat (U-8/U-9/U-10) and moderation (App Store guideline 1.2) ────────

export interface ChatMessage {
  readonly id: string;
  readonly authorId: string | null;
  readonly authorName: string | null;
  readonly body: string;
  readonly createdAt: string;
  readonly flaggedAt: string | null;
}

export interface TournamentHistoryEntry {
  readonly tournamentId: string;
  readonly tournamentName: string;
  readonly venueName: string;
  readonly venueCity: string | null;
  readonly endedAt: string | null;
  readonly teamName: string;
  readonly wins: number;
  readonly losses: number;
}

export interface NotificationPreferences {
  readonly match: boolean;
  readonly news: boolean;
}

// ── Admin console (A-1..A-21) — the parts the mobile UI didn't expose yet,
// even though every one of these routes was already built and verified
// against Neon (docs/ROADMAP.md Phase 3). ──────────────────────────────────

export interface TeamRosterEntry {
  readonly id: string;
  readonly name: string;
  readonly joinCode: string;
  readonly entryRound: number;
  readonly withdrawn: boolean;
}

export interface VenuePlayer {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly phone: string;
  readonly role: string;
  readonly joinedAt: string;
}

export interface DispatchSummary {
  readonly newMatches: number;
  readonly autoRepechages: number;
  readonly tableAssignments: number;
}

export const api = {
  me: () => request<MeResponse>("/api/me"),
  history: () => request<{ entries: readonly TournamentHistoryEntry[] }>("/api/me/history"),
  setAvatar: (body: UpdateAvatarInput) =>
    request<{ image: string }>("/api/me/avatar", { method: "PUT", body: JSON.stringify(body) }),
  removeAvatar: () => request<{ image: null }>("/api/me/avatar", { method: "DELETE" }),
  notificationPreferences: () =>
    request<NotificationPreferences>("/api/push/preferences"),
  setNotificationPreferences: (body: PushPreferencesInput) =>
    request<{ ok: boolean }>("/api/push/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
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
    request<{ id: string; name: string; entryRound: number; joinCode: string }>(
      `/api/tournaments/${tournamentId}/teams`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  joinTeam: (body: JoinTeamInput) =>
    request<{ team: { id: string; name: string }; tournament: { id: string; name: string } }>(
      "/api/teams/join",
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
  endTournament: (tournamentId: string) =>
    request<{ id: string; status: string }>(`/api/tournaments/${tournamentId}/end`, {
      method: "POST",
    }),
  deleteTournament: (tournamentId: string) =>
    request<{ id: string; deleted: boolean }>(`/api/tournaments/${tournamentId}`, {
      method: "DELETE",
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
  tournamentChat: (tournamentId: string) =>
    request<{ channelId: string; messages: readonly ChatMessage[] }>(
      `/api/tournaments/${tournamentId}/chat/messages`
    ),
  sendTournamentChat: (tournamentId: string, body: string) =>
    request<{ id: string; channelId: string }>(`/api/tournaments/${tournamentId}/chat/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  matchChat: (matchId: string) =>
    request<{ channelId: string; messages: readonly ChatMessage[] }>(
      `/api/matches/${matchId}/chat/messages`
    ),
  sendMatchChat: (matchId: string, body: string) =>
    request<{ id: string; channelId: string }>(`/api/matches/${matchId}/chat/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  staffMessages: (tournamentId: string) =>
    request<{ messages: readonly ChatMessage[] }>(
      `/api/tournaments/${tournamentId}/chat/staff-messages`
    ),
  reportMessage: (messageId: string) =>
    request<{ id: string; flagged: boolean }>(`/api/chat/messages/${messageId}/report`, {
      method: "POST",
    }),
  blockUser: (userId: string) =>
    request<{ blockedUserId: string; blocked: boolean }>(`/api/users/${userId}/block`, {
      method: "POST",
    }),
  unblockUser: (userId: string) =>
    request<{ blockedUserId: string; blocked: boolean }>(`/api/users/${userId}/block`, {
      method: "DELETE",
    }),
  muteInTournament: (tournamentId: string, userId: string, reason?: string) =>
    request<{ userId: string; muted: boolean }>(
      `/api/tournaments/${tournamentId}/players/${userId}/mute`,
      { method: "POST", body: JSON.stringify({ reason }) }
    ),
  deleteChatMessage: (messageId: string) =>
    request<{ id: string; deleted: boolean }>(`/api/chat/messages/${messageId}`, {
      method: "DELETE",
    }),

  // ── Admin console: teams (A-7..A-11) ────────────────────────────────────
  listTeams: (tournamentId: string) =>
    request<{ teams: readonly TeamRosterEntry[] }>(`/api/tournaments/${tournamentId}/teams`),
  adminAddTeam: (tournamentId: string, body: AdminAddTeamInput) =>
    request<{ id: string; name: string; entryRound: number; joinCode: string }>(
      `/api/tournaments/${tournamentId}/teams/admin-add`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  withdrawTeam: (teamId: string, body: WithdrawTeamInput = {}) =>
    request<{ id: string; withdrawn: boolean }>(`/api/teams/${teamId}/withdraw`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  manualPair: (roundId: string, body: ManualPairInput) =>
    request<{ matchId: string }>(`/api/rounds/${roundId}/pair`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  repechage: (roundId: string, body: RepechageInput = {}) =>
    request<{ roundId: string; teamId: string }>(`/api/rounds/${roundId}/repechage`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Admin console: disputes (A-12) ──────────────────────────────────────
  resolveMatch: (matchId: string, body: StaffResolveInput) =>
    request<{ id: string; state: MatchStateName; winnerId: string | null }>(
      `/api/matches/${matchId}/resolve`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  // ── Admin console: tables (A-3/A-4) ─────────────────────────────────────
  assignTable: (matchId: string, body: AssignTableInput) =>
    request<{ id: string; tableId: string; state: MatchStateName }>(
      `/api/matches/${matchId}/assign-table`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  setTableState: (tableId: string, body: SetTableStateInput) =>
    request<{ id: string; state: "open" | "closed" }>(`/api/tables/${tableId}/state`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  runDispatch: (venueId: string) =>
    request<DispatchSummary>(`/api/venues/${venueId}/dispatch/run`, { method: "POST" }),

  // ── Admin console: players (A-21) ───────────────────────────────────────
  listPlayers: (venueId: string) =>
    request<{ players: readonly VenuePlayer[] }>(`/api/venues/${venueId}/players`),

  // ── Admin console: messaging (A-18/A-19) ────────────────────────────────
  sendAdminMessage: (tournamentId: string, body: SendAdminMessageInput) =>
    request<{ id: string; channelId: string; channelKind: string }>(
      `/api/tournaments/${tournamentId}/messages`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  // ── Admin console: settings (A-6) ───────────────────────────────────────
  updateTournament: (tournamentId: string, body: UpdateTournamentInput) =>
    request<{ id: string; format: string }>(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
