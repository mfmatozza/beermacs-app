import { Ionicons } from "@expo/vector-icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { API_URL } from "../../lib/config";
import { raw } from "../../lib/theme";

/**
 * "Your venues" — the entry point into the admin console, reachable from
 * Profile. Only venues where this account holds VENUE_ADMIN or VENUE_OWNER
 * are listed; VENUE_STAFF sees the night-of running screens once those exist
 * (round control, dispatch), not the setup ones that live here.
 *
 * React Query (not a one-shot effect) so a tournament created a screen
 * deeper shows up here on the way back, and pull-to-refresh actually works.
 */
const CAN_ADMIN = new Set(["VENUE_ADMIN", "VENUE_OWNER"]);

export default function AdminVenuesScreen() {
  const insets = useSafeAreaInsets();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const adminVenues = meQuery.data?.memberships.filter((m) => CAN_ADMIN.has(m.role)) ?? [];
  const tournamentQueries = useQueries({
    queries: adminVenues.map((m) => ({
      queryKey: ["venue-tournaments", m.venue.id],
      queryFn: () => api.listTournaments(m.venue.id),
    })),
  });

  const refreshing = meQuery.isRefetching || tournamentQueries.some((q) => q.isRefetching);
  const refresh = () => {
    void meQuery.refetch();
    for (const q of tournamentQueries) void q.refetch();
  };

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      contentContainerClassName="gap-6 px-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={raw.beer} />
      }
    >
      <View className="flex-row items-start gap-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="mt-1 active:opacity-60"
        >
          <Ionicons name="chevron-back" size={22} color="#F1EADB" />
        </Pressable>
        <View className="flex-1 gap-1">
          <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
            Manage a venue
          </Text>
          <Text className="font-sans text-[13px] text-cream-dim">
            Set up tonight&rsquo;s tournament and run the room.
          </Text>
        </View>
      </View>

      {!meQuery.data ? (
        meQuery.isError ? (
          <Text className="font-sans text-[13px] text-dispute">
            Couldn&rsquo;t load your venues. Pull down to retry.
          </Text>
        ) : (
          <ActivityIndicator color={raw.beer} />
        )
      ) : adminVenues.length === 0 ? (
        <View className="rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
            You don&rsquo;t run any venue yet. If you own a bar and want to bring Beermacs in,{" "}
            <Text
              onPress={() => void Linking.openURL(`${API_URL}/support`)}
              accessibilityRole="link"
              className="text-beer-400 underline"
            >
              get in touch
            </Text>{" "}
            and we&rsquo;ll set your first tournament up together.
          </Text>
        </View>
      ) : null}

      <View className="gap-5">
        {adminVenues.map((m, i) => {
          const q = tournamentQueries[i];
          return (
            <View key={m.venue.id} className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
                  {m.venue.name}
                </Text>
                <View className="flex-1" />
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/admin/[venueId]/create-tournament",
                      params: { venueId: m.venue.id },
                    })
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="New tournament"
                  className="min-h-[36px] flex-row items-center gap-1 rounded-full border border-beer-500 px-3 active:opacity-70"
                >
                  <Ionicons name="add" size={14} color={raw.beer} />
                  <Text className="font-sans-med text-[12px] text-beer-400">New</Text>
                </Pressable>
              </View>

              {(q?.data?.tournaments ?? []).map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() =>
                    router.push({
                      pathname: "/admin/tournaments/[tournamentId]",
                      params: { tournamentId: t.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t.name}
                  className="flex-row items-center gap-3 rounded-2xl border border-stout-600 bg-stout-750/85 p-4 active:opacity-70"
                >
                  <View className="flex-1">
                    <Text className="font-sans-med text-[15px] text-cream" numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text className="font-sans text-[12px] uppercase tracking-[0.6px] text-cream-dim">
                      {t.status.toLowerCase()} · {t.joinCode}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={raw.beer} />
                </Pressable>
              ))}

              {!q?.data ? (
                q?.isError ? (
                  <Text className="font-sans text-[13px] text-dispute">
                    Couldn&rsquo;t load tournaments for this venue. Pull down to retry.
                  </Text>
                ) : (
                  <ActivityIndicator size="small" color={raw.beer} />
                )
              ) : q.data.tournaments.length === 0 ? (
                <Text className="font-sans text-[13px] text-cream-dim">
                  No tournaments yet — tap New to create one.
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
