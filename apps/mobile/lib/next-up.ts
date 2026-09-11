import type { BoardMatch, BoardStage } from "./api";
import type { NextUpState } from "../components/NextUpCard";

/**
 * "What's my status in this tournament right now" — shared by the bracket
 * tab (the detail view) and Home (the summary card), so the two screens
 * can never disagree about whether a player is waiting, playing, or has a
 * result to answer for. Extracted from bracket.tsx once Home needed the
 * exact same computation, rather than left to drift as two copies.
 */
export type MyNextUp =
  | { readonly kind: "match"; readonly match: BoardMatch; readonly roundIndex: number }
  | { readonly kind: "waiting"; readonly roundIndex: number };

export function findMyNextUp(stages: readonly BoardStage[], myTeamId: string): MyNextUp | null {
  for (const stage of stages) {
    for (const round of stage.rounds) {
      const match = round.matches.find(
        (m) =>
          m.state !== "confirmed" && (m.home?.teamId === myTeamId || m.away?.teamId === myTeamId)
      );
      if (match) return { kind: "match", match, roundIndex: round.index };
    }
  }
  for (const stage of stages) {
    for (const round of stage.rounds) {
      if (!round.entrantTeamIds.includes(myTeamId)) continue;
      const alreadyPlayed = round.matches.some(
        (m) => m.home?.teamId === myTeamId || m.away?.teamId === myTeamId
      );
      if (!alreadyPlayed) return { kind: "waiting", roundIndex: round.index };
    }
  }
  return null;
}

export function toNextUpState(
  mine: MyNextUp,
  myTeamId: string,
  actions: {
    reporting: boolean;
    confirmBusy: boolean;
    onReport: (winnerIsMe: boolean) => void;
    onConfirm: () => void;
    onDispute: () => void;
  }
): NextUpState {
  if (mine.kind === "waiting") return { kind: "waiting_to_be_paired" };

  const { match } = mine;
  const opponent = (match.home?.teamId === myTeamId ? match.away?.name : match.home?.name) ?? "TBD";

  switch (match.state) {
    case "on_table":
      return {
        kind: "on_table",
        opponent,
        tableLabel: match.tableLabel ?? "—",
        reporting: actions.reporting,
        onReport: actions.onReport,
      };
    case "reported": {
      if (match.pendingReport?.reportedByTeamId === myTeamId) {
        return { kind: "reported_mine", opponent };
      }
      const opponentTeamId =
        match.home?.teamId === myTeamId ? match.away?.teamId : match.home?.teamId;
      return {
        kind: "reported_theirs",
        opponent,
        theyClaimedThemselves: match.pendingReport?.winnerId === opponentTeamId,
        busy: actions.confirmBusy,
        onConfirm: actions.onConfirm,
        onDispute: actions.onDispute,
      };
    }
    case "disputed":
      return { kind: "disputed", opponent };
    default:
      return { kind: "waiting_for_table", opponent };
  }
}
