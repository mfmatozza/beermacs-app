import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError, api, type TournamentDetail } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

/**
 * A-3/A-4's other half: pull a wobbly table out of rotation, or bring it
 * back. `setTableStateInput` existed since the tables were first modeled;
 * nothing ever called it — see apps/web/app/api/tables/[tableId]/state.
 * "Run dispatch now" (E-1/E-2/E-8) is here too, since it's the same
 * "what's happening with the tables right now" mental model.
 */
export default function TablesSection({
  detail,
  reload,
  insets,
}: {
  detail: TournamentDetail;
  reload: () => Promise<void>;
  insets: { top: number; bottom: number };
}) {
  const [busyTableId, setBusyTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (tableId: string, current: string) => {
    setBusyTableId(tableId);
    setError(null);
    try {
      await api.setTableState(tableId, { state: current === "open" ? "closed" : "open" });
      await reload();
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "table_in_use"
          ? "That table has a live match on it — settle or reassign it first."
          : "Couldn't change that table. Try again."
      );
    } finally {
      setBusyTableId(null);
    }
  };

  const dispatchMutation = useMutation({
    mutationFn: () => api.runDispatch(detail.venueId),
    onSuccess: () => void reload(),
  });

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      contentContainerClassName="gap-4 px-4"
    >
      <Pressable
        onPress={() => dispatchMutation.mutate()}
        disabled={dispatchMutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Run dispatch now"
        className={`min-h-[48px] items-center justify-center rounded-lg border border-beer-500 active:opacity-70 ${
          dispatchMutation.isPending ? "opacity-50" : ""
        }`}
      >
        {dispatchMutation.isPending ? (
          <ActivityIndicator size="small" color={raw.beer} />
        ) : (
          <Text className="font-display text-lg uppercase tracking-[0.6px] text-beer-400">
            Run dispatch now
          </Text>
        )}
      </Pressable>
      {dispatchMutation.data ? (
        <Text className="text-center font-sans text-[12px] text-cream-dim">
          {`${dispatchMutation.data.newMatches} new match${dispatchMutation.data.newMatches === 1 ? "" : "es"} · ${dispatchMutation.data.tableAssignments} table${dispatchMutation.data.tableAssignments === 1 ? "" : "s"} assigned`}
        </Text>
      ) : null}

      {error ? <Text className="font-sans text-[13px] text-dispute">{error}</Text> : null}

      {detail.tables.map((table) => (
        <View
          key={table.id}
          className="flex-row items-center justify-between rounded-2xl border border-stout-600 bg-stout-750/85 p-4"
        >
          <View className="gap-0.5">
            <Text className="font-display text-lg uppercase tracking-[0.6px] text-cream">
              {table.label}
            </Text>
            <Text
              className={`font-sans-med text-[11px] uppercase tracking-[1px] ${
                table.state === "BUSY"
                  ? "text-live"
                  : table.state === "OPEN"
                    ? "text-cream-dim"
                    : "text-dispute"
              }`}
            >
              {table.state === "BUSY" ? "In play" : table.state === "OPEN" ? "Open" : "Closed"}
            </Text>
          </View>
          {busyTableId === table.id ? (
            <ActivityIndicator size="small" color={raw.beer} />
          ) : table.state !== "BUSY" ? (
            <Pressable
              onPress={() => void toggle(table.id, table.state.toLowerCase())}
              accessibilityRole="button"
              accessibilityLabel={table.state === "OPEN" ? "Close table" : "Reopen table"}
              className="rounded-full border border-stout-500 px-3 py-1.5 active:opacity-70"
            >
              <Text className="font-sans-med text-[11px] uppercase tracking-[1px] text-cream">
                {table.state === "OPEN" ? "Close" : "Reopen"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
