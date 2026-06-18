-- CreateEnum
CREATE TYPE "PlanetType" AS ENUM ('VERDANT', 'MINERAL', 'SAP_RICH', 'SPORE_NEBULA', 'BARREN');

-- CreateEnum
CREATE TYPE "GalacticEventType" AS ENUM ('SPORE_BLOOM', 'STELLAR_STORM', 'ANCIENT_SIGNAL', 'MYCOTOXIN_OUTBREAK', 'CONVERGENCE_PULSE', 'VOID_RIFT');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('FIRST_SPROUT', 'RESEARCH_PIONEER', 'COSMIC_TRAVELER', 'COLONIAL_FUNGUS', 'FLEET_COMMANDER', 'SPORE_MASTER', 'ANCIENT_DISCOVERY', 'GALACTIC_HIVE', 'MASTER_BUILDER', 'SCHOLAR', 'TITAN_BREEDER', 'HUNDRED_SHIPS', 'CONVERGENCE_HERALD', 'EVENT_SURVIVOR', 'DEEP_SPACE', 'RESOURCE_BARON', 'SPEED_BUILDER', 'PEACEFUL_EXPLORER', 'SPORAL_SAGE', 'THE_CONVERGENCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpeditionOutcome" ADD VALUE 'ANCIENT_ARCHIVE';
ALTER TYPE "ExpeditionOutcome" ADD VALUE 'VOID_ECHO';
ALTER TYPE "ExpeditionOutcome" ADD VALUE 'CONVERGENCE_BLOOM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShipType" ADD VALUE 'MYCELIAL_TENDRIL';
ALTER TYPE "ShipType" ADD VALUE 'CHITIN_FREIGHTER';
ALTER TYPE "ShipType" ADD VALUE 'BIOLUMINESCENT_CRUISER';
ALTER TYPE "ShipType" ADD VALUE 'SPOROGENESIS_TITAN';

-- AlterTable
ALTER TABLE "expedition_missions" ADD COLUMN     "cruiserCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "freighterCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tenderilCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "titanCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "expedition_reports" ADD COLUMN     "lostCruisers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lostFreighters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lostTendrils" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lostTitans" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "planets" ADD COLUMN     "planetType" "PlanetType" NOT NULL DEFAULT 'VERDANT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "artifactCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "galactic_events" (
    "id" TEXT NOT NULL,
    "type" "GalacticEventType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "galactic_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "galactic_events_endsAt_idx" ON "galactic_events"("endsAt");

-- CreateIndex
CREATE INDEX "player_achievements_userId_idx" ON "player_achievements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_achievements_userId_type_key" ON "player_achievements"("userId", "type");

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
