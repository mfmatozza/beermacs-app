import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

/** A-21: everyone registered at this venue, for re-contacting them about the
 *  next tournament. VENUE_ADMIN+ server-side — a 403 here just means this
 *  account is VENUE_STAFF, not that anything is broken. */
export default function PlayersSection({
  venueId,
  insets,
}: {
  venueId: string;
  insets: { top: number; bottom: number };
}) {
  const playersQuery = useQuery({ queryKey: ["venue-players", venueId], queryFn: () => api.listPlayers(venueId) });

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      contentContainerClassName="gap-3 px-4"
    >
      {playersQuery.isLoading || !playersQuery.data ? (
        <ActivityIndicator color={raw.beer} />
      ) : playersQuery.isError ? (
        <Text className="font-sans text-[13px] text-dispute">
          Couldn&rsquo;t load the player directory — this needs a venue owner or admin account.
        </Text>
      ) : (
        <>
          <Text className="font-sans text-[12px] text-cream-dim">
            {`${playersQuery.data.players.length} registered at this venue`}
          </Text>
          {playersQuery.data.players.map((p) => (
            <View key={p.userId} className="gap-0.5 rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
              <View className="flex-row items-center gap-2">
                <Text className="font-sans-med text-[15px] text-cream" numberOfLines={1}>
                  {p.displayName}
                </Text>
                <View className="rounded-full border border-stout-500 px-2 py-0.5">
                  <Text className="font-sans-med text-[9px] uppercase tracking-[0.8px] text-cream-faint">
                    {p.role.replace("VENUE_", "").replace("_", " ")}
                  </Text>
                </View>
              </View>
              <Text className="font-sans text-[12px] text-cream-dim">{p.email}</Text>
              {p.phone ? <Text className="font-sans text-[12px] text-cream-dim">{p.phone}</Text> : null}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
