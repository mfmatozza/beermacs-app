import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isCompleteJoinCode, joinCodeLength, normaliseJoinCode } from "@beermacs/shared";
import { ApiError, api } from "../lib/api";
import { nearbyVenues, news, viewer } from "../lib/fixtures";
import { registerForPush } from "../lib/push";
import { raw, TAB_BAR_HEIGHT } from "../lib/theme";
import AmbientBeer from "./AmbientBeer";
import GlowLogo from "./GlowLogo";
import NewsFeed from "./NewsFeed";
import VenuePicker from "./VenuePicker";

/**
 * Home asks one question: which bar are you at?
 *
 * It does NOT assume a venue. Even with an active registration, the picker is
 * the primary content — you might have walked to a different bar, and the app
 * having decided for you is worse than one tap. What is happening inside a
 * tournament lives on the Bracket tab.
 *
 * Below the picker: the announcement feed, carrying both a venue's posts and
 * platform-wide news from us.
 */
function joinErrorMessage(code: string): string {
  switch (code) {
    case "unknown_code":
      return "No tournament with that code. Check the table tent.";
    case "registration_not_open":
      return "That tournament hasn't opened for registration yet.";
    case "tournament_finished":
      return "That tournament has already finished.";
    case "not_signed_in":
      return "Couldn't reach the bar's tournament. Check your connection.";
    default:
      return "Couldn't join just now. Try again in a moment.";
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const join = useCallback(async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await api.join({ code, displayName: viewer.displayName });
      setCode("");
      // Ask for notification permission right here, not at sign-up — this is
      // the first moment the app has something worth paging you about (U-15:
      // "you have to play"), which is exactly the placement
      // docs/APP_STORE_COMPLIANCE.md's push section calls for over asking on
      // first launch before the user has done anything.
      void registerForPush();
    } catch (e) {
      setJoinError(joinErrorMessage(e instanceof ApiError ? e.code : "unknown"));
    } finally {
      setJoining(false);
    }
  }, [code]);

  // Platform posts first, then the rest newest-first. Our announcements are the
  // reason a player who is not at a bar tonight still opens the app.
  const feed = useMemo(
    () =>
      [...news].sort(
        (a, b) =>
          Number(a.venueId !== null) - Number(b.venueId !== null) ||
          b.publishedAt.localeCompare(a.publishedAt)
      ),
    []
  );

  return (
    <View className="flex-1 bg-stout-900">
      <AmbientBeer />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          // The glow canvas around the mark is transparent, so the mark's own
          // top edge sits well inside it — clear the notch with room to spare.
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
        }}
        contentContainerClassName="gap-7 px-4"
        showsVerticalScrollIndicator={false}
        alwaysBounceHorizontal={false}
      >
        {/* ── the mark, lit ─────────────────────────────────────────────── */}
        <View className="items-center">
          <GlowLogo size={104} />
          <Text className="-mt-3 font-display text-4xl uppercase tracking-[1.6px] text-cream">
            Beermacs
          </Text>
          <Text className="mt-1 font-sans-med text-[11px] uppercase tracking-[1.4px] text-beer-400">
            Where are you drinking?
          </Text>
        </View>

        {/* ── pick your bar ─────────────────────────────────────────────── */}
        <VenuePicker
          venues={nearbyVenues}
          query={query}
          onQueryChange={setQuery}
          onPick={() => {}}
        />

        {/* ── or type the code off the table ───────────────────────────── */}
        <JoinBox code={code} onChange={setCode} onSubmit={join} busy={joining} error={joinError} />

        {/* ── news, ours and the bars' ─────────────────────────────────── */}
        <View className="gap-2">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
            What&rsquo;s on
          </Text>
          <NewsFeed items={feed} />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Join straight into a tournament with the code off the table tent, skipping the
 * picker. Normalises as you type — Crockford Base32 folds O→0, I/L→1 and U→V —
 * so a code read aloud across a loud room still lands.
 */
function JoinBox({
  code,
  onChange,
  onSubmit,
  busy,
  error,
}: {
  code: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  const complete = isCompleteJoinCode(code);
  return (
    <View className="gap-2 rounded-2xl border border-glow-edge bg-glow-soft p-4">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-400">
        Already at a table? Type the code
      </Text>
      <TextInput
        value={code}
        onChangeText={(v) => onChange(normaliseJoinCode(v))}
        placeholder={"·".repeat(joinCodeLength)}
        placeholderTextColor={raw.textFaint}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={joinCodeLength}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        accessibilityLabel="Tournament join code"
        className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 text-center font-sans-bold text-2xl tabular-nums tracking-[8px] text-cream"
      />
      {error ? (
        <Text className="font-sans text-[13px] leading-[19px] text-dispute">{error}</Text>
      ) : null}
      <Pressable
        onPress={onSubmit}
        disabled={!complete || busy}
        accessibilityRole="button"
        accessibilityLabel="Join tournament"
        accessibilityState={{ disabled: !complete || busy, busy }}
        className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
          complete && !busy ? "" : "opacity-40"
        }`}
      >
        {busy ? (
          <ActivityIndicator size="small" color={raw.canvas} />
        ) : (
          <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
            Join
          </Text>
        )}
      </Pressable>
    </View>
  );
}
