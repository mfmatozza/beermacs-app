import type { QueueEntry } from "@beermacs/shared";
import { Fragment } from "react";
import { Text, View } from "react-native";

/**
 * The dispatcher's queue, rendered. Position is shown because "you're third" is
 * the answer to the question people actually ask the staff.
 */
export default function QueueList({
  entries,
  describe,
}: {
  entries: readonly QueueEntry[];
  describe: (matchId: string) => string;
}) {
  if (entries.length === 0) {
    return (
      <Text className="font-sans text-[13px] text-cream-dim">
        Nothing waiting — every playable match is on a table.
      </Text>
    );
  }

  return (
    <View>
      {entries.map((e, i) => (
        <Fragment key={e.matchId}>
          {i > 0 ? <View className="h-px bg-stout-600" /> : null}
          <View className="flex-row items-center gap-3 py-3">
            <Text className="font-sans-med text-sm tabular-nums text-cream-faint">
              {String(i + 1).padStart(2, "0")}
            </Text>
            <Text className="shrink font-sans-med text-[15px] text-cream" numberOfLines={1}>
              {describe(e.matchId)}
            </Text>
            <View className="flex-1" />
            <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
              {`R${e.round}`}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
