import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, type TeamRosterEntry } from "../../lib/api";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

/** The full roster (A-7/A-8): add a team with no join code, withdraw one. */
export default function TeamsSection({
  tournamentId,
  insets,
}: {
  tournamentId: string;
  insets: { top: number; bottom: number };
}) {
  const queryClient = useQueryClient();
  const teamsQuery = useQuery({
    queryKey: ["admin-teams", tournamentId],
    queryFn: () => api.listTeams(tournamentId),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admin-teams", tournamentId] });

  const [name, setName] = useState("");
  const addMutation = useMutation({
    mutationFn: () => api.adminAddTeam(tournamentId, { name: name.trim() }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (teamId: string) => api.withdrawTeam(teamId),
    onSuccess: invalidate,
  });

  const confirmWithdraw = (team: TeamRosterEntry) => {
    Alert.alert(`Withdraw ${team.name}?`, "Their match history stays in the bracket.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: () => withdrawMutation.mutate(team.id),
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      contentContainerClassName="gap-4 px-4"
    >
      <View className="gap-2 rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          Add a team — no join code needed
        </Text>
        <View className="flex-row gap-2">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Team name"
            placeholderTextColor={raw.textFaint}
            maxLength={40}
            accessibilityLabel="Team name"
            className="min-h-[44px] flex-1 rounded-lg border border-stout-500 bg-stout-900/70 px-3 font-sans text-[15px] text-cream"
          />
          <Pressable
            onPress={() => addMutation.mutate()}
            disabled={name.trim().length === 0 || addMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Add team"
            className={`min-h-[44px] items-center justify-center rounded-lg bg-beer-500 px-4 active:opacity-70 ${
              name.trim().length === 0 || addMutation.isPending ? "opacity-40" : ""
            }`}
          >
            {addMutation.isPending ? (
              <ActivityIndicator size="small" color={raw.canvas} />
            ) : (
              <Text className="font-display text-base uppercase text-stout-900">Add</Text>
            )}
          </Pressable>
        </View>
        {addMutation.isError ? (
          <Text className="font-sans text-[12px] text-dispute">Couldn&rsquo;t add that team.</Text>
        ) : null}
      </View>

      {teamsQuery.isLoading || !teamsQuery.data ? (
        <ActivityIndicator color={raw.beer} />
      ) : teamsQuery.isError ? (
        <Text className="font-sans text-[13px] text-dispute">Couldn&rsquo;t load the roster.</Text>
      ) : teamsQuery.data.teams.length === 0 ? (
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          No teams yet — add one above, or wait for players to join with the tournament code.
        </Text>
      ) : (
        teamsQuery.data.teams.map((team) => (
          <View
            key={team.id}
            className={`flex-row items-center gap-3 rounded-2xl border p-4 ${
              team.withdrawn ? "border-stout-700 bg-stout-850/60 opacity-60" : "border-stout-600 bg-stout-750/85"
            }`}
          >
            <View className="flex-1 gap-0.5">
              <Text className="font-sans-med text-[15px] text-cream" numberOfLines={1}>
                {team.name}
              </Text>
              <Text className="font-sans text-[12px] text-cream-dim">
                Entered round {team.entryRound} · code {team.joinCode}
                {team.withdrawn ? " · withdrawn" : ""}
              </Text>
            </View>
            {!team.withdrawn ? (
              <Pressable
                onPress={() => confirmWithdraw(team)}
                disabled={withdrawMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Withdraw ${team.name}`}
                className="rounded-full border border-dispute px-3 py-1.5 active:opacity-70"
              >
                <Text className="font-sans-med text-[11px] uppercase tracking-[1px] text-dispute">
                  Withdraw
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}
