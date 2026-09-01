// Typed client for our own route handlers.
//
// Separate from `authClient`, which only speaks to /api/auth. This carries the
// session cookie that @better-auth/expo stores, so the handlers' `requireViewer`
// sees the same user.

import type { JoinTournamentInput } from "@beermacs/shared";
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
  readonly user: { id: string; displayName: string; isAnonymous: boolean };
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

export const api = {
  me: () => request<MeResponse>("/api/me"),
  join: (body: JoinTournamentInput) =>
    request<JoinResponse>("/api/tournaments/join", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
