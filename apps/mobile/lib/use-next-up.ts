import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Alert } from "react-native";
import type { NextUpState } from "../components/NextUpCard";
import { ApiError, api, type TournamentBoard } from "./api";
import { findMyNextUp, toNextUpState } from "./next-up";

/** Report/confirm/dispute all fail with the same `kind` strings the shared
 *  approval state machine returns (packages/shared/src/approval.ts) — one
 *  mapping for all three rather than three near-identical switch statements. */
function matchActionErrorMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return "Check your connection and try again.";
  switch (e.code) {
    case "self_confirmation":
      return "You can't confirm your own report — the other team needs to.";
    case "wrong_state":
      return "This match has already moved on — the board has refreshed, check it and try again.";
    case "tournament_ended":
      return "This tournament has already ended.";
    case "implausible_score":
      return "That score doesn't add up for this format.";
    default:
      return "Try again in a moment.";
  }
}

function confirmThen(title: string, action: string, onConfirm: () => void) {
  Alert.alert(title, undefined, [
    { text: "Cancel", style: "cancel" },
    { text: action, onPress: onConfirm },
  ]);
}

/**
 * My match's actions + the NextUpCard state, shared by Home (summary card)
 * and the Bracket tab (detail view). Was two copies, and the Bracket one had
 * no error handling at all — a failed report there just silently did nothing.
 */
export function useNextUp(
  tournamentId: string | null,
  myTeamId: string | null,
  board: TournamentBoard | undefined
) {
  const queryClient = useQueryClient();
  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ["board", tournamentId] });
  };
  const reportMutation = useMutation({
    mutationFn: (vars: { matchId: string; winnerId: string }) =>
      api.reportMatch(vars.matchId, { winnerId: vars.winnerId }),
    onSuccess: invalidateBoard,
    onError: (e) => {
      invalidateBoard();
      Alert.alert("Couldn't report the score", matchActionErrorMessage(e));
    },
  });
  const confirmMutation = useMutation({
    mutationFn: (matchId: string) => api.confirmMatch(matchId),
    onSuccess: invalidateBoard,
    onError: (e) => {
      invalidateBoard();
      Alert.alert("Couldn't confirm", matchActionErrorMessage(e));
    },
  });
  const rejectMutation = useMutation({
    mutationFn: (matchId: string) => api.rejectMatch(matchId, {}),
    onSuccess: invalidateBoard,
    onError: (e) => {
      invalidateBoard();
      Alert.alert("Couldn't dispute", matchActionErrorMessage(e));
    },
  });

  const mine = useMemo(() => {
    if (!board || !myTeamId) return null;
    return findMyNextUp(board.stages, myTeamId);
  }, [board, myTeamId]);

  const nextUpState: NextUpState | null = useMemo(() => {
    if (!mine || !myTeamId) return null;
    return toNextUpState(mine, myTeamId, {
      reporting: reportMutation.isPending,
      confirmBusy: confirmMutation.isPending || rejectMutation.isPending,
      onReport: (winnerIsMe) => {
        if (mine.kind !== "match") return;
        const opponentTeamId =
          mine.match.home?.teamId === myTeamId ? mine.match.away?.teamId : mine.match.home?.teamId;
        const winnerId = winnerIsMe ? myTeamId : (opponentTeamId ?? myTeamId);
        confirmThen(winnerIsMe ? "Report that you won?" : "Report that they won?", "Report", () =>
          reportMutation.mutate({ matchId: mine.match.id, winnerId })
        );
      },
      onConfirm: () => {
        if (mine.kind === "match") confirmMutation.mutate(mine.match.id);
      },
      onDispute: () => {
        if (mine.kind !== "match") return;
        confirmThen("Dispute this result?", "Dispute", () => rejectMutation.mutate(mine.match.id));
      },
    });
  }, [mine, myTeamId, reportMutation, confirmMutation, rejectMutation]);

  return { mine, nextUpState };
}
