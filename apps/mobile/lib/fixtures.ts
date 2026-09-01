import {
  defaultFormat,
  type Match,
  type Team,
  type Tournament,
  type VenueTable,
} from "@beermacs/shared";

/**
 * TEMPORARY. Stands in for `packages/api` until there is a Supabase project to
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
}

export const venue: Venue = {
  id: "v-macs",
  name: "Mac's Tap Room",
  city: "Milano",
};

export const tournament: Tournament = {
  id: "t-friday",
  name: "Friday Night Cups",
  status: "running",
  joinCode: "4KQ7BM",
  currentRound: 2,
  championId: null,
  format: { ...defaultFormat, cupsToWin: 10 },
};

export const teams: readonly Team[] = [
  { id: "hellas", name: "Hellas", seed: 0 },
  { id: "larp", name: "Larp Squad", seed: 1 },
  { id: "bochas", name: "Los Bochas", seed: 2 },
  { id: "schiuma", name: "Schiuma Boys", seed: 3 },
  { id: "tavolo9", name: "Tavolo 9", seed: 4 },
  { id: "ponggers", name: "The Ponggers", seed: 5 },
  { id: "birrai", name: "Birrai Uniti", seed: 6 },
  { id: "ultimi", name: "Ultimi Sorsi", seed: 7 },
  { id: "nebbia", name: "Nebbia FC", seed: 8 },
];

export const tables: readonly VenueTable[] = [
  { id: "tb-1", label: "Table 1", state: "open", sortOrder: 0 },
  { id: "tb-2", label: "Table 2", state: "open", sortOrder: 1 },
  { id: "tb-3", label: "Table 3", state: "open", sortOrder: 2 },
  { id: "tb-4", label: "Patio", state: "closed", sortOrder: 3 },
];

const slot = (teamId: string | null, viaLuckyLoser = false) => ({ teamId, viaLuckyLoser });

/** Round one done, round two under way — the state a bar is in at 22:30. */
export const matches: readonly Match[] = [
  // Round 1 — all settled. Nine teams, so 'nebbia' took a bye.
  {
    id: "r1m0",
    round: 1,
    position: 0,
    home: slot("hellas"),
    away: slot("larp"),
    state: "confirmed",
    winnerId: "hellas",
    score: { home: 10, away: 6 },
    tableId: null,
    isBye: false,
  },
  {
    id: "r1m1",
    round: 1,
    position: 1,
    home: slot("bochas"),
    away: slot("schiuma"),
    state: "confirmed",
    winnerId: "bochas",
    score: { home: 10, away: 9 },
    tableId: null,
    isBye: false,
  },
  {
    id: "r1m2",
    round: 1,
    position: 2,
    home: slot("tavolo9"),
    away: slot("ponggers"),
    state: "confirmed",
    winnerId: "ponggers",
    score: { home: 4, away: 10 },
    tableId: null,
    isBye: false,
  },
  {
    id: "r1m3",
    round: 1,
    position: 3,
    home: slot("birrai"),
    away: slot("ultimi"),
    state: "confirmed",
    winnerId: "birrai",
    score: { home: 10, away: 8 },
    tableId: null,
    isBye: false,
  },
  {
    id: "r1m4",
    round: 1,
    position: 4,
    home: slot("nebbia"),
    away: slot(null),
    state: "confirmed",
    winnerId: "nebbia",
    score: null,
    tableId: null,
    isBye: true,
  },

  // Round 2 — five winners, so one match is waiting on a lucky-loser pick.
  {
    id: "r2m0",
    round: 2,
    position: 0,
    home: slot("hellas"),
    away: slot("bochas"),
    state: "on_table",
    winnerId: null,
    score: null,
    tableId: "tb-3",
    isBye: false,
  },
  {
    id: "r2m1",
    round: 2,
    position: 1,
    home: slot("ponggers"),
    away: slot("birrai"),
    state: "queued",
    winnerId: null,
    score: null,
    tableId: null,
    isBye: false,
  },
  {
    id: "r2m2",
    round: 2,
    position: 2,
    home: slot("nebbia"),
    away: slot(null),
    state: "scheduled",
    winnerId: null,
    score: null,
    tableId: null,
    isBye: false,
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
