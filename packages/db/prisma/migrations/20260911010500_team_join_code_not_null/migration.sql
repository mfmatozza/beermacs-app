-- Every existing Team row was backfilled with a real, collision-checked
-- code between this and the previous migration — safe to lock down now.
ALTER TABLE "Team" ALTER COLUMN "joinCode" SET NOT NULL;
CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");
