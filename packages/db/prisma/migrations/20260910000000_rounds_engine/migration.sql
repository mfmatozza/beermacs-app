-- CreateEnum
CREATE TYPE "TournamentFormatKind" AS ENUM ('SINGLE_ELIMINATION', 'GROUP_THEN_KNOCKOUT', 'TRIANGULAR');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('NOT_OPENED', 'OPEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChannelKind" ADD VALUE 'TEAM';
ALTER TYPE "ChannelKind" ADD VALUE 'DIRECT';

-- DropIndex
DROP INDEX "Match_stageId_round_position_key";

-- DropIndex
DROP INDEX "Team_tournamentId_seed_idx";

-- AlterTable
ALTER TABLE "ChatChannel" ADD COLUMN     "recipientUserId" TEXT,
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "awayViaLuckyLoser",
DROP COLUMN "homeViaLuckyLoser",
DROP COLUMN "isBye",
DROP COLUMN "round",
ADD COLUMN     "awayViaRepechage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeViaRepechage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roundId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "seed",
ADD COLUMN     "entryRound" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "withdrawn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "currentRound",
DROP COLUMN "format",
ADD COLUMN     "format" "TournamentFormatKind" NOT NULL DEFAULT 'SINGLE_ELIMINATION';

-- DropEnum
DROP TYPE "TournamentFormat";

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'NOT_OPENED',
    "schedulingPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundEntrant" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "viaRepechage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundEntrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Round_stageId_index_key" ON "Round"("stageId", "index");

-- CreateIndex
CREATE INDEX "RoundEntrant_teamId_idx" ON "RoundEntrant"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundEntrant_roundId_teamId_key" ON "RoundEntrant"("roundId", "teamId");

-- CreateIndex
CREATE INDEX "ChatChannel_teamId_idx" ON "ChatChannel"("teamId");

-- CreateIndex
CREATE INDEX "ChatChannel_recipientUserId_idx" ON "ChatChannel"("recipientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_roundId_position_key" ON "Match"("roundId", "position");

-- CreateIndex
CREATE INDEX "Team_tournamentId_entryRound_idx" ON "Team"("tournamentId", "entryRound");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundEntrant" ADD CONSTRAINT "RoundEntrant_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundEntrant" ADD CONSTRAINT "RoundEntrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

