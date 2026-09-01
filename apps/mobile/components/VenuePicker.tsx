import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Venue } from "../lib/fixtures";
import { raw } from "../lib/theme";

/**
 * "Which bar are you at?" — the first thing Home asks.
 *
 * A search field over the affiliated bars, not a map. A map answers only "how
 * far", and it needs a native SDK; this answers the three things that decide
 * whether you tap: is it running, how many teams are in, and is it the place
 * you are standing in. The map arrives after milestone 12
 * (docs/DECISIONS.md D6).
 *
 * Match is on name and city, and is accent-insensitive, so "torino" finds
 * "Torinò" and someone typing on an English keyboard is not stuck.
 */
const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function VenuePicker({
  venues,
  query,
  onQueryChange,
  onPick,
}: {
  venues: readonly Venue[];
  query: string;
  onQueryChange: (v: string) => void;
  onPick: (venueId: string) => void;
}) {
  const q = fold(query);
  const matched = venues
    .filter((v) => v.affiliated)
    .filter((v) => q.length === 0 || fold(v.name).includes(q) || fold(v.city).includes(q))
    // Bars with a tournament on come first; then alphabetical, so the list does
    // not reshuffle as you type.
    .sort((a, b) => Number(b.isLive) - Number(a.isLive) || a.name.localeCompare(b.name));

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2 rounded-xl border border-stout-500 bg-stout-750/80 px-3">
        <Ionicons name="search" size={16} color={raw.foamShade} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search affiliated bars"
          placeholderTextColor={raw.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search affiliated bars"
          className="flex-1 py-3 font-sans text-[15px] text-cream"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => onQueryChange("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={16} color={raw.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {matched.length === 0 ? (
        <View className="rounded-2xl border border-stout-600 bg-stout-750/70 p-4">
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
            No affiliated bar matches “{query.trim()}”. If your local runs beer pong nights, tell
            them about Beermacs.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {matched.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => onPick(v.id)}
              accessibilityRole="button"
              accessibilityLabel={`${v.name}, ${v.city}`}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-70 ${
                v.isLive ? "border-glow-edge bg-glow-soft" : "border-stout-600 bg-stout-750/80"
              }`}
            >
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="shrink font-display text-xl uppercase tracking-[0.8px] text-cream"
                    numberOfLines={1}
                  >
                    {v.name}
                  </Text>
                  {v.isLive ? (
                    <View className="flex-row items-center gap-1 rounded-full border border-live bg-live-wash px-2 py-0.5">
                      <View className="h-1.5 w-1.5 rounded-full bg-live" />
                      <Text className="font-sans-med text-[10px] uppercase tracking-[1px] text-live">
                        On now
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="font-sans text-[13px] text-cream-dim" numberOfLines={1}>
                  {v.tournamentName
                    ? `${v.tournamentName} · ${v.teamsRegistered} teams · ${v.city}`
                    : `Nothing on tonight · ${v.city}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={raw.beer} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
