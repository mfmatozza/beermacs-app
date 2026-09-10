import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type MeResponse } from "../../lib/api";
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

  useEffect(() => {
    let cancelled = false;
    void api
      .me()
      .then((r) => {
        if (!cancelled) setMe(r);
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

      <View className="gap-2">
        {adminVenues.map((m) => (
          <Pressable
            key={m.venue.id}
            onPress={() =>
              router.push({
                pathname: "/admin/[venueId]/create-tournament",
                params: { venueId: m.venue.id },
              })
            }
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl border border-stout-600 bg-stout-750/85 p-4 active:opacity-70"
          >
            <View className="flex-1">
              <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
                {m.venue.name}
              </Text>
              <Text className="font-sans text-[13px] text-cream-dim">{m.venue.city ?? ""}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={raw.beer} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
