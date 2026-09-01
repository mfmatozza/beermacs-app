import {
  buildQueue,
  luckyLoserPool,
  planDispatch,
  roundLabel,
  sideOf,
  tableUtilisation,
  type Match,
} from "@beermacs/shared";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { matches, tables, teamName, tournament, venue, viewer } from "../lib/fixtures";
import NextUpCard from "./NextUpCard";
import QueueList from "./QueueList";
import TableStrip from "./TableStrip";

/**
 * Home is "what do I do next", not a dashboard.
 *
 * Every derived number here — the queue, the table counts, the lucky-loser pool
 * — comes from a pure function in @beermacs/shared, called on the same data the
 * server will call it on. No screen computes bracket state of its own, which is
 * how the old app ended up with three different ideas of "round complete".
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const derived = useMemo(() => {
    const myMatch = matches.find(
      (m) => m.state !== "confirmed" && sideOf(m, viewer.teamId) !== null
    );
    const plan = planDispatch(matches, tables);
    return {
      myMatch,
      queue: buildQueue(matches, []),
      utilisation: tableUtilisation(matches, tables),
      pool: luckyLoserPool(matches),
      nextAssignments: plan.assignments.length,
      roundMatches: matches.filter((m) => m.round === tournament.currentRound).length,
    };
  }, []);

  const describeMatch = (m: Match) => `${teamName(m.home.teamId)} vs ${teamName(m.away.teamId)}`;

  const opponentOf = (m: Match) =>
    teamName(sideOf(m, viewer.teamId) === "home" ? m.away.teamId : m.home.teamId);

  const tableLabelOf = (m: Match) => tables.find((t) => t.id === m.tableId)?.label ?? null;

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}
      contentContainerClassName="gap-6 px-4"
      showsVerticalScrollIndicator={false}
      alwaysBounceHorizontal={false}
    >
      {/* ── masthead ────────────────────────────────────────────────────── */}
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-display text-2xl tracking-[0.9px] text-beer-500">BEERMACS</Text>
          <View className="flex-1" />
          <View className="flex-row items-center gap-1.5 rounded-full border border-live bg-live-wash px-2.5 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-live" />
            <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-live">
              Live
            </Text>
          </View>
        </View>
        <Text className="font-sans text-[13px] text-cream-dim">
          {`${venue.name} · ${venue.city}`}
        </Text>
      </View>

      {/* ── the only thing that matters ─────────────────────────────────── */}
      {derived.myMatch ? (
        <NextUpCard
          match={derived.myMatch}
          tableLabel={tableLabelOf(derived.myMatch)}
          opponent={opponentOf(derived.myMatch)}
          onReport={() => {}}
        />
      ) : (
        <View className="gap-2 rounded-2xl border border-stout-600 bg-stout-700 p-4">
          <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
            You&rsquo;re not in a match
          </Text>
          <Text className="font-sans text-[13px] text-cream-dim">
            {derived.pool.some((p) => p.teamId === viewer.teamId)
              ? "You're in the lucky-loser pool — staff may draw you back in."
              : "Sit tight. The bracket updates live."}
          </Text>
        </View>
      )}

      {/* ── tonight ─────────────────────────────────────────────────────── */}
      <View className="gap-2">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          Tonight
        </Text>
        <View className="gap-4 rounded-2xl border border-stout-600 bg-stout-700 p-4">
          <View className="flex-row gap-3">
            <View className="flex-1 gap-0.5">
              <Text
                className="font-display text-xl uppercase tracking-[0.8px] text-cream"
                numberOfLines={1}
              >
                {tournament.name}
              </Text>
              <Text className="font-sans text-[13px] text-cream-dim">
                {`${roundLabel(derived.roundMatches, tournament.currentRound)} · ${
                  tournament.format.cupsToWin
                } cups to win`}
              </Text>
            </View>
            <View className="items-end gap-0.5">
              <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
                Join code
              </Text>
              <Text className="font-sans-bold text-2xl tabular-nums tracking-[6px] text-beer-500">
                {tournament.joinCode}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-6">
            <Stat value={derived.utilisation.inPlay} label="In play" tone="text-live" />
            <Stat value={derived.utilisation.open} label="Free" tone="text-beer-500" />
            <Stat value={derived.queue.length} label="Waiting" tone="text-cream" />
            <Stat value={derived.pool.length} label="Lucky pool" tone="text-cream-dim" />
          </View>
        </View>
      </View>

      {/* ── tables ──────────────────────────────────────────────────────── */}
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
            Tables
          </Text>
          <Text className="font-sans-med text-sm tabular-nums text-cream-faint">
            {tables.length}
          </Text>
        </View>
        <TableStrip tables={tables} matches={matches} labelFor={describeMatch} />
      </View>

      {/* ── the queue ───────────────────────────────────────────────────── */}
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
            Up next
          </Text>
          <Text className="font-sans-med text-sm tabular-nums text-cream-faint">
            {derived.queue.length}
          </Text>
          <View className="flex-1" />
          {viewer.isStaff && derived.nextAssignments > 0 ? (
            <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-500">
              {`${derived.nextAssignments} ready to send`}
            </Text>
          ) : null}
        </View>
        <View className="rounded-2xl border border-stout-600 bg-stout-850 px-3">
          <QueueList
            entries={derived.queue}
            describe={(id) => {
              const m = matches.find((x) => x.id === id);
              return m ? describeMatch(m) : "Unknown match";
            }}
          />
        </View>
      </View>

      {/* ── actions ─────────────────────────────────────────────────────── */}
      <View className="gap-2">
        <Action label="Open the bracket" variant="secondary" onPress={() => {}} />
        {viewer.isStaff ? <Action label="Run the round" onPress={() => {}} /> : null}
      </View>

      <Text className="text-center font-sans text-[13px] text-cream-faint">
        Phase 0 build · screens read from typed fixtures until the Supabase project lands
      </Text>
    </ScrollView>
  );
}

/** A number and its name. Digits are tabular so the row does not jitter. */
function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <View className="min-w-[48px] gap-0.5">
      <Text className={`font-display text-4xl leading-10 tracking-[1.2px] ${tone}`}>
        {String(value)}
      </Text>
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {label}
      </Text>
    </View>
  );
}

function Action({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-[48px] items-center justify-center rounded-lg border px-6 active:opacity-70 ${
        primary ? "border-beer-500 bg-beer-500" : "border-stout-500 bg-transparent"
      }`}
    >
      <Text
        className={`font-display text-xl uppercase tracking-[0.8px] ${
          primary ? "text-stout-900" : "text-cream"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
