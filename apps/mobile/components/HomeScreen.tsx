import { isCompleteJoinCode, joinCodeLength, normaliseJoinCode, sideOf } from "@beermacs/shared";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ApiError, api } from "../lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  matches,
  nearbyVenues,
  news,
  tables,
  teamName,
  tournament,
  venue,
  viewer,
  viewerLocation,
} from "../lib/fixtures";
import { raw, TAB_BAR_HEIGHT } from "../lib/theme";
import NewsFeed from "./NewsFeed";
import NextUpCard from "./NextUpCard";
import VenueList from "./VenueList";

/**
 * Home, per §5 of the brief. Two states, decided by whether this device has an
 * active registration:
 *
 *   CHECKED IN  — the venue front and centre, the active/upcoming tournament
 *                 card, and that venue's announcements. Reads like the old
 *                 single-bar beermacs.com, which is the point.
 *   BROWSING    — venues running Beermacs near you, plus a join code box.
 *
 * The bracket, the table strip and the dispatcher queue deliberately do NOT
 * live here; §4 puts them on the Bracket tab. Home answers "what do I do next",
 * not "what is the state of the tournament".
 */
/** What went wrong, in words a player can act on. */
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
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const join = useCallback(async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await api.join({ code, displayName: viewer.displayName });
      setCode("");
    } catch (e) {
      setJoinError(joinErrorMessage(e instanceof ApiError ? e.code : "unknown"));
    } finally {
      setJoining(false);
    }
  }, [code]);

  // Null venue is the browse state. Wired to the session in phase 1.
  const checkedIn = venue !== null;

  const myMatch = useMemo(
    () => matches.find((m) => m.state !== "confirmed" && sideOf(m, viewer.teamId) !== null),
    []
  );

  const venueNews = useMemo(
    () => (checkedIn ? news.filter((n) => n.venueId === venue.id) : news.slice(0, 2)),
    [checkedIn]
  );

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        // Clear the tab bar, which floats over the scroll view.
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-6 px-4"
      showsVerticalScrollIndicator={false}
      alwaysBounceHorizontal={false}
    >
      {checkedIn ? (
        <>
          {/* ── the venue, prominently ────────────────────────────────── */}
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <Text
                className="shrink font-display text-3xl uppercase tracking-[1.2px] text-cream"
                numberOfLines={1}
              >
                {venue.name}
              </Text>
              {venue.isLive ? (
                <View className="flex-row items-center gap-1.5 rounded-full border border-live bg-live-wash px-2.5 py-1">
                  <View className="h-1.5 w-1.5 rounded-full bg-live" />
                  <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-live">
                    Live
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="font-sans text-[13px] text-cream-dim">
              {`${tournament.name} · ${venue.teamsRegistered} teams · ${venue.city}`}
            </Text>
          </View>

          {/* ── your match, or your status ────────────────────────────── */}
          {myMatch ? (
            <NextUpCard
              match={myMatch}
              tableLabel={tables.find((t) => t.id === myMatch.tableId)?.label ?? null}
              opponent={teamName(
                sideOf(myMatch, viewer.teamId) === "home"
                  ? myMatch.away.teamId
                  : myMatch.home.teamId
              )}
              onReport={() => {}}
            />
          ) : (
            <View className="gap-2 rounded-2xl border border-stout-600 bg-stout-700 p-4">
              <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
                You&rsquo;re not in a match
              </Text>
              <Text className="font-sans text-[13px] text-cream-dim">
                Sit tight — we&rsquo;ll buzz your phone when a table frees up.
              </Text>
            </View>
          )}

          {/* ── the announcement feed: what the bar is paying for ─────── */}
          <View className="gap-2">
            <SectionLabel>From the bar</SectionLabel>
            <NewsFeed items={venueNews} />
          </View>
        </>
      ) : (
        <>
          {/* ── browse: no active registration ───────────────────────── */}
          <View className="gap-1">
            <Text className="font-display text-3xl uppercase tracking-[1.2px] text-beer-500">
              Beermacs
            </Text>
            <Text className="font-sans text-[13px] text-cream-dim">
              Find a bar running a tournament tonight, or type the code off the table.
            </Text>
          </View>

          <JoinBox
            code={code}
            onChange={setCode}
            onSubmit={join}
            busy={joining}
            error={joinError}
          />

          <View className="gap-2">
            <SectionLabel>Playing tonight</SectionLabel>
            <VenueList venues={nearbyVenues} from={viewerLocation} onJoin={() => {}} />
          </View>

          <View className="gap-2">
            <SectionLabel>Latest</SectionLabel>
            <NewsFeed items={venueNews} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
      {children}
    </Text>
  );
}

/**
 * Join by code. Normalises as you type — Crockford Base32 folds O→0, I/L→1 and
 * U→V — so a code read aloud across a loud room still lands.
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
    <View className="gap-2 rounded-2xl border border-beer-500/40 bg-beer-500/10 p-4">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-400">
        Join with a code
      </Text>
      <TextInput
        value={code}
        onChangeText={(v) => onChange(normaliseJoinCode(v))}
        placeholder={"·".repeat(joinCodeLength)}
        placeholderTextColor={raw.foamShade + "55"}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={joinCodeLength}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        accessibilityLabel="Tournament join code"
        className="rounded-lg border border-stout-500 bg-stout-900 px-4 py-3 text-center font-sans-bold text-2xl tabular-nums tracking-[8px] text-cream"
      />
      <Pressable
        onPress={onSubmit}
        disabled={!complete}
        accessibilityRole="button"
        accessibilityLabel="Join tournament"
        accessibilityState={{ disabled: !complete }}
        className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
          complete ? "" : "opacity-40"
        }`}
      >
        <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">Join</Text>
      </Pressable>
    </View>
  );
}
