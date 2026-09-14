import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { ApiError, api, type RoundSummary, type StageSummary, type TournamentDetail } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

/**
 * Round control (A-13..A-17): open a round, watch several stay open at once
 * (A-14), pause or resume its automatic dispatch (A-15), draw a team back in
 * from the loser pool (A-9/A-10).
 *
 * Repêchage here is always auto-pick (no named-team choice) — the eligible
 * pool isn't exposed by any endpoint yet (it lives in @beermacs/shared's
 * `loserPool`, computed server-side inside the repechage route, not
 * returned to a caller), so a "pick which team" UI would have nothing real
 * to show. Auto-pick covers A-9; naming one specific team (A-10) is a real
 * gap still open — see docs/DECISIONS.md.
 */
export default function RoundsSection({
  detail,
  reload,
  insets,
}: {
  detail: TournamentDetail;
  reload: () => Promise<void>;
  insets: { top: number; bottom: number };
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openRound = useCallback(
    async (stage: StageSummary, index: number) => {
      const key = `${stage.id}:${index}`;
      setBusyKey(key);
      setError(null);
      try {
        await api.openRound(stage.id, index);
        await reload();
      } catch (e) {
        setError(
          e instanceof ApiError && e.code === "insufficient_role"
            ? "You don't have permission to run this tournament."
            : "Couldn't open that round. Try again."
        );
      } finally {
        setBusyKey(null);
      }
    },
    [reload]
  );

  const toggleScheduling = useCallback(
    async (round: RoundSummary) => {
      setBusyKey(round.id);
      setError(null);
      try {
        await api.setRoundScheduling(round.id, { paused: !round.schedulingPaused });
        await reload();
      } catch {
        setError("Couldn't change scheduling for that round. Try again.");
      } finally {
        setBusyKey(null);
      }
    },
    [reload]
  );

  const repechage = useCallback(
    async (round: RoundSummary) => {
      setBusyKey(`repechage:${round.id}`);
      setError(null);
      try {
        await api.repechage(round.id);
        await reload();
      } catch (e) {
        setError(
          e instanceof ApiError && e.code === "repechage_pool_empty"
            ? "No eliminated team is eligible for repêchage right now."
            : "Couldn't draw a team back in. Try again."
        );
      } finally {
        setBusyKey(null);
      }
    },
    [reload]
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      contentContainerClassName="gap-6 px-4"
    >
      {error ? (
        <Text className="font-sans text-[13px] leading-[19px] text-dispute">{error}</Text>
      ) : null}

      {detail.stages.map((stage) => (
        <View key={stage.id} className="gap-3">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
            {stage.type === "GROUP" ? "Group stage" : "Elimination"}
          </Text>

          {stage.rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              busy={busyKey === round.id}
              repechageBusy={busyKey === `repechage:${round.id}`}
              onOpen={() => void openRound(stage, round.index)}
              onTogglePause={() => void toggleScheduling(round)}
              onRepechage={() => void repechage(round)}
            />
          ))}

          <Pressable
            onPress={() =>
              void openRound(stage, (stage.rounds[stage.rounds.length - 1]?.index ?? 0) + 1)
            }
            disabled={
              busyKey === `${stage.id}:${(stage.rounds[stage.rounds.length - 1]?.index ?? 0) + 1}`
            }
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-stout-500 py-3 active:opacity-70"
          >
            <Text className="font-sans-med text-[13px] text-beer-400">
              {`Open round ${(stage.rounds[stage.rounds.length - 1]?.index ?? 0) + 1}`}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function RoundCard({
  round,
  busy,
  repechageBusy,
  onOpen,
  onTogglePause,
  onRepechage,
}: {
  round: RoundSummary;
  busy: boolean;
  repechageBusy: boolean;
  onOpen: () => void;
  onTogglePause: () => void;
  onRepechage: () => void;
}) {
  const open = round.status === "open";

  return (
    <View className="gap-3 rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
      <View className="flex-row items-center gap-2">
        <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
          {`Round ${round.index}`}
        </Text>
        <View
          className={`rounded-full border px-2 py-0.5 ${
            open ? "border-live bg-live-wash" : "border-stout-500"
          }`}
        >
          <Text
            className={`font-sans-med text-[10px] uppercase tracking-[1px] ${
              open ? "text-live" : "text-cream-faint"
            }`}
          >
            {open ? "Open" : "Not opened"}
          </Text>
        </View>
        <View className="flex-1" />
        {busy ? <ActivityIndicator size="small" color={raw.beer} /> : null}
      </View>

      <Text className="font-sans text-[13px] text-cream-dim">
        {`${round.matchCount} match${round.matchCount === 1 ? "" : "es"} · ${round.waitingCount} waiting for a table`}
      </Text>

      {open ? (
        <>
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-med text-[13px] text-cream">Automatic dispatch</Text>
            <Switch
              value={!round.schedulingPaused}
              onValueChange={onTogglePause}
              disabled={busy}
              trackColor={{ false: raw.hairline, true: raw.beer }}
            />
          </View>
          <Pressable
            onPress={onRepechage}
            disabled={repechageBusy}
            accessibilityRole="button"
            accessibilityLabel="Draw a team back in"
            className={`min-h-[40px] items-center justify-center rounded-lg border border-stout-500 active:opacity-70 ${repechageBusy ? "opacity-50" : ""}`}
          >
            {repechageBusy ? (
              <ActivityIndicator size="small" color={raw.textFaint} />
            ) : (
              <Text className="font-sans-med text-[12px] text-cream">Repêchage 🍀</Text>
            )}
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={onOpen}
          disabled={busy}
          accessibilityRole="button"
          className={`min-h-[44px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
            busy ? "opacity-60" : ""
          }`}
        >
          <Text className="font-display text-lg uppercase tracking-[0.8px] text-stout-900">
            Open round
          </Text>
        </Pressable>
      )}
    </View>
  );
}
