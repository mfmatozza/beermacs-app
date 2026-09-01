-- AlterTable
ALTER TABLE "News" ALTER COLUMN "venueId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");
