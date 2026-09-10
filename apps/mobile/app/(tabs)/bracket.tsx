import { buildQueue, planDispatch, tableUtilisation, type Match } from "@beermacs/shared";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QueueList from "../../components/QueueList";
import TableStrip from "../../components/TableStrip";
import { matches, rounds, tables, teamName, tournament, viewer } from "../../lib/fixtures";
import { TAB_BAR_HEIGHT } from "../../lib/theme";

/**
 * Bracket & standings (§4). Partial: the table strip and the dispatcher queue
 * are here now, and the bracket tree itself lands in milestone 8 along with the
 * staff seeding and override controls.
 *
 * These moved off Home deliberately. §5 makes Home "what do I do next"; the
 * state of the whole tournament belongs on this tab.
 */
export default function BracketTab() {
  const insets = useSafeAreaInsets();

  const derived = useMemo(() => {
    const plan = planDispatch(matches, tables);
    const openRounds = rounds.filter((r) => r.status === "open").sort((a, b) => a.index - b.index);
    return {
      queue: buildQueue(matches, []),
      utilisation: tableUtilisation(matches, tables),
      readyToSend: plan.assignments.length,
      openRounds,
    };
  }, []);

  const describeMatch = (m: Match) => `${teamName(m.home.teamId)} vs ${teamName(m.away.teamId)}`;

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-6 px-4"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        {/* A-14: several rounds can be open at once — no single "current
            round" to name any more, so this lists all of them. */}
        <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
          {derived.openRounds.length > 0
            ? `Round${derived.openRounds.length > 1 ? "s" : ""} ${derived.openRounds
                .map((r) => r.index)
                .join(" & ")} open`
            : "Not started"}
        </Text>
        <Text className="font-sans text-[13px] text-cream-dim">
          {`${tournament.name}${
            tournament.format.cupsToWin ? ` · ${tournament.format.cupsToWin} cups to win` : ""
          }`}
        </Text>
      </View>

      <View className="flex-row gap-6 rounded-2xl border border-stout-600 bg-stout-700 p-4">
        <Stat value={derived.utilisation.inPlay} label="In play" tone="text-live" />
        <Stat value={derived.utilisation.open} label="Free" tone="text-beer-500" />
        <Stat value={derived.queue.length} label="Waiting" tone="text-cream" />
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Label>Tables</Label>
          <Text className="font-sans-med text-sm tabular-nums text-cream-faint">
            {tables.length}
          </Text>
        </View>
        <TableStrip tables={tables} matches={matches} labelFor={describeMatch} />
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Label>Up next</Label>
          <Text className="font-sans-med text-sm tabular-nums text-cream-faint">
            {derived.queue.length}
          </Text>
          <View className="flex-1" />
          {viewer.isStaff && derived.readyToSend > 0 ? (
            <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-500">
              {`${derived.readyToSend} ready to send`}
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
            roundLabel={(id) => {
              const m = matches.find((x) => x.id === id);
              const r = rounds.find((x) => x.id === m?.roundId);
              return r ? `R${r.index}` : "";
            }}
          />
        </View>
      </View>

      <Text className="text-center font-sans text-[13px] text-cream-faint">
        The bracket tree and staff seeding controls land in milestone 8.
      </Text>
    </ScrollView>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
      {children}
    </Text>
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
