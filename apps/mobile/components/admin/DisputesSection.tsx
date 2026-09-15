import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type BoardMatch } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

/**
 * A-12: force-settle a disputed match. The one admin action this app had
 * NO way to reach from a phone before this — a dispute (two mismatched
 * reports) could only ever sit there. Reused the public board read
 * (already polled by the player-facing Bracket tab) rather than a new
 * endpoint: it already carries every disputed match with both team names.
 */
export default function DisputesSection({
  tournamentId,
  insets,
}: {
  tournamentId: string;
  insets: { top: number; bottom: number };
}) {
  const queryClient = useQueryClient();
  const boardQuery = useQuery({
    queryKey: ["board", tournamentId],
    queryFn: () => api.board(tournamentId),
    refetchInterval: 5000,
  });

  const disputed = useMemo(() => {
    if (!boardQuery.data) return [];
    return boardQuery.data.stages.flatMap((s) =>
      s.rounds.flatMap((r) => r.matches.filter((m) => m.state === "disputed").map((m) => ({ match: m, roundIndex: r.index })))
    );
  }, [boardQuery.data]);

  const resolveMutation = useMutation({
    mutationFn: (vars: { matchId: string; winnerId: string; reason: string }) =>
      api.resolveMatch(vars.matchId, { winnerId: vars.winnerId, reason: vars.reason }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["board", tournamentId] }),
    onError: () => Alert.alert("Couldn't settle that match", "Try again in a moment."),
  });

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      contentContainerClassName="gap-4 px-4"
    >
      {boardQuery.isLoading ? (
        <ActivityIndicator color={raw.beer} />
      ) : disputed.length === 0 ? (
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          No disputes right now — matches with mismatched reports show up here.
        </Text>
      ) : (
        disputed.map(({ match, roundIndex }) => (
          <DisputeCard
            key={match.id}
            match={match}
            roundIndex={roundIndex}
            busy={resolveMutation.isPending}
            onResolve={(winnerId, reason) => resolveMutation.mutate({ matchId: match.id, winnerId, reason })}
          />
        ))
      )}
    </ScrollView>
  );
}

function DisputeCard({
  match,
  roundIndex,
  busy,
  onResolve,
}: {
  match: BoardMatch;
  roundIndex: number;
  busy: boolean;
  onResolve: (winnerId: string, reason: string) => void;
}) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <View className="gap-3 rounded-2xl border border-dispute/50 bg-dispute/10 p-4">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-dispute">
        {`Round ${roundIndex} · disputed`}
      </Text>
      <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
        Two reports don&rsquo;t agree — pick the real winner and say why.
      </Text>

      <View className="gap-2">
        {[match.home, match.away].map((team) =>
          team ? (
            <Pressable
              key={team.teamId}
              onPress={() => setWinnerId(team.teamId)}
              accessibilityRole="button"
              accessibilityLabel={`${team.name} won`}
              className={`flex-row items-center justify-between rounded-lg border px-3 py-2.5 active:opacity-70 ${
                winnerId === team.teamId ? "border-beer-500 bg-beer-500/15" : "border-stout-600"
              }`}
            >
              <Text className="font-sans-med text-[14px] text-cream">{team.name}</Text>
              {winnerId === team.teamId ? (
                <Text className="font-sans-med text-[11px] uppercase text-beer-400">Winner</Text>
              ) : null}
            </Pressable>
          ) : null
        )}
      </View>

      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Reason (required — goes in the audit log)"
        placeholderTextColor={raw.textFaint}
        multiline
        accessibilityLabel="Reason"
        className="min-h-[60px] rounded-lg border border-stout-500 bg-stout-900/70 px-3 py-2 font-sans text-[13px] text-cream"
      />

      <Pressable
        onPress={() => winnerId && onResolve(winnerId, reason.trim())}
        disabled={!winnerId || reason.trim().length === 0 || busy}
        accessibilityRole="button"
        accessibilityLabel="Settle dispute"
        className={`min-h-[44px] items-center justify-center rounded-lg bg-dispute active:opacity-70 ${
          !winnerId || reason.trim().length === 0 || busy ? "opacity-40" : ""
        }`}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text className="font-display text-base uppercase tracking-[0.6px] text-white">
            Settle it
          </Text>
        )}
      </Pressable>
    </View>
  );
}
