-- CreateEnum
CREATE TYPE "NpcEncounterType" AS ENUM ('VOID_RIFT', 'MYCOXIN_NEST', 'ABANDONED_DERELICT');

-- CreateEnum
CREATE TYPE "PveMissionPhase" AS ENUM ('TRAVEL', 'COMBAT', 'RETURNING', 'COMPLETED');

-- CreateTable
CREATE TABLE "npc_encounters" (
    "id" TEXT NOT NULL,
    "type" "NpcEncounterType" NOT NULL,
    "galaxy" INTEGER NOT NULL,
    "system" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "health" INTEGER NOT NULL DEFAULT 100,
    "maxHealth" INTEGER NOT NULL DEFAULT 100,
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npc_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pve_missions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "sourcePlanetId" TEXT NOT NULL,
    "phase" "PveMissionPhase" NOT NULL DEFAULT 'TRAVEL',
    "ships" JSONB NOT NULL,
    "travelArrivesAt" TIMESTAMP(3) NOT NULL,
    "combatEndsAt" TIMESTAMP(3) NOT NULL,
    "returnsAt" TIMESTAMP(3) NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "pve_missions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "npc_encounters_expiresAt_idx" ON "npc_encounters"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "npc_encounters_galaxy_system_position_key" ON "npc_encounters"("galaxy", "system", "position");

-- CreateIndex
CREATE INDEX "pve_missions_userId_phase_idx" ON "pve_missions"("userId", "phase");

-- CreateIndex
CREATE INDEX "pve_missions_encounterId_idx" ON "pve_missions"("encounterId");

-- AddForeignKey
ALTER TABLE "pve_missions" ADD CONSTRAINT "pve_missions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pve_missions" ADD CONSTRAINT "pve_missions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "npc_encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pve_missions" ADD CONSTRAINT "pve_missions_sourcePlanetId_fkey" FOREIGN KEY ("sourcePlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
