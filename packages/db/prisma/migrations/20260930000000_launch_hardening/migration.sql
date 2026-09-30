-- Launch hardening (App Review resubmission): optional non-unique phone,
-- platform bans, chat reports into the support inbox, DB-backed rate
-- limits, admin login lockout, and indexes for user deletion/history.
-- AlterEnum
ALTER TYPE "SupportSource" ADD VALUE 'CHAT_REPORT';

-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLoginLock" (
    "ip" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminLoginLock_pkey" PRIMARY KEY ("ip")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "Match_homeTeamId_idx" ON "Match"("homeTeamId");

-- CreateIndex
CREATE INDEX "Match_awayTeamId_idx" ON "Match"("awayTeamId");

-- CreateIndex
CREATE INDEX "MatchReport_actorUserId_idx" ON "MatchReport"("actorUserId");

-- CreateIndex
CREATE INDEX "ChatMessage_authorId_idx" ON "ChatMessage"("authorId");

-- CreateIndex
CREATE INDEX "SupportMessage_userId_idx" ON "SupportMessage"("userId");


-- Scores are validated by Zod at the API; this is the floor if anything
-- ever writes around it.
ALTER TABLE "Match" ADD CONSTRAINT "Match_scores_non_negative" CHECK ("homeScore" >= 0 AND "awayScore" >= 0);
ALTER TABLE "MatchReport" ADD CONSTRAINT "MatchReport_scores_non_negative" CHECK ("homeScore" >= 0 AND "awayScore" >= 0);
