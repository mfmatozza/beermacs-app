import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  api,
  type BoardMatch,
  type BoardRound,
  type BoardStage,
  type MeResponse,
} from "../../lib/api";
import { TAB_BAR_HEIGHT, raw } from "../../lib/theme";
import NextUpCard, { type NextUpState } from "../../components/NextUpCard";

/**
 * Bracket & standings (U-7/E-5) — public, so this screen needs only a
 * session, not a role. My own match (U-5/U-6/U-11..U-13) sits above the
 * bracket when I have one in this tournament; see the tab order rationale
 * in ../(tabs)/_layout.tsx ("where is my match" is this tab, not Home).
 *
 * "My current tournament" is the first non-COMPLETE team /api/me returns.
 * A player is realistically only ever mid-tournament at one bar at a time;
 * picking between several is real UI this doesn't try to half-build.
 *
 * No table strip / dispatch queue here on purpose — that view is the venue's
 * own night-of running console (already built, staff-only), not something
 * the spec asks a player to see. A player's own table is the one line in
 * their own NextUpCard.
 */
export default function BracketTab() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const myTeam = firstActiveTeam(meQuery.data);
  const tournamentId = myTeam?.team.tournament.id ?? null;

  const boardQuery = useQuery({
    queryKey: ["board", tournamentId],
    queryFn: () => api.board(tournamentId!),
    enabled: tournamentId !== null,
    // Roadmap D: polling at 2-4s until a pilot night shows it isn't enough.
    refetchInterval: 3000,
  });

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ["board", tournamentId] });
  };

  const reportMutation = useMutation({
    mutationFn: (vars: { matchId: string; winnerId: string }) =>
      api.reportMatch(vars.matchId, { winnerId: vars.winnerId }),
    onSuccess: invalidateBoard,
  });
  const confirmMutation = useMutation({
    mutationFn: (matchId: string) => api.confirmMatch(matchId),
    onSuccess: invalidateBoard,
  });
  const rejectMutation = useMutation({
    mutationFn: (matchId: string) => api.rejectMatch(matchId, {}),
    onSuccess: invalidateBoard,
  });

  const mine = useMemo(() => {
    if (!boardQuery.data || !myTeam) return null;
    return findMyNextUp(boardQuery.data.stages, myTeam.team.id);
  }, [boardQuery.data, myTeam]);

  const nextUpState: NextUpState | null = useMemo(() => {
    if (!mine || !myTeam) return null;
    return toNextUpState(mine, myTeam.team.id, {
      reporting: reportMutation.isPending,
      confirmBusy: confirmMutation.isPending || rejectMutation.isPending,
      onReport: (winnerIsMe) => {
        if (mine.kind !== "match") return;
        const opponentTeamId =
          mine.match.home?.teamId === myTeam.team.id
            ? mine.match.away?.teamId
            : mine.match.home?.teamId;
        const winnerId = winnerIsMe ? myTeam.team.id : (opponentTeamId ?? myTeam.team.id);
        reportMutation.mutate({ matchId: mine.match.id, winnerId });
      },
      onConfirm: () => {
        if (mine.kind === "match") confirmMutation.mutate(mine.match.id);
      },
      onDispute: () => {
        if (mine.kind === "match") rejectMutation.mutate(mine.match.id);
      },
    });
  }, [mine, myTeam, reportMutation, confirmMutation, rejectMutation]);

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-6 px-4"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
          {boardQuery.data?.name ?? "Bracket"}
        </Text>
        {boardQuery.data?.config.cupsToWin ? (
          <Text className="font-sans text-[13px] text-cream-dim">
            {`${boardQuery.data.config.cupsToWin} cups to win`}
          </Text>
        ) : null}
      </View>

      {meQuery.isLoading || (tournamentId && boardQuery.isLoading) ? (
        <ActivityIndicator color={raw.beer} />
      ) : !tournamentId ? (
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          You&rsquo;re not in a tournament right now — join one from Home.
        </Text>
      ) : boardQuery.isError || !boardQuery.data ? (
        <Text className="font-sans text-[13px] leading-[19px] text-dispute">
          Couldn&rsquo;t load the bracket. Pull to retry in a moment.
        </Text>
      ) : (
        <>
          {nextUpState && mine ? (
            <NextUpCard state={nextUpState} roundIndex={mine.roundIndex} />
          ) : null}

          {boardQuery.data.stages.map((stage) => (
            <StageSection key={stage.id} stage={stage} myTeamId={myTeam?.team.id ?? null} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function firstActiveTeam(me: MeResponse | undefined) {
  if (!me) return undefined;
  return me.teams.find((t) => t.team.tournament.status !== "COMPLETE");
}

type MyNextUp =
  | { readonly kind: "match"; readonly match: BoardMatch; readonly roundIndex: number }
  | { readonly kind: "waiting"; readonly roundIndex: number };

function findMyNextUp(stages: readonly BoardStage[], myTeamId: string): MyNextUp | null {
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

function toNextUpState(
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

function StageSection({ stage, myTeamId }: { stage: BoardStage; myTeamId: string | null }) {
  return (
    <View className="gap-4">
      {stage.rounds.map((round) => (
        <RoundSection key={round.id} round={round} myTeamId={myTeamId} />
      ))}
    </View>
  );
}

function RoundSection({ round, myTeamId }: { round: BoardRound; myTeamId: string | null }) {
  if (round.matches.length === 0 && round.entrantTeamIds.length === 0) return null;

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          {`Round ${round.index}`}
        </Text>
        {round.status === "not_opened" ? (
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint/60">
            Not started
          </Text>
        ) : null}
      </View>
      <View className="gap-2 rounded-2xl border border-stout-600 bg-stout-850 p-3">
        {round.matches.length === 0 ? (
          <Text className="font-sans text-[13px] text-cream-dim">
            {`${round.entrantTeamIds.length} team${round.entrantTeamIds.length === 1 ? "" : "s"} waiting to be paired`}
          </Text>
        ) : (
          round.matches.map((match) => (
            <MatchRow key={match.id} match={match} mine={isMine(match, myTeamId)} />
          ))
        )}
      </View>
    </View>
  );
}

function isMine(match: BoardMatch, myTeamId: string | null): boolean {
  return myTeamId !== null && (match.home?.teamId === myTeamId || match.away?.teamId === myTeamId);
}

function MatchRow({ match, mine }: { match: BoardMatch; mine: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-xl px-2 py-2 ${mine ? "bg-beer-500/10" : ""}`}
    >
      <View className="flex-1 gap-0.5">
        <TeamLine
          name={match.home?.name ?? "TBD"}
          viaRepechage={match.home?.viaRepechage ?? false}
          isWinner={match.winnerTeamId !== null && match.winnerTeamId === match.home?.teamId}
        />
        <TeamLine
          name={match.away?.name ?? "TBD"}
          viaRepechage={match.away?.viaRepechage ?? false}
          isWinner={match.winnerTeamId !== null && match.winnerTeamId === match.away?.teamId}
        />
      </View>
      <View className="items-end gap-0.5">
        <StatePill match={match} />
        {match.tableLabel ? (
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-400">
            {match.tableLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TeamLine({
  name,
  viaRepechage,
  isWinner,
}: {
  name: string;
  viaRepechage: boolean;
  isWinner: boolean;
}) {
  return (
    <Text
      numberOfLines={1}
      className={`font-sans-med text-[15px] ${isWinner ? "text-cream" : "text-cream-dim"}`}
    >
      {name}
      {viaRepechage ? " 🍀" : ""}
    </Text>
  );
}

function StatePill({ match }: { match: BoardMatch }) {
  const label =
    match.state === "confirmed"
      ? "Final"
      : match.state === "on_table"
        ? "Live"
        : match.state === "disputed"
          ? "Disputed"
          : match.state === "reported"
            ? "Reported"
            : match.state === "queued"
              ? "Queued"
              : "Not paired";
  const tone =
    match.state === "on_table"
      ? "text-live"
      : match.state === "disputed"
        ? "text-dispute"
        : match.state === "confirmed"
          ? "text-cream-faint"
          : "text-notice";
  return (
    <Text className={`font-sans-med text-[11px] uppercase tracking-[1.1px] ${tone}`}>{label}</Text>
  );
}
