// App Review demo data. Idempotent: re-run before EVERY submission.
//
//   REVIEW_PASSWORD='…' npm run seed -w @beermacs/db
//
// App Review rejected build 11 under 2.1(a): they need an account that can
// reach every feature with content already in it — "existing chat and team".
// This builds exactly that, and repairs whatever a previous reviewer did to it
// (ended the tournament, settled the match, deleted the account):
//
//   review@beermacs.com  — captain of "The Reviewers" AND owner of the venue,
//                          so one login sees the player app and /admin.
//   Porter House (venue) — 2 tables.
//   Porter House Open    — RUNNING, chat on, join code BEERPG.
//     Round 1: The Reviewers vs House Team  → ON_TABLE, Table 1, match chat
//              Cup Crushers  vs Rack City    → CONFIRMED (Cup Crushers won)
//     Tournament chat + a staff broadcast, already populated.
//
// The password comes from the environment, never from this file: the repo
// has been public. `better-auth` resolves from the workspace root (it's an
// apps/web dependency, hoisted).

import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/index";

const REVIEW_EMAIL = "review@beermacs.com";
const VENUE_SLUG = "porter-house";
const JOIN_CODE = "BEERPG";

async function upsertUser(email: string, displayName: string, password?: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName, name: displayName, bannedAt: null, deletedAt: null },
    create: { email, displayName, name: displayName, emailVerified: true },
  });
  if (password) {
    const hash = await hashPassword(password);
    const existing = await prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (existing) await prisma.account.update({ where: { id: existing.id }, data: { password: hash } });
    else
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          providerId: "credential",
          // Better Auth 1.7's createLocalAccountIssuer("credential").
          issuer: "local:credential",
          accountId: user.id,
          password: hash,
        },
      });
  }
  return user;
}

async function main() {
  const password = process.env.REVIEW_PASSWORD;
  if (!password || password.length < 10) throw new Error("Set REVIEW_PASSWORD (10+ chars).");

  const reviewer = await upsertUser(REVIEW_EMAIL, "App Review", password);
  const sam = await upsertUser("demo-sam@beermacs.com", "Sam");
  const alex = await upsertUser("demo-alex@beermacs.com", "Alex");
  const jo = await upsertUser("demo-jo@beermacs.com", "Jo");
  const kim = await upsertUser("demo-kim@beermacs.com", "Kim");

  const venue = await prisma.venue.upsert({
    where: { slug: VENUE_SLUG },
    update: { deletedAt: null },
    create: { name: "Porter House", slug: VENUE_SLUG, city: "Milan" },
  });
  for (const [i, label] of ["Table 1", "Table 2"].entries()) {
    await prisma.venueTable.upsert({
      where: { venueId_label: { venueId: venue.id, label } },
      update: {},
      create: { venueId: venue.id, label, sortOrder: i },
    });
  }
  const members: [string, "VENUE_OWNER" | "PLAYER"][] = [
    [reviewer.id, "VENUE_OWNER"],
    [sam.id, "PLAYER"],
    [alex.id, "PLAYER"],
    [jo.id, "PLAYER"],
    [kim.id, "PLAYER"],
  ];
  for (const [userId, role] of members) {
    await prisma.venueMembership.upsert({
      where: { userId_venueId: { userId, venueId: venue.id } },
      update: { role },
      create: { userId, venueId: venue.id, role },
    });
  }

  // Rebuild the tournament from scratch each run — simpler and more reliable
  // than diffing whatever state a reviewer left it in. Cascades clean up.
  await prisma.tournament.deleteMany({ where: { joinCode: JOIN_CODE } });
  // The demo accounts only ever belong to this tournament: drop any team they
  // were put on by hand (the pre-seed demo) so the app shows exactly one.
  await prisma.teamMember.deleteMany({
    where: { userId: { in: [reviewer.id, sam.id, alex.id, jo.id, kim.id] } },
  });
  await prisma.venueTable.updateMany({ where: { venueId: venue.id }, data: { state: "OPEN" } });

  const t = await prisma.tournament.create({
    data: {
      venueId: venue.id,
      name: "Porter House Open",
      joinCode: JOIN_CODE,
      status: "RUNNING",
      startsAt: new Date(),
      config: { playersPerTeam: 2, chatEnabled: true, cupsToWin: 10, confirmTimeoutMins: 10, autoRepechageMode: "manual" },
    },
  });
  const stage = await prisma.stage.create({ data: { tournamentId: t.id, type: "ELIMINATION", order: 0 } });
  const r1 = await prisma.round.create({ data: { stageId: stage.id, index: 1, status: "OPEN", schedulingPaused: true } });
  const r2 = await prisma.round.create({ data: { stageId: stage.id, index: 2, status: "NOT_OPENED" } });

  const mkTeam = async (name: string, code: string, captainId: string, mateId?: string) => {
    const team = await prisma.team.create({ data: { tournamentId: t.id, name, joinCode: code } });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: captainId, isCaptain: true } });
    if (mateId) await prisma.teamMember.create({ data: { teamId: team.id, userId: mateId } });
    await prisma.roundEntrant.create({ data: { roundId: r1.id, teamId: team.id } });
    return team;
  };
  const reviewers = await mkTeam("The Reviewers", "RVWTM1", reviewer.id);
  const house = await mkTeam("House Team", "HSETM1", sam.id, alex.id);
  const crushers = await mkTeam("Cup Crushers", "CRSHR1", jo.id);
  const rack = await mkTeam("Rack City", "RCKCT1", kim.id);

  const table1 = await prisma.venueTable.findUniqueOrThrow({
    where: { venueId_label: { venueId: venue.id, label: "Table 1" } },
  });
  await prisma.venueTable.update({ where: { id: table1.id }, data: { state: "BUSY" } });

  const live = await prisma.match.create({
    data: {
      tournamentId: t.id,
      stageId: stage.id,
      roundId: r1.id,
      position: 0,
      homeTeamId: reviewers.id,
      awayTeamId: house.id,
      state: "ON_TABLE",
      venueTableId: table1.id,
      calledAt: new Date(),
    },
  });
  const done = await prisma.match.create({
    data: {
      tournamentId: t.id,
      stageId: stage.id,
      roundId: r1.id,
      position: 1,
      homeTeamId: crushers.id,
      awayTeamId: rack.id,
      state: "CONFIRMED",
      winnerTeamId: crushers.id,
      homeScore: 10,
      awayScore: 7,
      settledAt: new Date(),
    },
  });
  await prisma.matchReport.createMany({
    data: [
      { matchId: done.id, kind: "CLAIM", actorUserId: jo.id, teamId: crushers.id, claimedWinnerTeamId: crushers.id, homeScore: 10, awayScore: 7 },
      { matchId: done.id, kind: "CONFIRM", actorUserId: kim.id, teamId: rack.id },
    ],
  });
  await prisma.roundEntrant.create({ data: { roundId: r2.id, teamId: crushers.id } });

  // Chat: a little history in every surface the reviewer can open.
  const at = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000);
  const say = async (channelId: string, lines: [string, string, number][]) =>
    prisma.chatMessage.createMany({
      data: lines.map(([authorId, body, mins]) => ({ channelId, authorId, body, createdAt: at(mins) })),
    });

  const lobby = await prisma.chatChannel.create({ data: { tournamentId: t.id, kind: "TOURNAMENT" } });
  await say(lobby.id, [
    [sam.id, "Evening all! House Team is here and ready 🍻", 40],
    [jo.id, "Cup Crushers checking in. Good luck everyone", 38],
    [kim.id, "GG Cup Crushers, that last cup was unreal", 12],
    [reviewer.id, "Heading to Table 1 now", 5],
  ]);
  const matchChat = await prisma.chatChannel.create({ data: { tournamentId: t.id, kind: "MATCH", matchId: live.id } });
  await say(matchChat.id, [
    [sam.id, "We're at Table 1, see you there", 4],
    [reviewer.id, "On our way!", 3],
  ]);
  const broadcast = await prisma.chatChannel.create({ data: { tournamentId: t.id, kind: "BROADCAST" } });
  await say(broadcast.id, [[reviewer.id, "Round 1 is open. Check the Home tab for your table.", 30]]);

  console.log(`Seeded "${t.name}" (join code ${JOIN_CODE}) for ${REVIEW_EMAIL}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
