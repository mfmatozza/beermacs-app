import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ApiError,
  api,
  type RoundSummary,
  type StageSummary,
  type TournamentDetail,
} from "../../../../lib/api";
import { raw } from "../../../../lib/theme";

/**
 * Round control (A-13..A-17): open a round, watch several stay open at once
 * (A-14), pause or resume its automatic dispatch (A-15).
 *
 * Deliberately does not try to render the bracket itself — that's milestone 8
 * territory. This screen answers one question at a time: which rounds exist,
 * which are open, how many teams in each are still waiting for an opponent.
 */
export default function TournamentAdminScreen() {
  const insets = useSafeAreaInsets();
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyRoundKey, setBusyRoundKey] = useState<string | null>(null);

  const reload = useCallback(() => {
    return api
      .tournamentDetail(tournamentId)
      .then(setDetail)
      .catch(() => setError("Couldn't load this tournament. Check your connection."));
  }, [tournamentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openRound = useCallback(
    async (stage: StageSummary, index: number) => {
      const key = `${stage.id}:${index}`;
      setBusyRoundKey(key);
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
        setBusyRoundKey(null);
      }
    },
    [reload]
  );

  const toggleScheduling = useCallback(
    async (round: RoundSummary) => {
      setBusyRoundKey(round.id);
      setError(null);
      try {
        await api.setRoundScheduling(round.id, { paused: !round.schedulingPaused });
        await reload();
      } catch {
        setError("Couldn't change scheduling for that round. Try again.");
      } finally {
        setBusyRoundKey(null);
      }
    },
    [reload]
  );

  if (!detail && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-stout-900">
        <ActivityIndicator color={raw.beer} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
      contentContainerClassName="gap-6 px-4"
    >
      {detail ? (
        <>
          <View className="gap-1">
            <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
              {detail.name}
            </Text>
            <Text className="font-sans text-[13px] text-cream-dim">
              Join code {detail.joinCode} · {detail.tables.length} tables
            </Text>
          </View>

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
                  busy={busyRoundKey === round.id}
                  onOpen={() => void openRound(stage, round.index)}
                  onTogglePause={() => void toggleScheduling(round)}
                />
              ))}

              {/* The next round's row doesn't exist until someone opens it
                  (A-14 lets that happen before this stage's current rounds are
                  done) — so the action to reach it is always "open round N+1",
                  not a row that's already there waiting to be flipped. */}
              <Pressable
                onPress={() =>
                  void openRound(stage, (stage.rounds[stage.rounds.length - 1]?.index ?? 0) + 1)
                }
                disabled={
                  busyRoundKey ===
                  `${stage.id}:${(stage.rounds[stage.rounds.length - 1]?.index ?? 0) + 1}`
                }
                accessibilityRole="button"
                className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-stout-500 py-3 active:opacity-70"
              >
                <Ionicons name="add-circle-outline" size={16} color={raw.beer} />
                <Text className="font-sans-med text-[13px] text-beer-400">
                  {`Open round ${(stage.rounds[stage.rounds.length - 1]?.index ?? 0) + 1}`}
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : (
        <Text className="font-sans text-[13px] text-dispute">{error}</Text>
      )}
    </ScrollView>
  );
}

function RoundCard({
  round,
  busy,
  onOpen,
  onTogglePause,
}: {
  round: RoundSummary;
  busy: boolean;
  onOpen: () => void;
  onTogglePause: () => void;
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
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-med text-[13px] text-cream">Automatic dispatch</Text>
          <Switch
            value={!round.schedulingPaused}
            onValueChange={onTogglePause}
            disabled={busy}
            trackColor={{ false: raw.hairline, true: raw.beer }}
          />
        </View>
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
