import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { NewsItem } from "../lib/fixtures";
import { raw } from "../lib/theme";

/** "21:40" for today, "Sat" this week, "30 Aug" beyond. */
function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * The venue's announcement feed.
 *
 * This is the surface a bar is actually paying for — upcoming nights, results,
 * promos — so it sits on Home rather than behind a tab. Each item that went out
 * as a push says so, because a venue admin composing the next one needs to know
 * how often they have already interrupted people.
 */
export default function NewsFeed({ items }: { items: readonly NewsItem[] }) {
  if (items.length === 0) {
    return (
      <View className="rounded-2xl border border-stout-600 bg-stout-850 p-4">
        <Text className="font-sans text-[13px] text-cream-dim">
          Nothing from the bar yet. Announcements about upcoming nights show up here.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {items.map((item) => (
        <View
          key={item.id}
          className="gap-1.5 rounded-2xl border border-stout-600 bg-stout-700 p-4"
        >
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
              {when(item.publishedAt)}
            </Text>
            <View className="flex-1" />
            {item.pushed ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="notifications" size={10} color={raw.tabInactive} />
                <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
                  Pushed
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
            {item.title}
          </Text>
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">{item.body}</Text>
        </View>
      ))}
    </View>
  );
}
