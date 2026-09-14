import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, api, type TournamentDetail } from "../../../../lib/api";
import { raw } from "../../../../lib/theme";
import DisputesSection from "../../../../components/admin/DisputesSection";
import MessagesSection from "../../../../components/admin/MessagesSection";
import PlayersSection from "../../../../components/admin/PlayersSection";
import RoundsSection from "../../../../components/admin/RoundsSection";
import SettingsSection from "../../../../components/admin/SettingsSection";
import TablesSection from "../../../../components/admin/TablesSection";
import TeamsSection from "../../../../components/admin/TeamsSection";

/**
 * The night-of running console. Every section below already had a working,
 * verified backend (docs/ROADMAP.md Phase 3, "A-1..A-21 (done)") — none of
 * this is new API surface except table open/closed (A-3/A-4's other half,
 * `setTableStateInput` existed unused) and the team roster read this and the
 * pairing/repêchage pickers needed. What was missing was entirely the mobile
 * UI to reach any of it beyond round control.
 */
type Section = "rounds" | "teams" | "disputes" | "tables" | "players" | "messages" | "settings";

const SECTIONS: readonly { key: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "rounds", label: "Rounds", icon: "layers-outline" },
  { key: "teams", label: "Teams", icon: "people-outline" },
  { key: "disputes", label: "Disputes", icon: "alert-circle-outline" },
  { key: "tables", label: "Tables", icon: "grid-outline" },
  { key: "players", label: "Players", icon: "person-outline" },
  { key: "messages", label: "Messages", icon: "megaphone-outline" },
  { key: "settings", label: "Settings", icon: "settings-outline" },
];

export default function TournamentAdminScreen() {
  const insets = useSafeAreaInsets();
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("rounds");
  const [ending, setEnding] = useState(false);

  const reload = useCallback(() => {
    return api
      .tournamentDetail(tournamentId)
      .then(setDetail)
      .catch((e) =>
        setError(
          e instanceof ApiError && e.code === "insufficient_role"
            ? "You don't have permission to run this tournament."
            : "Couldn't load this tournament. Check your connection."
        )
      );
  }, [tournamentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const endTournament = useCallback(() => {
    Alert.alert(
      "End this tournament?",
      "This is final — no more matches, chat, or scheduling. It moves to History for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End tournament",
          style: "destructive",
          onPress: async () => {
            setEnding(true);
            setError(null);
            try {
              await api.endTournament(tournamentId);
              await reload();
            } catch {
              setError("Couldn't end the tournament. Try again.");
            } finally {
              setEnding(false);
            }
          },
        },
      ]
    );
  }, [tournamentId, reload]);

  if (!detail && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-stout-900">
        <ActivityIndicator color={raw.beer} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stout-900" style={{ paddingTop: insets.top + 12 }}>
      {detail ? (
        <>
          <View className="flex-row items-start justify-between gap-3 px-4">
            <View className="flex-1 gap-1">
              <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
                {detail.name}
              </Text>
              <Text className="font-sans text-[13px] text-cream-dim">
                Join code {detail.joinCode} · {detail.tables.length} tables
              </Text>
            </View>
            {detail.status === "COMPLETE" ? (
              <View className="rounded-full border border-stout-500 px-3 py-1.5">
                <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
                  Ended
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={endTournament}
                disabled={ending}
                accessibilityRole="button"
                accessibilityLabel="End tournament"
                className={`rounded-full border border-dispute px-3 py-1.5 active:opacity-70 ${ending ? "opacity-40" : ""}`}
              >
                {ending ? (
                  <ActivityIndicator size="small" color={raw.dispute} />
                ) : (
                  <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-dispute">
                    End
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {error ? (
            <Text className="px-4 pt-2 font-sans text-[13px] leading-[19px] text-dispute">
              {error}
            </Text>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4 flex-none"
            contentContainerClassName="gap-2 px-4"
          >
            {SECTIONS.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setSection(s.key)}
                accessibilityRole="button"
                accessibilityLabel={s.label}
                accessibilityState={{ selected: section === s.key }}
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 active:opacity-70 ${
                  section === s.key ? "border-beer-500 bg-beer-500/15" : "border-stout-600"
                }`}
              >
                <Ionicons
                  name={s.icon}
                  size={14}
                  color={section === s.key ? raw.beer : raw.textFaint}
                />
                <Text
                  className={`font-sans-med text-[12px] ${
                    section === s.key ? "text-beer-400" : "text-cream-dim"
                  }`}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="mt-4 flex-1">
            {section === "rounds" ? (
              <RoundsSection detail={detail} reload={reload} insets={insets} />
            ) : section === "teams" ? (
              <TeamsSection tournamentId={tournamentId} insets={insets} />
            ) : section === "disputes" ? (
              <DisputesSection tournamentId={tournamentId} insets={insets} />
            ) : section === "tables" ? (
              <TablesSection detail={detail} reload={reload} insets={insets} />
            ) : section === "players" ? (
              <PlayersSection venueId={detail.venueId} insets={insets} />
            ) : section === "messages" ? (
              <MessagesSection tournamentId={tournamentId} insets={insets} />
            ) : (
              <SettingsSection detail={detail} reload={reload} insets={insets} />
            )}
          </View>
        </>
      ) : (
        <Text className="px-4 font-sans text-[13px] text-dispute">{error}</Text>
      )}
    </View>
  );
}
