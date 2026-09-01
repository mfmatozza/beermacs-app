import type { Match } from "@beermacs/shared";
import { Pressable, Text, View } from "react-native";

/**
 * The one card that matters. Everything else on the home screen is context;
 * this answers "am I playing, and where do I stand".
 */
export default function NextUpCard({
  match,
  tableLabel,
  opponent,
  onReport,
}: {
  match: Match;
  tableLabel: string | null;
  opponent: string;
  onReport: () => void;
}) {
  const live = match.state === "on_table";

  return (
    <View className="gap-3 rounded-2xl border border-beer-500/40 bg-beer-500/10 p-4">
      <View className="flex-row items-center gap-2">
        <View
          className={`flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-1 ${
            live ? "border-live bg-live-wash" : "border-notice bg-notice-wash"
          }`}
        >
          {live ? <View className="h-1.5 w-1.5 rounded-full bg-live" /> : null}
          <Text
            className={`font-medium text-[11px] uppercase tracking-[1.1px] ${
              live ? "text-live" : "text-notice"
            }`}
          >
            {live ? "You're up" : "Up next"}
          </Text>
        </View>
        <View className="flex-1" />
        <Text className="font-medium text-[11px] uppercase tracking-[1.1px] text-cream-dim">
          {`Round ${match.round}`}
        </Text>
      </View>

      {/* The table number is the single most important glyph on this screen —
          it is what someone squints at from across a loud room. */}
      {tableLabel ? (
        <View className="flex-row items-end gap-4">
          <View className="shrink">
            <Text className="font-medium text-[11px] uppercase tracking-[1.1px] text-beer-400">
              Head to
            </Text>
            <Text className="font-display text-5xl leading-[48px] tracking-[1.2px] text-cream">
              {tableLabel.toUpperCase()}
            </Text>
          </View>
          <View className="shrink pb-2">
            <Text className="font-medium text-[11px] uppercase tracking-[1.1px] text-cream-dim">
              vs
            </Text>
            <Text
              className="font-display text-2xl leading-7 tracking-[0.9px] text-cream"
              numberOfLines={1}
            >
              {opponent.toUpperCase()}
            </Text>
          </View>
        </View>
      ) : (
        <View className="gap-0.5">
          <Text className="font-medium text-[11px] uppercase tracking-[1.1px] text-cream-dim">
            Waiting for a table — vs
          </Text>
          <Text
            className="font-display text-4xl leading-10 tracking-[1.2px] text-cream"
            numberOfLines={1}
          >
            {opponent.toUpperCase()}
          </Text>
        </View>
      )}

      {live ? (
        <Pressable
          onPress={onReport}
          accessibilityRole="button"
          accessibilityLabel="Report the score"
          className="min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70"
        >
          <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
            Report the score
          </Text>
        </Pressable>
      ) : (
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          We&rsquo;ll buzz your phone the moment a table frees up. Keep the app closed if you like —
          the notification will still land.
        </Text>
      )}
    </View>
  );
}
