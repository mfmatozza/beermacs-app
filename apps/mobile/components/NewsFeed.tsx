import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";
import type { NewsItem } from "../lib/fixtures";
import { raw } from "../lib/theme";

/** "21:40" for today, "Sat" this week, "30 Aug" beyond. */
function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * The announcement feed — the surface a bar is actually paying for, and where
 * we post platform-wide news of our own.
 *
 * A post with no venue is from us and gets the Beermacs byline in amber; a
 * venue's post gets its own name. Same card either way, because a player does
 * not care which of us typed it, only whether it is about tonight.
 */
export default function NewsFeed({ items }: { items: readonly NewsItem[] }) {
  if (items.length === 0) {
    return (
      <View className="rounded-2xl border border-stout-600 bg-stout-750/70 p-4">
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          Nothing posted yet. Announcements about upcoming nights show up here.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {items.map((item) => {
        const fromUs = item.venueId === null;
        return (
          <View
            key={item.id}
            className="overflow-hidden rounded-2xl border border-stout-600 bg-stout-750/85"
          >
            {item.image !== null ? (
              <Image
                source={item.image}
                className="h-40 w-full"
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <View className="gap-1.5 p-4">
              <View className="flex-row items-center gap-2">
                <Text
                  className={`font-sans-med text-[11px] uppercase tracking-[1.1px] ${
                    fromUs ? "text-beer-400" : "text-cream-faint"
                  }`}
                  numberOfLines={1}
                >
                  {item.venueName}
                </Text>
                <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
                  · {when(item.publishedAt)}
                </Text>
                <View className="flex-1" />
                {item.pushed ? (
                  <Ionicons name="notifications" size={11} color={raw.tabInactive} />
                ) : null}
              </View>
              <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
                {item.title}
              </Text>
              <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
                {item.body}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
