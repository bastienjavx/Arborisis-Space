-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SeasonRewardScope" AS ENUM ('PLAYER', 'ALLIANCE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "title" TEXT;

-- CreateTable
CREATE TABLE "leaderboard_seasons" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "leaderboard_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_rewards" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "scope" "SeasonRewardScope" NOT NULL,
    "userId" TEXT NOT NULL,
    "allianceId" TEXT,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "title" TEXT,
    "rewardBiomass" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardSap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardMinerals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardSpores" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_seasons_universeId_index_key" ON "leaderboard_seasons"("universeId", "index");

-- CreateIndex
CREATE INDEX "leaderboard_seasons_universeId_status_idx" ON "leaderboard_seasons"("universeId", "status");

-- CreateIndex
CREATE INDEX "season_rewards_userId_claimedAt_idx" ON "season_rewards"("userId", "claimedAt");

-- CreateIndex
CREATE INDEX "season_rewards_seasonId_idx" ON "season_rewards"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "season_rewards_seasonId_scope_userId_key" ON "season_rewards"("seasonId", "scope", "userId");

-- AddForeignKey
ALTER TABLE "leaderboard_seasons" ADD CONSTRAINT "leaderboard_seasons_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rewards" ADD CONSTRAINT "season_rewards_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "leaderboard_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rewards" ADD CONSTRAINT "season_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
