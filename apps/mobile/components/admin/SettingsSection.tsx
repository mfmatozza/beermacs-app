import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { api, type TournamentDetail } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

/**
 * A-6's config knobs — always a safe field update, unlike the structural
 * `format` itself (which needs no match played yet, and isn't exposed here:
 * changing the bracket SHAPE mid-tournament is a bigger, riskier action than
 * this screen's other controls, and the server already refuses it safely if
 * ever wired up — see that route's own comment on why it's deliberately
 * narrow).
 */
export default function SettingsSection({
  detail,
  reload,
  insets,
}: {
  detail: TournamentDetail;
  reload: () => Promise<void>;
  insets: { top: number; bottom: number };
}) {
  const [playersPerTeam, setPlayersPerTeam] = useState(String(detail.config.playersPerTeam ?? ""));
  const [chatEnabled, setChatEnabled] = useState(detail.config.chatEnabled);
  const [cupsToWin, setCupsToWin] = useState(
    detail.config.cupsToWin === null ? "" : String(detail.config.cupsToWin)
  );
  const [confirmTimeoutMins, setConfirmTimeoutMins] = useState(
    String(detail.config.confirmTimeoutMins ?? "")
  );
  const [autoRepechageMode, setAutoRepechageMode] = useState<"auto" | "manual">(
    detail.config.autoRepechageMode ?? "auto"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${detail.name}?`,
      "This permanently removes the tournament and everything in it — teams, matches, chat. This is not the same as ending it, and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeleting(true);
              setError(null);
              try {
                await api.deleteTournament(detail.id);
                router.replace("/admin");
              } catch {
                setError("Couldn't delete this tournament — you may need to be the venue owner.");
                setDeleting(false);
              }
            })();
          },
        },
      ]
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateTournament(detail.id, {
        playersPerTeam: playersPerTeam ? Number(playersPerTeam) : undefined,
        chatEnabled,
        cupsToWin: cupsToWin === "" ? null : Number(cupsToWin),
        confirmTimeoutMins: confirmTimeoutMins ? Number(confirmTimeoutMins) : undefined,
        autoRepechageMode,
      });
      await reload();
      setSaved(true);
    } catch {
      setError("Couldn't save those changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      contentContainerClassName="gap-4 px-4"
    >
      <Field
        label="Players per team"
        value={playersPerTeam}
        onChangeText={setPlayersPerTeam}
        keyboardType="number-pad"
      />
      <Field
        label="Cups to win (blank = not scored)"
        value={cupsToWin}
        onChangeText={setCupsToWin}
        keyboardType="number-pad"
      />
      <Field
        label="Confirm timeout (minutes)"
        value={confirmTimeoutMins}
        onChangeText={setConfirmTimeoutMins}
        keyboardType="number-pad"
      />

      <View className="flex-row items-center justify-between rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
        <Text className="font-sans-med text-[14px] text-cream">Tournament chat</Text>
        <Switch
          value={chatEnabled}
          onValueChange={setChatEnabled}
          trackColor={{ false: raw.hairline, true: raw.beer }}
        />
      </View>

      <View className="gap-2">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          Repêchage mode
        </Text>
        <View className="flex-row gap-2">
          {(["auto", "manual"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setAutoRepechageMode(m)}
              accessibilityRole="button"
              className={`flex-1 items-center rounded-lg border py-2.5 active:opacity-70 ${
                autoRepechageMode === m ? "border-beer-500 bg-beer-500/15" : "border-stout-600"
              }`}
            >
              <Text
                className={`font-sans-med text-[13px] capitalize ${
                  autoRepechageMode === m ? "text-beer-400" : "text-cream-dim"
                }`}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Text className="font-sans text-[13px] text-dispute">{error}</Text> : null}
      {saved ? <Text className="font-sans text-[13px] text-live">Saved.</Text> : null}

      <Pressable
        onPress={() => void save()}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save settings"
        className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 active:opacity-70 ${
          saving ? "opacity-50" : ""
        }`}
      >
        {saving ? (
          <ActivityIndicator size="small" color={raw.canvas} />
        ) : (
          <Text className="font-display text-lg uppercase tracking-[0.6px] text-stout-900">Save</Text>
        )}
      </Pressable>

      <View className="mt-4 gap-2 rounded-2xl border border-dispute/40 bg-dispute/5 p-4">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-dispute">
          Danger zone
        </Text>
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete tournament"
          className={`min-h-[44px] items-center justify-center rounded-lg border border-dispute active:opacity-70 ${
            deleting ? "opacity-50" : ""
          }`}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={raw.dispute} />
          ) : (
            <Text className="font-display text-base uppercase tracking-[0.6px] text-dispute">
              Delete tournament
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "number-pad";
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={raw.textFaint}
        accessibilityLabel={label}
        className="min-h-[44px] rounded-lg border border-stout-500 bg-stout-900/70 px-3 font-sans text-[15px] text-cream"
      />
    </View>
  );
}
