-- CreateEnum
CREATE TYPE "PlanetSpecialization" AS ENUM ('PRODUCTION', 'MILITARY', 'RESEARCH', 'FORTRESS');

-- CreateEnum
CREATE TYPE "TransferPhase" AS ENUM ('OUTBOUND', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NpcEncounterType" ADD VALUE 'FUNGAL_HIVEMIND';
ALTER TYPE "NpcEncounterType" ADD VALUE 'VOID_LEVIATHAN';
ALTER TYPE "NpcEncounterType" ADD VALUE 'CRYSTALLINE_GUARDIAN';
ALTER TYPE "NpcEncounterType" ADD VALUE 'BIOMASS_CORRUPTED';
ALTER TYPE "NpcEncounterType" ADD VALUE 'ANCIENT_SENTINEL';
ALTER TYPE "NpcEncounterType" ADD VALUE 'CHITIN_WARLORD';
ALTER TYPE "NpcEncounterType" ADD VALUE 'SPORAL_PARASITE';
ALTER TYPE "NpcEncounterType" ADD VALUE 'MYCOSPORE_SWARM';

-- AlterTable
ALTER TABLE "planets" ADD COLUMN     "specialization" "PlanetSpecialization";

-- CreateTable
CREATE TABLE "resource_transfer_missions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourcePlanetId" TEXT NOT NULL,
    "targetPlanetId" TEXT NOT NULL,
    "ships" JSONB NOT NULL,
    "resources" JSONB NOT NULL,
    "phase" "TransferPhase" NOT NULL DEFAULT 'OUTBOUND',
    "arrivesAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_transfer_missions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_transfer_missions_userId_phase_idx" ON "resource_transfer_missions"("userId", "phase");

-- CreateIndex
CREATE INDEX "resource_transfer_missions_phase_arrivesAt_idx" ON "resource_transfer_missions"("phase", "arrivesAt");

-- AddForeignKey
ALTER TABLE "resource_transfer_missions" ADD CONSTRAINT "resource_transfer_missions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_transfer_missions" ADD CONSTRAINT "resource_transfer_missions_sourcePlanetId_fkey" FOREIGN KEY ("sourcePlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_transfer_missions" ADD CONSTRAINT "resource_transfer_missions_targetPlanetId_fkey" FOREIGN KEY ("targetPlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
