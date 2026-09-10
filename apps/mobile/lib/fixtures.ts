import newsOne from "../assets/news-1.jpg";
import newsTwo from "../assets/news-2.jpg";
import type { Round } from "@beermacs/shared";
import {
  defaultFormat,
  type Match,
  type Team,
  type Tournament,
  type VenueTable,
} from "@beermacs/shared";

/**
 * TEMPORARY. Stands in for the API client until apps/web exposes route handlers to
 * talk to (phase 1 of the plan).
 *
 * It is typed against `@beermacs/shared` rather than hand-shaped for the screens,
 * on purpose: when the real queries land, the home screen's props don't move,
 * only where the data comes from. Anything the fixtures can't express is
 * something the domain types are missing.
 */

export interface Venue {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly latitude: number;
  readonly longitude: number;
  /// What a browsing player needs to decide whether to walk over.
  readonly tournamentName: string | null;
  readonly teamsRegistered: number;
  readonly startsAt: string | null;
  readonly isLive: boolean;
  /// Affiliated = running Beermacs under a subscription. A bar can be listed
  /// while its tournament is closed, which is why this is not `isLive`.
  readonly affiliated: boolean;
}

/** The venue this device is checked into. Null puts Home in browse mode. */
export const venue: Venue = {
  id: "v-macs",
  name: "Mac's Tap Room",
  city: "Milano",
  latitude: 45.4508,
  longitude: 9.1745,
  tournamentName: "Friday Night Cups",
  teamsRegistered: 9,
  startsAt: null,
  isLive: true,
  affiliated: true,
};

/**
 * Venues running a Beermacs tournament right now — the browse state, for
 * someone with no active registration. §5 asks for "a map or list"; this is the
 * list. A real map means a native maps SDK, which is a heavy dependency to add
 * before anyone has asked to see one — see docs/DECISIONS.md D6.
 */
export const nearbyVenues: readonly Venue[] = [
  {
    id: "v-macs",
    name: "Mac's Tap Room",
    city: "Milano",
    latitude: 45.4508,
    longitude: 9.1745,
    tournamentName: "Friday Night Cups",
    teamsRegistered: 9,
    startsAt: null,
    isLive: true,
    affiliated: true,
  },
  {
    id: "v-baraonda",
    name: "Baraonda",
    city: "Milano",
    latitude: 45.4779,
    longitude: 9.2042,
    tournamentName: "Coppa Isola",
    teamsRegistered: 6,
    startsAt: "2026-09-01T20:30:00.000Z",
    isLive: false,
    affiliated: true,
  },
  {
    id: "v-tortona",
    name: "Bar Tortona",
    city: "Milano",
    latitude: 45.4519,
    longitude: 9.1631,
    tournamentName: "Thursday Pong",
    teamsRegistered: 12,
    startsAt: "2026-09-03T19:00:00.000Z",
    isLive: false,
    affiliated: true,
  },
  {
    id: "v-sanmarco",
    name: "Circolo San Marco",
    city: "Milano",
    latitude: 45.4756,
    longitude: 9.1866,
    tournamentName: null,
    teamsRegistered: 0,
    startsAt: null,
    isLive: false,
    affiliated: true,
  },
];

/** Roughly where the phone is. Replaced by expo-location when the map lands. */
export const viewerLocation = { latitude: 45.4642, longitude: 9.19 };

export const tournament: Tournament = {
  id: "t-friday",
  name: "Friday Night Cups",
  status: "running",
  joinCode: "4KQ7BM",
  championId: null,
  format: { ...defaultFormat, cupsToWin: 10 },
};

export const teams: readonly Team[] = [
  { id: "hellas", name: "Hellas", entryRound: 1, withdrawn: false },
  { id: "larp", name: "Larp Squad", entryRound: 1, withdrawn: false },
  { id: "bochas", name: "Los Bochas", entryRound: 1, withdrawn: false },
  { id: "schiuma", name: "Schiuma Boys", entryRound: 1, withdrawn: false },
  { id: "tavolo9", name: "Tavolo 9", entryRound: 1, withdrawn: false },
  { id: "ponggers", name: "The Ponggers", entryRound: 1, withdrawn: false },
  { id: "birrai", name: "Birrai Uniti", entryRound: 1, withdrawn: false },
  { id: "ultimi", name: "Ultimi Sorsi", entryRound: 1, withdrawn: false },
  { id: "nebbia", name: "Nebbia FC", entryRound: 1, withdrawn: false },
];

/** Both open — round 2 started before round 1's odd leftover was resolved. */
export const rounds: readonly Round[] = [
  { id: "r1", stageId: "s1", index: 1, status: "open", schedulingPaused: false },
  { id: "r2", stageId: "s1", index: 2, status: "open", schedulingPaused: false },
];

export const tables: readonly VenueTable[] = [
  { id: "tb-1", label: "Table 1", state: "open", sortOrder: 0 },
  { id: "tb-2", label: "Table 2", state: "open", sortOrder: 1 },
  { id: "tb-3", label: "Table 3", state: "open", sortOrder: 2 },
  { id: "tb-4", label: "Patio", state: "closed", sortOrder: 3 },
];

const slot = (teamId: string | null, viaRepechage = false) => ({ teamId, viaRepechage });

/**
 * Round one settled except for a leftover (nine teams, so one team can't be
 * paired) that staff manually advanced into round two rather than waiting on a
 * repêchage that has nobody in the pool to draw yet — a realistic use of the
 * admin's manual-pairing override (A-16). Round two is under way.
 */
export const matches: readonly Match[] = [
  // Round 1
  {
    id: "r1m0",
    roundId: "r1",
    position: 0,
    home: slot("hellas"),
    away: slot("larp"),
    state: "confirmed",
    winnerId: "hellas",
    score: { home: 10, away: 6 },
    tableId: null,
  },
  {
    id: "r1m1",
    roundId: "r1",
    position: 1,
    home: slot("bochas"),
    away: slot("schiuma"),
    state: "confirmed",
    winnerId: "bochas",
    score: { home: 10, away: 9 },
    tableId: null,
  },
  {
    id: "r1m2",
    roundId: "r1",
    position: 2,
    home: slot("tavolo9"),
    away: slot("ponggers"),
    state: "confirmed",
    winnerId: "ponggers",
    score: { home: 4, away: 10 },
    tableId: null,
  },
  {
    id: "r1m3",
    roundId: "r1",
    position: 3,
    home: slot("birrai"),
    away: slot("ultimi"),
    state: "confirmed",
    winnerId: "birrai",
    score: { home: 10, away: 8 },
    tableId: null,
  },

  // Round 2 — four round-1 winners, plus nebbia advanced manually.
  {
    id: "r2m0",
    roundId: "r2",
    position: 0,
    home: slot("hellas"),
    away: slot("bochas"),
    state: "on_table",
    winnerId: null,
    score: null,
    tableId: "tb-3",
  },
  {
    id: "r2m1",
    roundId: "r2",
    position: 1,
    home: slot("ponggers"),
    away: slot("birrai"),
    state: "queued",
    winnerId: null,
    score: null,
    tableId: null,
  },
  {
    id: "r2m2",
    roundId: "r2",
    position: 2,
    home: slot("nebbia"),
    away: slot(null),
    state: "scheduled",
    winnerId: null,
    score: null,
    tableId: null,
  },
];

// ─── News ───────────────────────────────────────────────────────────────────

export interface NewsItem {
  readonly id: string;
  /// Null venue = a platform-wide post from us, shown to everyone.
  readonly venueId: string | null;
  readonly venueName: string;
  readonly title: string;
  readonly body: string;
  readonly publishedAt: string;
  /// Whether publishing also pushed it to the venue's players (§8).
  readonly pushed: boolean;
  /// Abstract placeholder art, NOT photography — generated by
  /// scripts/build-app-icons.py's sibling in the same commit. Real posts carry
  /// an uploaded image (News.imageUrl).
  readonly image: number | null;
}

/**
 * The venue announcement feed. §5 calls this the primary advertising surface,
 * which is why it sits on Home rather than behind a tab: it is the thing a bar
 * is paying for.
 */
export const news: readonly NewsItem[] = [
  {
    id: "n-0",
    venueId: null,
    venueName: "Beermacs",
    title: "Four new bars this month",
    body: "Beermacs is now running nights in Milano, Torino and Bologna. If your local wants in, send them our way.",
    publishedAt: "2026-09-01T12:00:00.000Z",
    pushed: true,
    image: newsOne,
  },
  {
    id: "n-1",
    venueId: "v-macs",
    venueName: "Mac's Tap Room",
    title: "Round 2 is underway",
    body: "Four teams left. Semifinals start as soon as Table 3 frees up — winners get the tab covered.",
    publishedAt: "2026-09-01T21:40:00.000Z",
    pushed: true,
    image: null,
  },
  {
    id: "n-2",
    venueId: "v-macs",
    venueName: "Mac's Tap Room",
    title: "Next Friday: doubles only",
    body: "Same time, two-player teams, 16 spots. Registration opens Wednesday at noon in the app.",
    publishedAt: "2026-09-01T18:05:00.000Z",
    pushed: true,
    image: newsTwo,
  },
  {
    id: "n-3",
    venueId: "v-macs",
    venueName: "Mac's Tap Room",
    title: "House rule change",
    body: "Re-racks are now once per game, called before the throw. Bounce shots still count double.",
    publishedAt: "2026-08-30T16:20:00.000Z",
    pushed: false,
    image: null,
  },
];

/** Who this device is. Replaced by the real session in phase 2. */
export const viewer = {
  playerId: "p-me",
  displayName: "Michele",
  teamId: "hellas",
  isStaff: true,
} as const;

export const teamName = (id: string | null): string =>
  teams.find((t) => t.id === id)?.name ?? "TBD";
