import { useQuery } from "@tanstack/react-query";
import { api, type MeResponse } from "./api";

/**
 * "My current tournament" is the first non-COMPLETE team /api/me returns —
 * a player is realistically only ever mid-tournament at one bar at a time.
 * Shared by the bracket tab (my match) and the chat tab (which tournament's
 * chat to open), so the two screens agree on what "current" means.
 */
export function useCurrentTeam() {
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const myTeam = firstActiveTeam(meQuery.data);
  return { myTeam, isLoading: meQuery.isLoading, me: meQuery.data };
}

function firstActiveTeam(me: MeResponse | undefined) {
  if (!me) return undefined;
  return me.teams.find((t) => t.team.tournament.status !== "COMPLETE");
}
