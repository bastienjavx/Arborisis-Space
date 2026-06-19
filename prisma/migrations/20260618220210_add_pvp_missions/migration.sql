-- CreateEnum
CREATE TYPE "PvpMissionType" AS ENUM ('SPY', 'ATTACK');

-- CreateEnum
CREATE TYPE "PvpMissionPhase" AS ENUM ('OUTBOUND', 'RETURNING', 'COMPLETED');

-- CreateTable
CREATE TABLE "pvp_missions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PvpMissionType" NOT NULL,
    "sourcePlanetId" TEXT NOT NULL,
    "targetPlanetId" TEXT NOT NULL,
    "phase" "PvpMissionPhase" NOT NULL DEFAULT 'OUTBOUND',
    "ships" JSONB NOT NULL,
    "arrivesAt" TIMESTAMP(3) NOT NULL,
    "returnsAt" TIMESTAMP(3) NOT NULL,
    "result" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pvp_missions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pvp_missions_userId_phase_idx" ON "pvp_missions"("userId", "phase");

-- CreateIndex
CREATE INDEX "pvp_missions_targetPlanetId_phase_idx" ON "pvp_missions"("targetPlanetId", "phase");

-- AddForeignKey
ALTER TABLE "pvp_missions" ADD CONSTRAINT "pvp_missions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_missions" ADD CONSTRAINT "pvp_missions_sourcePlanetId_fkey" FOREIGN KEY ("sourcePlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_missions" ADD CONSTRAINT "pvp_missions_targetPlanetId_fkey" FOREIGN KEY ("targetPlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
