import { Ionicons } from "@expo/vector-icons";
import { distanceKm, formatDistance } from "@beermacs/shared";
import { Pressable, Text, View } from "react-native";
import type { Venue } from "../lib/fixtures";
import { raw } from "../lib/theme";

/**
 * Venues running Beermacs, nearest first — the browse state for someone with no
 * active registration.
 *
 * §5 asks for "a map or list". This is the list, and it carries the three things
 * that actually decide whether you walk over: how far, whether it has started,
 * and how many teams are already in. A map is prettier and answers only the
 * first of those.
 */
export default function VenueList({
  venues,
  from,
  onJoin,
}: {
  venues: readonly Venue[];
  from: { latitude: number; longitude: number };
  onJoin: (venueId: string) => void;
}) {
  const sorted = [...venues]
    .map((v) => ({ venue: v, km: distanceKm(from, v) }))
    .sort((a, b) => a.km - b.km);

  return (
    <View className="gap-2">
      {sorted.map(({ venue, km }) => {
        const open = venue.tournamentName !== null;
        return (
          <Pressable
            key={venue.id}
            onPress={() => onJoin(venue.id)}
            disabled={!open}
            accessibilityRole="button"
            accessibilityLabel={`${venue.name}, ${formatDistance(km)} away`}
            className={`flex-row items-center gap-3 rounded-2xl border p-4 ${
              open
                ? "border-stout-600 bg-stout-700 active:opacity-70"
                : "border-stout-600 bg-stout-800 opacity-50"
            }`}
          >
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-2">
                <Text
                  className="shrink font-display text-xl uppercase tracking-[0.8px] text-cream"
                  numberOfLines={1}
                >
                  {venue.name}
                </Text>
                {venue.isLive ? <View className="h-1.5 w-1.5 rounded-full bg-live" /> : null}
              </View>
              <Text className="font-sans text-[13px] text-cream-dim" numberOfLines={1}>
                {open
                  ? `${venue.tournamentName} · ${venue.teamsRegistered} teams${
                      venue.isLive ? " · in progress" : ""
                    }`
                  : "No tournament tonight"}
              </Text>
            </View>
            <View className="items-end gap-0.5">
              <Text className="font-sans-med text-sm tabular-nums text-cream">
                {formatDistance(km)}
              </Text>
              {open ? <Ionicons name="chevron-forward" size={14} color={raw.tabInactive} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
