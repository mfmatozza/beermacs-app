import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

type Target = "broadcast" | "team";

/** A-18/A-19: message everyone in the tournament or one team — push
 *  notification on send is automatic server-side, not this screen's job.
 *  (The API also takes a single recipient; there's no people picker here
 *  yet, and a raw "user id" field was unusable, so it's not offered.) */
export default function MessagesSection({
  tournamentId,
  insets,
}: {
  tournamentId: string;
  insets: { top: number; bottom: number };
}) {
  const [target, setTarget] = useState<Target>("broadcast");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [body, setBody] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["admin-teams", tournamentId],
    queryFn: () => api.listTeams(tournamentId),
    enabled: target === "team",
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.sendAdminMessage(tournamentId, {
        body: body.trim(),
        ...(target === "team" && teamId ? { teamId } : {}),
      }),
    onSuccess: () => {
      setBody("");
      setTeamId(null);
    },
  });

  const canSend =
    body.trim().length > 0 &&
    (target === "broadcast" || (target === "team" && teamId));

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      contentContainerClassName="gap-4 px-4"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className="flex-row gap-2">
        {(["broadcast", "team"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              setTarget(t);
              sendMutation.reset();
            }}
            accessibilityRole="button"
            accessibilityLabel={t === "broadcast" ? "Everyone" : "One team"}
            accessibilityState={{ selected: target === t }}
            className={`flex-1 items-center rounded-lg border py-2.5 active:opacity-70 ${
              target === t ? "border-beer-500 bg-beer-500/15" : "border-stout-600"
            }`}
          >
            <Text className={`font-sans-med text-[13px] ${target === t ? "text-beer-400" : "text-cream-dim"}`}>
              {t === "broadcast" ? "Everyone" : "One team"}
            </Text>
          </Pressable>
        ))}
      </View>

      {target === "team" ? (
        <View className="gap-2">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
            Which team
          </Text>
          {teamsQuery.isLoading ? (
            <ActivityIndicator color={raw.beer} />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {(teamsQuery.data?.teams ?? [])
                .filter((t) => !t.withdrawn)
                .map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setTeamId(t.id)}
                    accessibilityRole="button"
                    className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                      teamId === t.id ? "border-beer-500 bg-beer-500/15" : "border-stout-600"
                    }`}
                  >
                    <Text className={`font-sans-med text-[12px] ${teamId === t.id ? "text-beer-400" : "text-cream"}`}>
                      {t.name}
                    </Text>
                  </Pressable>
                ))}
            </View>
          )}
        </View>
      ) : null}

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Message"
        placeholderTextColor={raw.textFaint}
        multiline
        maxLength={2000}
        accessibilityLabel="Message"
        className="min-h-[100px] rounded-lg border border-stout-500 bg-stout-900/70 px-3 py-2 font-sans text-[14px] text-cream"
      />

      {sendMutation.isError ? (
        <Text className="font-sans text-[12px] text-dispute">Couldn&rsquo;t send that message.</Text>
      ) : null}
      {sendMutation.isSuccess ? (
        <Text className="font-sans text-[12px] text-live">Sent.</Text>
      ) : null}

      <Pressable
        onPress={() => sendMutation.mutate()}
        disabled={!canSend || sendMutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 active:opacity-70 ${
          !canSend || sendMutation.isPending ? "opacity-40" : ""
        }`}
      >
        {sendMutation.isPending ? (
          <ActivityIndicator size="small" color={raw.canvas} />
        ) : (
          <Text className="font-display text-lg uppercase tracking-[0.6px] text-stout-900">Send</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
