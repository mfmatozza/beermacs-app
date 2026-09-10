import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ChatMessage } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";
import { useCurrentTeam } from "../../lib/use-current-team";

type Tab = "tournament" | "match" | "staff";

const STAFF_ROLES = new Set(["VENUE_STAFF", "VENUE_ADMIN", "VENUE_OWNER"]);

/**
 * Chat (U-8/U-9/U-10) — three channels and no more, per the spec: everyone
 * playing tonight, the match currently on a table, and messages from the
 * bar. Ships with the moderation kit App Store guideline 1.2 requires
 * before user-generated content can go live: report, block, staff-mute.
 *
 * Functional, not yet styled to a final direction — reusing this app's
 * existing tokens as-is rather than inventing a new look here.
 */
export default function ChatTab() {
  const insets = useSafeAreaInsets();
  const { myTeam, me, isLoading: meLoading } = useCurrentTeam();
  const tournamentId = myTeam?.team.tournament.id ?? null;
  const [tab, setTab] = useState<Tab>("tournament");
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();

  const isStaff = useMemo(() => {
    if (!myTeam || !me) return false;
    const membership = me.memberships.find((m) => m.venue.id === myTeam.team.tournament.venueId);
    return membership ? STAFF_ROLES.has(membership.role) : false;
  }, [myTeam, me]);

  const myMatchQuery = useQuery({
    queryKey: ["board", tournamentId],
    queryFn: () => api.board(tournamentId!),
    enabled: tournamentId !== null && tab === "match",
    refetchInterval: 3000,
  });
  const myMatchId = useMemo(() => {
    if (!myMatchQuery.data || !myTeam) return null;
    for (const stage of myMatchQuery.data.stages) {
      for (const round of stage.rounds) {
        const match = round.matches.find(
          (m) =>
            m.state !== "confirmed" &&
            (m.home?.teamId === myTeam.team.id || m.away?.teamId === myTeam.team.id)
        );
        if (match) return match.id;
      }
    }
    return null;
  }, [myMatchQuery.data, myTeam]);

  const tournamentChatQuery = useQuery({
    queryKey: ["chat", "tournament", tournamentId],
    queryFn: () => api.tournamentChat(tournamentId!),
    enabled: tournamentId !== null && tab === "tournament",
    refetchInterval: 3000,
  });
  const matchChatQuery = useQuery({
    queryKey: ["chat", "match", myMatchId],
    queryFn: () => api.matchChat(myMatchId!),
    enabled: myMatchId !== null && tab === "match",
    refetchInterval: 3000,
  });
  const staffMessagesQuery = useQuery({
    queryKey: ["chat", "staff", tournamentId],
    queryFn: () => api.staffMessages(tournamentId!),
    enabled: tournamentId !== null && tab === "staff",
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      tab === "match" && myMatchId
        ? api.sendMatchChat(myMatchId, body)
        : api.sendTournamentChat(tournamentId!, body),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: (messageId: string) => api.reportMessage(messageId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });
  const blockMutation = useMutation({
    mutationFn: (userId: string) => api.blockUser(userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });
  const muteMutation = useMutation({
    mutationFn: (userId: string) => api.muteInTournament(tournamentId!, userId),
  });
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => api.deleteChatMessage(messageId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });

  const activeQuery =
    tab === "tournament"
      ? tournamentChatQuery
      : tab === "match"
        ? matchChatQuery
        : staffMessagesQuery;
  const canSend = tab === "tournament" || (tab === "match" && myMatchId !== null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-stout-900"
      keyboardVerticalOffset={insets.top}
    >
      <View style={{ paddingTop: insets.top + 12 }} className="gap-3 px-4">
        <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">Chat</Text>
        <View className="flex-row gap-2">
          <TabButton
            label="Everyone"
            active={tab === "tournament"}
            onPress={() => setTab("tournament")}
          />
          <TabButton label="My match" active={tab === "match"} onPress={() => setTab("match")} />
          <TabButton
            label="From the bar"
            active={tab === "staff"}
            onPress={() => setTab("staff")}
          />
        </View>
      </View>

      {meLoading ? (
        <ActivityIndicator color={raw.beer} style={{ marginTop: 24 }} />
      ) : !tournamentId ? (
        <Text className="mt-6 px-4 font-sans text-[13px] leading-[19px] text-cream-dim">
          You&rsquo;re not in a tournament right now — join one from Home.
        </Text>
      ) : (
        <>
          <ScrollView
            className="flex-1 px-4"
            contentContainerClassName="gap-3 py-4"
            showsVerticalScrollIndicator={false}
          >
            {activeQuery.isLoading ? (
              <ActivityIndicator color={raw.beer} />
            ) : tab === "match" && !myMatchId ? (
              <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
                You don&rsquo;t have a match on a table right now.
              </Text>
            ) : activeQuery.isError || !activeQuery.data ? (
              <Text className="font-sans text-[13px] leading-[19px] text-dispute">
                Couldn&rsquo;t load chat. Pull to retry in a moment.
              </Text>
            ) : "messages" in activeQuery.data && activeQuery.data.messages.length === 0 ? (
              <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
                No messages yet.
              </Text>
            ) : "messages" in activeQuery.data ? (
              activeQuery.data.messages.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  isStaff={isStaff}
                  onReport={() => reportMutation.mutate(m.id)}
                  onBlock={() => m.authorId && blockMutation.mutate(m.authorId)}
                  onMute={() => m.authorId && muteMutation.mutate(m.authorId)}
                  onDelete={() => deleteMutation.mutate(m.id)}
                />
              ))
            ) : null}
          </ScrollView>

          {canSend ? (
            <View
              style={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 8 }}
              className="flex-row items-end gap-2 border-t border-stout-600 bg-stout-900 px-4 pt-3"
            >
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message..."
                placeholderTextColor={raw.textFaint}
                multiline
                className="max-h-[100px] flex-1 rounded-lg border border-stout-500 bg-stout-850 px-3 py-2 text-[14px] text-cream"
              />
              <Pressable
                onPress={() => draft.trim() && sendMutation.mutate(draft.trim())}
                disabled={!draft.trim() || sendMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Send"
                className={`min-h-[40px] items-center justify-center rounded-lg bg-beer-500 px-4 active:opacity-70 ${
                  !draft.trim() || sendMutation.isPending ? "opacity-40" : ""
                }`}
              >
                {sendMutation.isPending ? (
                  <ActivityIndicator size="small" color={raw.canvas} />
                ) : (
                  <Text className="font-display text-base uppercase text-stout-900">Send</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
        active ? "border-beer-500 bg-beer-500/15" : "border-stout-600 bg-transparent"
      }`}
    >
      <Text
        className={`font-sans-med text-[12px] uppercase tracking-[0.6px] ${
          active ? "text-beer-400" : "text-cream-dim"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MessageRow({
  message,
  isStaff,
  onReport,
  onBlock,
  onMute,
  onDelete,
}: {
  message: ChatMessage;
  isStaff: boolean;
  onReport: () => void;
  onBlock: () => void;
  onMute: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="gap-1 rounded-xl border border-stout-600 bg-stout-850 p-3">
      <View className="flex-row items-baseline gap-2">
        <Text className="font-sans-med text-[13px] text-beer-400">
          {message.authorName ?? "Someone"}
        </Text>
        <Text className="font-sans text-[11px] text-cream-faint">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {message.flaggedAt ? (
          <Text className="font-sans-med text-[11px] uppercase tracking-[0.6px] text-dispute">
            Flagged
          </Text>
        ) : null}
      </View>
      <Text className="font-sans text-[14px] leading-[20px] text-cream">{message.body}</Text>
      {message.authorId ? (
        <View className="mt-1 flex-row gap-4">
          <Pressable
            onPress={onReport}
            accessibilityRole="button"
            accessibilityLabel="Report message"
          >
            <Text className="font-sans-med text-[11px] uppercase tracking-[0.6px] text-cream-faint">
              {message.flaggedAt ? "Reported" : "Report"}
            </Text>
          </Pressable>
          <Pressable onPress={onBlock} accessibilityRole="button" accessibilityLabel="Block user">
            <Text className="font-sans-med text-[11px] uppercase tracking-[0.6px] text-cream-faint">
              Block
            </Text>
          </Pressable>
          {isStaff ? (
            <>
              <Pressable onPress={onMute} accessibilityRole="button" accessibilityLabel="Mute user">
                <Text className="font-sans-med text-[11px] uppercase tracking-[0.6px] text-notice">
                  Mute
                </Text>
              </Pressable>
              <Pressable
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete message"
              >
                <Text className="font-sans-med text-[11px] uppercase tracking-[0.6px] text-dispute">
                  Delete
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
