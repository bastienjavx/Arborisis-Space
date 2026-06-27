-- CreateEnum
CREATE TYPE "DailyQuestType" AS ENUM ('PRODUCE_SHIPS', 'LAUNCH_EXPEDITIONS', 'COLLECT_RESOURCES', 'BUILD_BUILDINGS', 'COMPLETE_RESEARCH', 'WIN_PVE');

-- CreateTable
CREATE TABLE "daily_quests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DailyQuestType" NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "reward" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_bonuses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_quests_userId_expiresAt_idx" ON "daily_quests"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_tokens_userId_key" ON "engagement_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "login_streaks_userId_key" ON "login_streaks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_bonuses_userId_key" ON "session_bonuses"("userId");

-- AddForeignKey
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_tokens" ADD CONSTRAINT "engagement_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_streaks" ADD CONSTRAINT "login_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_bonuses" ADD CONSTRAINT "session_bonuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
