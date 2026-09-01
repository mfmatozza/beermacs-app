import type { Match, VenueTable } from "@beermacs/shared";
import { Text, View } from "react-native";

/**
 * Tables as a physical row, in `sortOrder` — the order they are laid out in the
 * bar, so the strip on screen matches what you see when you look up.
 */
export default function TableStrip({
  tables,
  matches,
  labelFor,
}: {
  tables: readonly VenueTable[];
  matches: readonly Match[];
  labelFor: (m: Match) => string;
}) {
  const onTable = new Map(
    matches.filter((m) => m.state === "on_table" && m.tableId).map((m) => [m.tableId, m])
  );

  return (
    <View className="flex-row items-stretch gap-2">
      {[...tables]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => {
          const playing = onTable.get(t.id);
          const closed = t.state === "closed";

          return (
            <View
              key={t.id}
              className={`min-h-[78px] flex-1 justify-between rounded-lg border p-2.5 ${
                closed
                  ? "border-stout-600 bg-stout-800 opacity-50"
                  : playing
                    ? "border-live bg-live-wash"
                    : "border-beer-500 bg-stout-800"
              }`}
            >
              <Text
                className={`font-sans-med text-[11px] uppercase tracking-[1.1px] ${
                  closed ? "text-cream-faint" : playing ? "text-live" : "text-beer-500"
                }`}
                numberOfLines={1}
              >
                {t.label}
              </Text>
              {closed ? (
                <Text className="font-sans text-[13px] text-cream-faint">Closed</Text>
              ) : playing ? (
                <Text className="font-sans text-[13px] text-cream" numberOfLines={2}>
                  {labelFor(playing)}
                </Text>
              ) : (
                <Text className="font-sans text-[13px] text-cream-dim">Free</Text>
              )}
            </View>
          );
        })}
    </View>
  );
}
