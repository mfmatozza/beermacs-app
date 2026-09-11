import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type TournamentHistoryEntry } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

/**
 * Every COMPLETE tournament this player's teams were in, newest first.
 *
 * Was a permanent ComingSoon placeholder ("needs tournaments to be archived
 * rather than deleted") — that blocker is gone now that tournaments actually
 * reach COMPLETE (see /api/tournaments/:id/end, docs/DECISIONS.md D16) and
 * stay in the database rather than being wiped, so this reads real rows.
 * See GET /api/me/history's own comment for why it shows a W-L record and
 * not a claimed final placement.
 */
export default function HistoryTab() {
  const insets = useSafeAreaInsets();
  const historyQuery = useQuery({ queryKey: ["history"], queryFn: api.history });

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-4 px-4"
      showsVerticalScrollIndicator={false}
    >
      <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">History</Text>

      {historyQuery.isLoading || !historyQuery.data ? (
        <ActivityIndicator color={raw.beer} />
      ) : historyQuery.isError ? (
        <Text className="font-sans text-[13px] text-dispute">
          Couldn&rsquo;t load your history. Check your connection.
        </Text>
      ) : historyQuery.data.entries.length === 0 ? (
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          No finished tournaments yet — this fills in once one you played in ends.
        </Text>
      ) : (
        historyQuery.data.entries.map((entry) => <HistoryRow key={entry.tournamentId} entry={entry} />)
      )}
    </ScrollView>
  );
}

function HistoryRow({ entry }: { entry: TournamentHistoryEntry }) {
  return (
    <View className="gap-2 rounded-2xl border border-stout-600 bg-stout-850 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream" numberOfLines={1}>
            {entry.tournamentName}
          </Text>
          <Text className="font-sans text-[12px] text-cream-faint">
            {entry.venueName}
            {entry.venueCity ? ` · ${entry.venueCity}` : ""}
          </Text>
        </View>
        {entry.endedAt ? (
          <Text className="font-sans text-[11px] text-cream-faint">
            {new Date(entry.endedAt).toLocaleDateString()}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="font-sans-med text-[13px] text-cream-dim">{entry.teamName}</Text>
        <View className="h-3 w-px bg-stout-600" />
        <Text className="font-sans-bold text-[13px] tabular-nums text-cream">
          {entry.wins}-{entry.losses}
        </Text>
      </View>
    </View>
  );
}
