// POST /api/tournaments/:tournamentId/messages — A-18/A-19: send to one team,
// one person, or a broadcast to everyone in this tournament.
//
// "Anyone in the app" (A-19) is read here as "anyone in this tournament" —
// ChatChannel.tournamentId is required by schema, and every messaging surface
// the spec actually describes (U-8/U-9/U-10, A-20) is tournament-scoped, so
// scoping the send the same way is consistent rather than a narrowing.
//
// VENUE_STAFF+, matching U-10/A-20's existing staff read/write access to
// tournament chats — sending a message during a running night isn't an
// owner-only action.
//
// A-19: "all admin messages trigger a push notification for the recipients."
// Push isn't built yet (docs/ROADMAP.md phase 5) — this is the hook point,
// marked rather than faked.

import { sendAdminMessageInput } from "@beermacs/shared";
import { Role, prisma } from "@beermacs/db";
import { NextResponse } from "next/server";
import { handleError, parseBody } from "@/lib/http";
import { HttpError, requireVenueRole } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { venueId: true },
    });
    if (!tournament) throw new HttpError(404, "tournament_not_found");
    const viewer = await requireVenueRole(tournament.venueId, Role.VENUE_STAFF);

    const body = await parseBody(req, sendAdminMessageInput);

    let channel;
    if (body.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: body.teamId },
        select: { id: true, tournamentId: true },
      });
      if (!team || team.tournamentId !== tournamentId) {
        throw new HttpError(404, "team_not_found");
      }
      channel =
        (await prisma.chatChannel.findFirst({
          where: { tournamentId, kind: "TEAM", teamId: body.teamId },
        })) ??
        (await prisma.chatChannel.create({
          data: { tournamentId, kind: "TEAM", teamId: body.teamId },
        }));
    } else if (body.recipientUserId) {
      const member = await prisma.venueMembership.findUnique({
        where: { userId_venueId: { userId: body.recipientUserId, venueId: tournament.venueId } },
      });
      if (!member) throw new HttpError(404, "recipient_not_found");
      channel =
        (await prisma.chatChannel.findFirst({
          where: { tournamentId, kind: "DIRECT", recipientUserId: body.recipientUserId },
        })) ??
        (await prisma.chatChannel.create({
          data: { tournamentId, kind: "DIRECT", recipientUserId: body.recipientUserId },
        }));
    } else {
      channel =
        (await prisma.chatChannel.findFirst({
          where: { tournamentId, kind: "BROADCAST" },
        })) ?? (await prisma.chatChannel.create({ data: { tournamentId, kind: "BROADCAST" } }));
    }

    const message = await prisma.chatMessage.create({
      data: { channelId: channel.id, authorId: viewer.userId, body: body.body },
    });

    // TODO(phase 5, push): notify the resolved recipient set — the team's
    // members, the one recipientUserId, or every player at this venue's
    // tournament — via the Expo push route once it exists.

    return NextResponse.json({ id: message.id, channelId: channel.id, channelKind: channel.kind });
  } catch (e) {
    return handleError(e);
  }
}
