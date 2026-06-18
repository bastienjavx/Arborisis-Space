CREATE TYPE "ShipType" AS ENUM ('SPORAL_SCOUT', 'SYMBIOTIC_HARVESTER');
CREATE TYPE "ExpeditionPhase" AS ENUM ('OUTBOUND', 'RETURNING', 'COMPLETED');
CREATE TYPE "ExpeditionOutcome" AS ENUM (
  'RESOURCE_CACHE', 'RARE_SPORES', 'DERELICT_SHIP', 'INCIDENT', 'ANOMALY'
);

CREATE TABLE "planet_ships" (
  "id" TEXT NOT NULL,
  "planetId" TEXT NOT NULL,
  "type" "ShipType" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "planet_ships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ship_production_jobs" (
  "id" TEXT NOT NULL,
  "planetId" TEXT NOT NULL,
  "shipType" "ShipType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishesAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ship_production_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expedition_missions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planetId" TEXT NOT NULL,
  "targetGalaxy" INTEGER NOT NULL,
  "targetSystem" INTEGER NOT NULL,
  "phase" "ExpeditionPhase" NOT NULL DEFAULT 'OUTBOUND',
  "scoutCount" INTEGER NOT NULL,
  "harvesterCount" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "arrivesAt" TIMESTAMP(3) NOT NULL,
  "returnsAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "expedition_missions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expedition_reports" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "outcome" "ExpeditionOutcome" NOT NULL,
  "rulesetVersion" INTEGER NOT NULL,
  "roll" INTEGER NOT NULL,
  "rewardBiomass" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rewardSap" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rewardMinerals" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rewardSpores" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lostScouts" INTEGER NOT NULL DEFAULT 0,
  "lostHarvesters" INTEGER NOT NULL DEFAULT 0,
  "overflowBiomass" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overflowSap" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overflowMinerals" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overflowSpores" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returnedAt" TIMESTAMP(3),
  CONSTRAINT "expedition_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planet_ships_planetId_type_key" ON "planet_ships"("planetId", "type");
CREATE INDEX "ship_production_jobs_planetId_status_idx" ON "ship_production_jobs"("planetId", "status");
CREATE INDEX "ship_production_jobs_status_finishesAt_idx" ON "ship_production_jobs"("status", "finishesAt");
CREATE UNIQUE INDEX "ship_production_jobs_one_pending_per_planet"
  ON "ship_production_jobs"("planetId") WHERE "status" = 'PENDING';
CREATE INDEX "expedition_missions_userId_phase_idx" ON "expedition_missions"("userId", "phase");
CREATE INDEX "expedition_missions_phase_arrivesAt_idx" ON "expedition_missions"("phase", "arrivesAt");
CREATE INDEX "expedition_missions_phase_returnsAt_idx" ON "expedition_missions"("phase", "returnsAt");
CREATE UNIQUE INDEX "expedition_missions_one_active_per_planet"
  ON "expedition_missions"("planetId") WHERE "phase" IN ('OUTBOUND', 'RETURNING');
CREATE UNIQUE INDEX "expedition_reports_missionId_key" ON "expedition_reports"("missionId");
CREATE INDEX "expedition_reports_userId_isRead_occurredAt_idx"
  ON "expedition_reports"("userId", "isRead", "occurredAt");

ALTER TABLE "planet_ships" ADD CONSTRAINT "planet_ships_planetId_fkey"
  FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ship_production_jobs" ADD CONSTRAINT "ship_production_jobs_planetId_fkey"
  FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expedition_missions" ADD CONSTRAINT "expedition_missions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expedition_missions" ADD CONSTRAINT "expedition_missions_planetId_fkey"
  FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expedition_reports" ADD CONSTRAINT "expedition_reports_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "expedition_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expedition_reports" ADD CONSTRAINT "expedition_reports_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "planet_buildings" ("id", "planetId", "type", "level")
SELECT gen_random_uuid()::text, "id", 'ORBITAL_NURSERY', 0 FROM "planets";
