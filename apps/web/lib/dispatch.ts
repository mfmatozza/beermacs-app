// The automatic dispatch pass (E-1/E-2/E-3/E-8): pair whoever is waiting in
// every open, unpaused round, then hand out whatever tables are free.
//
// Two phases, deliberately not one transaction end to end:
//
//   1. PAIR — for each open round, compute who's waiting (rounds.ts), draw an
//      auto-repêchage if the count is odd and the format wants one (E-8),
//      then pair the rest (pairing.ts) into brand-new QUEUED matches. Each
//      round is handled in its own small transaction, so one round's pairing
//      failing (or racing another dispatch call) can't take the others with
//      it.
//   2. ASSIGN — gather everything now playable across the whole venue and
//      call planDispatch() (the same pure function the read-only dispatch
//      view already used) to decide who gets which table. Each table claim
//      is then applied as a CONDITIONAL update — `WHERE state = 'OPEN'` — and
//      only proceeds to move the match onto it if that update actually
//      touched a row. That is what makes two staff phones calling this at the
//      same moment safe without needing a serializable transaction across the
//      whole pass: whichever request's UPDATE lands first wins that table,
//      and the loser just tries the next one on its next call.

import {
  buildQueue,
  loserPool,
  pickAutoRepechage,
  planDispatch,
  randomPairs,
  waitingTeams,
  type NotifyIntent,
  type Round as DomainRound,
  type VenueTable as DomainTable,
} from "@beermacs/shared";
import { prisma } from "@beermacs/db";
import { ensureMatchChatChannel } from "./chat-triggers";
import { MATCH_SELECT, toDomainMatch } from "./match-mapping";
import { sendNotifyIntents } from "./notify";

export interface DispatchSummary {
  readonly newMatches: number;
  readonly autoRepechages: number;
  readonly tableAssignments: number;
}

export async function runDispatchPass(venueId: string): Promise<DispatchSummary> {
  let newMatches = 0;
  let autoRepechages = 0;

  const tournaments = await prisma.tournament.findMany({
    where: { venueId, status: "RUNNING" },
    select: {
      id: true,
      config: true,
      stages: {
        select: {
          id: true,
          rounds: {
            select: {
              id: true,
              index: true,
              status: true,
              schedulingPaused: true,
              entrants: { select: { teamId: true } },
              matches: { select: MATCH_SELECT },
            },
          },
        },
      },
    },
  });

  // ── Phase 1: pair waiting teams in every open, unpaused round ────────────
  for (const tournament of tournaments) {
    const autoMode =
      (tournament.config as { autoRepechageMode?: "auto" | "manual" })?.autoRepechageMode ?? "auto";

    for (const stage of tournament.stages) {
      // The loser pool is scoped to the stage (see the repêchage route for
      // the same reasoning), and — same fix as that route — excludes any team
      // already sitting as an unplayed entrant of some other round, so a team
      // can't be drawn back in twice before it has even played its first
      // repêchage match.
      const stageMatches = stage.rounds.flatMap((r) =>
        r.matches.map((m) => toDomainMatch(r.id, m))
      );
      const alreadyReadmitted = new Set(
        stage.rounds.flatMap((r) => r.entrants.map((e) => e.teamId))
      );
      const pool = loserPool(stageMatches).filter((p) => !alreadyReadmitted.has(p.teamId));

      for (const round of stage.rounds) {
        if (round.status !== "OPEN" || round.schedulingPaused) continue;

        const domainRound: DomainRound = {
          id: round.id,
          stageId: stage.id,
          index: round.index,
          status: "open",
          schedulingPaused: round.schedulingPaused,
        };
        const entrants = round.entrants.map((e) => ({
          teamId: e.teamId,
          roundId: round.id,
          viaRepechage: false,
        }));
        const matches = round.matches.map((m) => toDomainMatch(round.id, m));
        let waiting = waitingTeams(domainRound, entrants, matches);

        if (waiting.length % 2 === 1 && autoMode === "auto") {
          const picked = pickAutoRepechage(pool);
          if (picked) {
            await prisma.roundEntrant.create({
              data: { roundId: round.id, teamId: picked, viaRepechage: true },
            });
            autoRepechages += 1;
            // Taken out of the pool immediately so a second odd round in the
            // same pass can't draw the same team twice.
            const idx = pool.findIndex((p) => p.teamId === picked);
            if (idx >= 0) pool.splice(idx, 1);
            waiting = [...waiting, picked];
          }
        }

        const { pairs } = randomPairs(waiting);
        if (pairs.length === 0) continue;

        await prisma.$transaction(
          pairs.map((pair, i) =>
            prisma.match.create({
              data: {
                tournamentId: tournament.id,
                stageId: stage.id,
                roundId: round.id,
                position: round.matches.length + i,
                homeTeamId: pair[0],
                awayTeamId: pair[1],
                state: "QUEUED",
              },
            })
          )
        );
        newMatches += pairs.length;
      }
    }
  }

  // ── Phase 2: hand out whatever tables are free ───────────────────────────
  const [allMatches, allTables] = await Promise.all([
    prisma.match.findMany({
      where: { tournament: { venueId, status: "RUNNING" } },
      orderBy: [{ round: { index: "asc" } }, { position: "asc" }],
      select: { ...MATCH_SELECT, roundId: true, tournamentId: true },
    }),
    prisma.venueTable.findMany({ where: { venueId }, orderBy: { sortOrder: "asc" } }),
  ]);

  const domainTables: DomainTable[] = allTables.map((t) => ({
    id: t.id,
    label: t.label,
    state: ({ OPEN: "open", BUSY: "busy", CLOSED: "closed" } as const)[t.state],
    sortOrder: t.sortOrder,
  }));
  const plan = planDispatch(
    allMatches.map((m) => toDomainMatch(m.roundId, m)),
    domainTables
  );

  const matchById = new Map(allMatches.map((m) => [m.id, m]));
  const tableById = new Map(allTables.map((t) => [t.id, t]));
  const chatEnabledByTournament = new Map(
    tournaments.map((t) => [t.id, (t.config as { chatEnabled?: boolean })?.chatEnabled ?? false])
  );

  let tableAssignments = 0;
  for (const { matchId, tableId } of plan.assignments) {
    const claimed = await prisma.venueTable.updateMany({
      where: { id: tableId, state: "OPEN" },
      data: { state: "BUSY" },
    });
    if (claimed.count === 0) continue; // another dispatch pass claimed it first

    await prisma.match.update({
      where: { id: matchId },
      data: { state: "ON_TABLE", venueTableId: tableId, calledAt: new Date() },
    });
    tableAssignments += 1;

    // Same "you're up" intent transition()'s assign_table event would have
    // produced (A-17/U-15) — this path doesn't go through transition() since
    // there's no staff actor behind an automatic dispatch pass, only the
    // conditional table claim above.
    const match = matchById.get(matchId);
    const table = tableById.get(tableId);
    const teams = [match?.homeTeamId, match?.awayTeamId].filter((t): t is string => t !== null);
    if (teams.length > 0) {
      const notify: NotifyIntent[] = [{ kind: "youre_up", teams, tableId }];
      await sendNotifyIntents(notify, { venueId, tableLabel: table?.label ?? null });
    }
    if (match) {
      await ensureMatchChatChannel(
        matchId,
        match.tournamentId,
        chatEnabledByTournament.get(match.tournamentId) ?? false
      );
    }
  }

  return { newMatches, autoRepechages, tableAssignments };
}

// Re-exported so a caller can build the same "who's waiting" queue view
// without duplicating the buildQueue() call site.
export { buildQueue };
