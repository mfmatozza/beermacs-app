import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type BoardMatch, type BoardRound, type BoardStage } from "../../lib/api";
import { TAB_BAR_HEIGHT, raw } from "../../lib/theme";
import { useCurrentTeam } from "../../lib/use-current-team";
import { useNextUp } from "../../lib/use-next-up";
import NextUpCard from "../../components/NextUpCard";

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
  const { myTeam, isLoading: meLoading } = useCurrentTeam();
  const tournamentId = myTeam?.team.tournament.id ?? null;

  const boardQuery = useQuery({
    queryKey: ["board", tournamentId],
    queryFn: () => api.board(tournamentId!),
    enabled: tournamentId !== null,
    // Roadmap D: polling at 2-4s until a pilot night shows it isn't enough.
    refetchInterval: 3000,
  });

  const { mine, nextUpState } = useNextUp(tournamentId, myTeam?.team.id ?? null, boardQuery.data);

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-6 px-4"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={boardQuery.isRefetching && !boardQuery.isLoading}
          onRefresh={() => void boardQuery.refetch()}
          tintColor={raw.beer}
        />
      }
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

      {meLoading || (tournamentId && boardQuery.isLoading) ? (
        <ActivityIndicator color={raw.beer} />
      ) : !tournamentId ? (
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          You&rsquo;re not in a tournament right now — join one from Home.
        </Text>
      ) : !boardQuery.data ? (
        <Text className="font-sans text-[13px] leading-[19px] text-dispute">
          Couldn&rsquo;t load the bracket. Pull down to retry.
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

const ROW_BORDER_TONE: Record<BoardMatch["state"], string> = {
  scheduled: "border-l-stout-600",
  queued: "border-l-stout-600",
  on_table: "border-l-live",
  reported: "border-l-notice",
  disputed: "border-l-dispute",
  confirmed: "border-l-stout-600",
};

function MatchRow({ match, mine }: { match: BoardMatch; mine: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-xl border-l-[3px] py-2 pl-2.5 pr-2 ${ROW_BORDER_TONE[match.state]} ${
        mine ? "bg-beer-500/10" : ""
      }`}
    >
      <View className="flex-1 gap-1">
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
    <View className="flex-row items-center gap-1.5">
      {isWinner ? <Text className="font-sans-bold text-[13px] text-live">✓</Text> : null}
      <Text
        numberOfLines={1}
        className={`flex-1 font-sans-med text-[15px] ${isWinner ? "text-cream" : "text-cream-dim"}`}
      >
        {name}
        {viaRepechage ? " 🍀" : ""}
      </Text>
    </View>
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
