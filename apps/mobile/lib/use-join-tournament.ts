import { useCallback, useState } from "react";
import { isCompleteJoinCode, normaliseJoinCode } from "@beermacs/shared";
import { ApiError, api } from "./api";
import { usePendingTournamentStore } from "./pending-tournament";
import { registerForPush } from "./push";

/**
 * The one action Home exists for: turn a code (typed, or lifted from a
 * `beermacs://join/<code>` link — see app/join/[code].tsx, which calls this
 * same hook rather than re-implementing it) into "I'm in this tournament,
 * now go form or join a team". Shared so the two entry points can't drift.
 */
export function joinErrorMessage(code: string): string {
  switch (code) {
    case "unknown_code":
      return "No tournament with that code. Check the table tent.";
    case "registration_not_open":
      return "That tournament hasn't opened for registration yet.";
    case "tournament_finished":
      return "That tournament has already finished.";
    case "not_signed_in":
      return "Couldn't reach the bar's tournament. Check your connection.";
    case "network_timeout":
      return "Taking too long to reach the server. Check your connection and try again.";
    case "network_error":
      return "Couldn't reach the server. Check your connection and try again.";
    default:
      return "Couldn't join just now. Try again in a moment.";
  }
}

export function useJoinTournament(displayName: string | undefined) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setPending = usePendingTournamentStore((s) => s.setPending);

  const join = useCallback(
    async (rawCode: string) => {
      const code = normaliseJoinCode(rawCode);
      if (!isCompleteJoinCode(code)) return false;
      setJoining(true);
      setError(null);
      try {
        const res = await api.join({ code, displayName: displayName ?? "" });
        setPending({
          tournamentId: res.tournament.id,
          tournamentName: res.tournament.name,
          venueName: res.venue.name,
        });
        // First moment the app has something worth paging you about (U-15) —
        // see the same call site's rationale, carried over from the old Home.
        void registerForPush();
        return true;
      } catch (e) {
        setError(joinErrorMessage(e instanceof ApiError ? e.code : "unknown"));
        return false;
      } finally {
        setJoining(false);
      }
    },
    [displayName, setPending]
  );

  return { join, joining, error, clearError: () => setError(null) };
}
