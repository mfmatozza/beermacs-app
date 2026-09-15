import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isCompleteJoinCode, joinCodeLength, normaliseJoinCode } from "@beermacs/shared";
import { ApiError, type MeResponse, api } from "../lib/api";
import { usePendingTournamentStore } from "../lib/pending-tournament";
import { raw, TAB_BAR_HEIGHT } from "../lib/theme";
import { findMyNextUp, toNextUpState } from "../lib/next-up";
import { useCurrentTeam } from "../lib/use-current-team";
import { useJoinTournament } from "../lib/use-join-tournament";
import AmbientBeer from "./AmbientBeer";
import GlowLogo from "./GlowLogo";
import NextUpCard from "./NextUpCard";

/**
 * Home asks one question: are you in a tournament right now?
 *
 * No venue picker, no news feed, no "nearby bars" — a player who isn't at a
 * bar tonight has no reason to open this screen, and one who is already knows
 * which bar they're standing in. The only jobs left are: get into a
 * tournament (code, and — once expo-camera lands, see docs/DECISIONS.md —
 * QR/deep-link), then, once in, show what's happening right now, which lives
 * on the Bracket tab in detail but gets its own summary card here so a player
 * never has to leave Home to see whether they're up.
 */
/** Report/confirm/dispute all fail with the same `kind` strings the shared
 *  approval state machine returns (packages/shared/src/approval.ts) — one
 *  mapping for all three rather than three near-identical switch statements. */
function matchActionErrorMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return "Check your connection and try again.";
  switch (e.code) {
    case "self_confirmation":
      return "You can't confirm your own report — the other team needs to.";
    case "wrong_state":
      return "This match has already moved on. Pull to refresh and try again.";
    case "tournament_ended":
      return "This tournament has already ended.";
    case "implausible_score":
      return "That score doesn't add up for this format.";
    default:
      return "Try again in a moment.";
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { myTeam, me, isLoading: meLoading } = useCurrentTeam();
  const pending = usePendingTournamentStore((s) => s.pending);
  const hydrated = usePendingTournamentStore((s) => s.hydrated);
  const setPending = usePendingTournamentStore((s) => s.setPending);

  // A team forms — resolving the pending pointer — from either this device
  // (the create/join calls below clear it directly) or another one entirely
  // (a teammate captains it). Either way, once /api/me shows a team, the
  // pending pointer is stale; drop it rather than let it shadow real state.
  useEffect(() => {
    if (myTeam && pending) setPending(null);
  }, [myTeam, pending, setPending]);

  const loading = meLoading || !hydrated;

  return (
    <View className="flex-1 bg-stout-900">
      <AmbientBeer />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={raw.beer} />
        </View>
      ) : myTeam ? (
        <ActiveTournamentHome myTeam={myTeam} insets={insets} />
      ) : pending ? (
        <TeamSetupHome pending={pending} insets={insets} onAbandon={() => setPending(null)} />
      ) : (
        <JoinHome me={me} insets={insets} />
      )}
    </View>
  );
}

// ── State 1: not in anything ────────────────────────────────────────────────

function JoinHome({ me, insets }: { me: MeResponse | undefined; insets: { top: number; bottom: number } }) {
  const [code, setCode] = useState("");
  const { join, joining, error, clearError } = useJoinTournament(me?.user.displayName);

  const submit = useCallback(async () => {
    if (await join(code)) setCode("");
  }, [join, code]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="flex-1 justify-center gap-8 px-5"
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center gap-1">
        <GlowLogo size={104} />
        <Text className="-mt-3 font-display text-4xl uppercase tracking-[1.6px] text-cream">
          Beermacs
        </Text>
        <Text className="mt-1 max-w-[260px] text-center font-sans text-[13px] leading-[19px] text-cream-dim">
          Not in a tournament right now. Get the code from your table and you&rsquo;re in.
        </Text>
      </View>

      <View className="gap-2 rounded-2xl border border-glow-edge bg-glow-soft p-4">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-400">
          Enter tournament code
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) => {
            clearError();
            setCode(normaliseJoinCode(v));
          }}
          placeholder={"·".repeat(joinCodeLength)}
          placeholderTextColor={raw.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={joinCodeLength}
          returnKeyType="go"
          onSubmitEditing={submit}
          accessibilityLabel="Tournament join code"
          className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 text-center font-sans-bold text-2xl tabular-nums tracking-[8px] text-cream"
        />
        {error ? (
          <Text className="font-sans text-[13px] leading-[19px] text-dispute">{error}</Text>
        ) : null}
        <Pressable
          onPress={submit}
          disabled={!isCompleteJoinCode(code) || joining}
          accessibilityRole="button"
          accessibilityLabel="Join tournament"
          accessibilityState={{ disabled: !isCompleteJoinCode(code) || joining, busy: joining }}
          className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
            isCompleteJoinCode(code) && !joining ? "" : "opacity-40"
          }`}
        >
          {joining ? (
            <ActivityIndicator size="small" color={raw.canvas} />
          ) : (
            <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
              Join tournament
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── State 2: joined a tournament, no team yet ───────────────────────────────

function TeamSetupHome({
  pending,
  insets,
  onAbandon,
}: {
  pending: { tournamentId: string; tournamentName: string; venueName: string | null };
  insets: { top: number; bottom: number };
  onAbandon: () => void;
}) {
  const queryClient = useQueryClient();
  const setPending = usePendingTournamentStore((s) => s.setPending);

  // The pending pointer has no server row backing it (see lib/pending-tournament.ts) —
  // if the tournament ended, was canceled, or simply doesn't exist any more
  // between joining and forming a team, this is the one place that finds out,
  // via the same public board read the Bracket tab uses.
  const boardQuery = useQuery({
    queryKey: ["board", pending.tournamentId],
    queryFn: () => api.board(pending.tournamentId),
    retry: false,
  });
  useEffect(() => {
    if (boardQuery.isError) onAbandon();
    else if (boardQuery.data && boardQuery.data.status !== "REGISTRATION" && boardQuery.data.status !== "RUNNING") {
      onAbandon();
    }
  }, [boardQuery.isError, boardQuery.data, onAbandon]);

  const [teamName, setTeamName] = useState("");
  const createMutation = useMutation({
    mutationFn: () => api.createTeam(pending.tournamentId, { name: teamName.trim() }),
    onSuccess: () => {
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const [teamCode, setTeamCode] = useState("");
  const joinMutation = useMutation({
    mutationFn: () => api.joinTeam({ code: teamCode }),
    onSuccess: () => {
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-6 px-5"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-400">
          {pending.venueName ?? "You're in"}
        </Text>
        <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
          {pending.tournamentName}
        </Text>
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          One step left. Whoever creates the team gets a new code below to
          text the rest of the table — that's separate from the one you just
          typed, so keep it handy after you create.
        </Text>
      </View>

      <View className="gap-2 rounded-2xl border border-stout-600 bg-stout-850 p-4">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          Create a team
        </Text>
        <TextInput
          value={teamName}
          onChangeText={(v) => {
            createMutation.reset();
            setTeamName(v);
          }}
          placeholder="Team name"
          placeholderTextColor={raw.textFaint}
          maxLength={40}
          returnKeyType="done"
          accessibilityLabel="Team name"
          className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 font-sans-med text-[15px] text-cream"
        />
        {createMutation.isError ? (
          <Text className="font-sans text-[13px] leading-[19px] text-dispute">
            Couldn&rsquo;t create that team. Try again in a moment.
          </Text>
        ) : null}
        <Pressable
          onPress={() => createMutation.mutate()}
          disabled={teamName.trim().length === 0 || createMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Create team"
          className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
            teamName.trim().length > 0 && !createMutation.isPending ? "" : "opacity-40"
          }`}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={raw.canvas} />
          ) : (
            <Text className="font-display text-lg uppercase tracking-[0.6px] text-stout-900">
              Create team
            </Text>
          )}
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-stout-600" />
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          or
        </Text>
        <View className="h-px flex-1 bg-stout-600" />
      </View>

      <View className="gap-2 rounded-2xl border border-stout-600 bg-stout-850 p-4">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          Join a teammate&rsquo;s team
        </Text>
        <TextInput
          value={teamCode}
          onChangeText={(v) => {
            joinMutation.reset();
            setTeamCode(normaliseJoinCode(v));
          }}
          placeholder={"·".repeat(joinCodeLength)}
          placeholderTextColor={raw.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={joinCodeLength}
          returnKeyType="go"
          accessibilityLabel="Team join code"
          className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 text-center font-sans-bold text-xl tabular-nums tracking-[6px] text-cream"
        />
        {joinMutation.isError ? (
          <Text className="font-sans text-[13px] leading-[19px] text-dispute">
            No team with that code in this tournament.
          </Text>
        ) : null}
        <Pressable
          onPress={() => joinMutation.mutate()}
          disabled={!isCompleteJoinCode(teamCode) || joinMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Join team"
          className={`min-h-[48px] items-center justify-center rounded-lg border border-stout-500 bg-transparent px-6 active:opacity-70 ${
            isCompleteJoinCode(teamCode) && !joinMutation.isPending ? "" : "opacity-40"
          }`}
        >
          {joinMutation.isPending ? (
            <ActivityIndicator size="small" color={raw.textFaint} />
          ) : (
            <Text className="font-display text-lg uppercase tracking-[0.6px] text-cream">
              Join team
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── State 3: in a tournament, on a team ─────────────────────────────────────

function ActiveTournamentHome({
  myTeam,
  insets,
}: {
  myTeam: NonNullable<ReturnType<typeof useCurrentTeam>["myTeam"]>;
  insets: { top: number; bottom: number };
}) {
  const queryClient = useQueryClient();
  const tournamentId = myTeam.team.tournament.id;

  const boardQuery = useQuery({
    queryKey: ["board", tournamentId],
    queryFn: () => api.board(tournamentId),
    refetchInterval: 3000,
  });
  const staffQuery = useQuery({
    queryKey: ["staff-messages", tournamentId],
    queryFn: () => api.staffMessages(tournamentId),
    refetchInterval: 15000,
  });

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ["board", tournamentId] });
  };
  const reportMutation = useMutation({
    mutationFn: (vars: { matchId: string; winnerId: string }) =>
      api.reportMatch(vars.matchId, { winnerId: vars.winnerId }),
    onSuccess: invalidateBoard,
    onError: (e) => Alert.alert("Couldn't report the score", matchActionErrorMessage(e)),
  });
  const confirmMutation = useMutation({
    mutationFn: (matchId: string) => api.confirmMatch(matchId),
    onSuccess: invalidateBoard,
    onError: (e) => Alert.alert("Couldn't confirm", matchActionErrorMessage(e)),
  });
  const rejectMutation = useMutation({
    mutationFn: (matchId: string) => api.rejectMatch(matchId, {}),
    onSuccess: invalidateBoard,
    onError: (e) => Alert.alert("Couldn't dispute", matchActionErrorMessage(e)),
  });

  const mine = useMemo(() => {
    if (!boardQuery.data) return null;
    return findMyNextUp(boardQuery.data.stages, myTeam.team.id);
  }, [boardQuery.data, myTeam.team.id]);

  const nextUpState = useMemo(() => {
    if (!mine) return null;
    return toNextUpState(mine, myTeam.team.id, {
      reporting: reportMutation.isPending,
      confirmBusy: confirmMutation.isPending || rejectMutation.isPending,
      onReport: (winnerIsMe) => {
        if (mine.kind !== "match") return;
        const opponentTeamId =
          mine.match.home?.teamId === myTeam.team.id
            ? mine.match.away?.teamId
            : mine.match.home?.teamId;
        const winnerId = winnerIsMe ? myTeam.team.id : (opponentTeamId ?? myTeam.team.id);
        reportMutation.mutate({ matchId: mine.match.id, winnerId });
      },
      onConfirm: () => {
        if (mine.kind === "match") confirmMutation.mutate(mine.match.id);
      },
      onDispute: () => {
        if (mine.kind === "match") rejectMutation.mutate(mine.match.id);
      },
    });
  }, [mine, myTeam.team.id, reportMutation, confirmMutation, rejectMutation]);

  const latestStaffMessage = staffQuery.data?.messages.at(-1) ?? null;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-5 px-5"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-400">
          {myTeam.team.name}
        </Text>
        <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
          {myTeam.team.tournament.name}
        </Text>
      </View>

      {boardQuery.isLoading ? (
        <ActivityIndicator color={raw.beer} />
      ) : nextUpState && mine ? (
        <NextUpCard state={nextUpState} roundIndex={mine.roundIndex} />
      ) : (
        <View className="gap-1 rounded-2xl border border-stout-600 bg-stout-700 p-4">
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
            No match on the board for {myTeam.team.name} yet — check back once the round opens.
          </Text>
        </View>
      )}

      {latestStaffMessage ? (
        <View className="gap-1 rounded-2xl border border-stout-600 bg-stout-850 p-4">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
            From the bar
          </Text>
          <Text className="font-sans text-[13px] leading-[19px] text-cream">
            {latestStaffMessage.body}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <QuickLink label="Full bracket" onPress={() => router.navigate("/bracket")} />
        <QuickLink label="Tournament chat" onPress={() => router.navigate("/chat")} />
      </View>

      <View className="gap-1 rounded-2xl border border-stout-600 bg-stout-850 p-4">
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          Invite teammates
        </Text>
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          Share this code — anyone at the venue can use it to join {myTeam.team.name}.
        </Text>
        <Text className="mt-1 self-start rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-2 font-sans-bold text-xl tabular-nums tracking-[6px] text-cream">
          {myTeam.team.joinCode}
        </Text>
      </View>
    </ScrollView>
  );
}

function QuickLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-[44px] flex-1 items-center justify-center rounded-lg border border-stout-500 bg-transparent px-4 active:opacity-70"
    >
      <Text className="font-sans-med text-[13px] uppercase tracking-[0.8px] text-cream">
        {label}
      </Text>
    </Pressable>
  );
}
