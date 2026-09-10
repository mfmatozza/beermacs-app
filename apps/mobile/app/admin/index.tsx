import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type MeResponse, type TournamentListItem } from "../../lib/api";
import { raw } from "../../lib/theme";

/**
 * "Your venues" — the entry point into the admin console, reachable from
 * Profile. Only venues where this account holds VENUE_ADMIN or VENUE_OWNER
 * are listed; VENUE_STAFF sees the night-of running screens once those exist
 * (round control, dispatch), not the setup ones that live here.
 */
const CAN_ADMIN = new Set(["VENUE_ADMIN", "VENUE_OWNER"]);

export default function AdminVenuesScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Record<string, readonly TournamentListItem[]>>({});

  useEffect(() => {
    let cancelled = false;
    void api
      .me()
      .then((r) => {
        if (cancelled) return;
        setMe(r);
        const venues = r.memberships.filter((m) => CAN_ADMIN.has(m.role));
        for (const m of venues) {
          void api.listTournaments(m.venue.id).then((res) => {
            if (!cancelled) {
              setTournaments((prev) => ({ ...prev, [m.venue.id]: res.tournaments }));
            }
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your venues. Check your connection.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const adminVenues = me?.memberships.filter((m) => CAN_ADMIN.has(m.role)) ?? [];

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      contentContainerClassName="gap-6 px-4"
    >
      <View className="gap-1">
        <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
          Manage a venue
        </Text>
        <Text className="font-sans text-[13px] text-cream-dim">
          Set up tonight's tournament and run the room.
        </Text>
      </View>

      {!me && !error ? <ActivityIndicator color={raw.beer} /> : null}
      {error ? <Text className="font-sans text-[13px] text-dispute">{error}</Text> : null}

      {me && adminVenues.length === 0 ? (
        <View className="rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
            You don't run any venue yet. If you own a bar and want to bring Beermacs in, get in
            touch and we'll set your first tournament up together.
          </Text>
        </View>
      ) : null}

      <View className="gap-5">
        {adminVenues.map((m) => (
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
                accessibilityRole="button"
                accessibilityLabel="New tournament"
                className="flex-row items-center gap-1 rounded-full border border-beer-500 px-3 py-1 active:opacity-70"
              >
                <Ionicons name="add" size={14} color={raw.beer} />
                <Text className="font-sans-med text-[12px] text-beer-400">New</Text>
              </Pressable>
            </View>

            {(tournaments[m.venue.id] ?? []).map((t) => (
              <Pressable
                key={t.id}
                onPress={() =>
                  router.push({
                    pathname: "/admin/tournaments/[tournamentId]",
                    params: { tournamentId: t.id },
                  })
                }
                accessibilityRole="button"
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

            {tournaments[m.venue.id]?.length === 0 ? (
              <Text className="font-sans text-[13px] text-cream-dim">
                No tournaments yet — tap New to create one.
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
