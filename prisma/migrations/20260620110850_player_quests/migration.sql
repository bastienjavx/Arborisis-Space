-- CreateTable
CREATE TABLE "player_quests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "player_quests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_quests_userId_idx" ON "player_quests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_quests_userId_questId_key" ON "player_quests"("userId", "questId");

-- AddForeignKey
ALTER TABLE "player_quests" ADD CONSTRAINT "player_quests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
