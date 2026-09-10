import type { TournamentFormatKind } from "@beermacs/shared";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, api } from "../../../lib/api";
import { raw } from "../../../lib/theme";

const FORMATS: { kind: TournamentFormatKind; label: string; detail: string }[] = [
  {
    kind: "single_elimination",
    label: "Single elimination",
    detail: "Lose once, you're out. The standard case (A-5).",
  },
  {
    kind: "group_then_knockout",
    label: "Groups + knockout",
    detail: "Round-robin groups, top teams go on to a bracket.",
  },
  {
    kind: "triangular",
    label: "Triangular",
    detail: "Fixed groups of three — everyone plays everyone.",
  },
];

/**
 * A-1..A-5: create a tournament. One screen, because these are exactly the
 * decisions that have to be made before a join code can be printed on a table
 * tent — splitting them across several screens would just make the admin
 * bounce between them with nothing to show for it yet.
 */
export default function CreateTournamentScreen() {
  const insets = useSafeAreaInsets();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();

  const [name, setName] = useState("");
  const [format, setFormat] = useState<TournamentFormatKind>("single_elimination");
  const [playersPerTeam, setPlayersPerTeam] = useState("2");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [scored, setScored] = useState(true);
  const [cupsToWin, setCupsToWin] = useState("10");
  const [tables, setTables] = useState(["Table 1", "Table 2"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ joinCode: string } | null>(null);

  const addTable = useCallback(() => {
    setTables((t) => [...t, `Table ${t.length + 1}`]);
  }, []);

  const removeTable = useCallback((index: number) => {
    setTables((t) => t.filter((_, i) => i !== index));
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    const players = Number.parseInt(playersPerTeam, 10);
    const cups = scored ? Number.parseInt(cupsToWin, 10) : null;

    if (name.trim().length === 0) {
      setError("Give the tournament a name.");
      return;
    }
    if (!Number.isFinite(players) || players < 1) {
      setError("Players per team must be at least 1.");
      return;
    }
    if (scored && (!Number.isFinite(cups) || (cups ?? 0) < 1)) {
      setError("Cups to win must be at least 1, or turn scoring off.");
      return;
    }
    const cleanTables = tables.map((t) => t.trim()).filter((t) => t.length > 0);
    if (cleanTables.length === 0) {
      setError("Add at least one table.");
      return;
    }

    setBusy(true);
    try {
      const result = await api.createTournament(venueId, {
        name: name.trim(),
        format,
        playersPerTeam: players,
        chatEnabled,
        cupsToWin: cups,
        confirmTimeoutMins: 15,
        autoRepechageMode: "auto",
        tableLabels: cleanTables,
      });
      setCreated({ joinCode: result.joinCode });
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "insufficient_role"
          ? "You don't have permission to create a tournament at this venue."
          : "Couldn't create the tournament. Try again."
      );
    } finally {
      setBusy(false);
    }
  }, [venueId, name, format, playersPerTeam, chatEnabled, scored, cupsToWin, tables]);

  if (created) {
    return (
      <View
        className="flex-1 items-center justify-center gap-4 bg-stout-900 px-8"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Ionicons name="checkmark-circle" size={48} color={raw.beer} />
        <Text className="font-display text-2xl uppercase tracking-[1.2px] text-cream">
          Tournament created
        </Text>
        <Text className="font-sans text-[13px] text-cream-dim">Join code</Text>
        <Text className="font-sans-bold text-4xl tabular-nums tracking-[8px] text-beer-500">
          {created.joinCode}
        </Text>
        <Text className="max-w-[280px] text-center font-sans text-[13px] leading-[19px] text-cream-dim">
          Print this on the table tent. Round control and team management land next.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-8 active:opacity-70"
        >
          <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
            Done
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
      contentContainerClassName="gap-6 px-4"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
        New tournament
      </Text>

      <Field label="Name" value={name} onChangeText={setName} placeholder="Friday Night Cups" />

      <Section label="Format">
        <View className="gap-2">
          {FORMATS.map((f) => (
            <Pressable
              key={f.kind}
              onPress={() => setFormat(f.kind)}
              accessibilityRole="button"
              accessibilityState={{ selected: format === f.kind }}
              className={`gap-0.5 rounded-xl border p-3 ${
                format === f.kind
                  ? "border-beer-500 bg-glow-soft"
                  : "border-stout-600 bg-stout-750/60"
              }`}
            >
              <Text className="font-sans-med text-[15px] text-cream">{f.label}</Text>
              <Text className="font-sans text-[12px] text-cream-dim">{f.detail}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Field
        label="Players per team"
        value={playersPerTeam}
        onChangeText={setPlayersPerTeam}
        keyboardType="number-pad"
      />

      <ToggleRow label="Match chat" value={chatEnabled} onChange={setChatEnabled} />

      <ToggleRow label="Score matches" value={scored} onChange={setScored} />
      {scored ? (
        <Field
          label="Cups to win"
          value={cupsToWin}
          onChangeText={setCupsToWin}
          keyboardType="number-pad"
        />
      ) : null}

      <Section label="Tables">
        <View className="gap-2">
          {tables.map((t, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <TextInput
                value={t}
                onChangeText={(v) => setTables((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
                placeholderTextColor={raw.textFaint}
                className="flex-1 rounded-lg border border-stout-500 bg-stout-900/70 px-3 py-2.5 font-sans text-[14px] text-cream"
              />
              <Pressable
                onPress={() => removeTable(i)}
                hitSlop={8}
                accessibilityLabel={`Remove ${t}`}
                className="p-2"
              >
                <Ionicons name="close-circle" size={20} color={raw.tabInactive} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={addTable}
            accessibilityRole="button"
            className="flex-row items-center gap-2 py-2"
          >
            <Ionicons name="add-circle-outline" size={18} color={raw.beer} />
            <Text className="font-sans-med text-[13px] text-beer-400">Add a table</Text>
          </Pressable>
        </View>
      </Section>

      {error ? (
        <Text className="font-sans text-[13px] leading-[19px] text-dispute">{error}</Text>
      ) : null}

      <Pressable
        onPress={() => void submit()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Create tournament"
        className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
          busy ? "opacity-60" : ""
        }`}
      >
        {busy ? (
          <ActivityIndicator size="small" color={raw.canvas} />
        ) : (
          <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
            Create tournament
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {label}
      </Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-stout-600 bg-stout-750/60 px-4 py-3">
      <Text className="font-sans-med text-[15px] text-cream">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: raw.hairline, true: raw.beer }}
      />
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={raw.textFaint}
        keyboardType={props.keyboardType}
        accessibilityLabel={props.label}
        className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 font-sans text-[15px] text-cream"
      />
    </View>
  );
}
