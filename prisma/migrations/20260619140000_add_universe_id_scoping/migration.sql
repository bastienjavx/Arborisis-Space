-- AlterEnum
BEGIN;
CREATE TYPE "NpcEncounterType_new" AS ENUM ('VOID_RIFT', 'MYCOXIN_NEST', 'ABANDONED_DERELICT');
ALTER TABLE "npc_encounters" ALTER COLUMN "type" TYPE "NpcEncounterType_new" USING ("type"::text::"NpcEncounterType_new");
ALTER TYPE "NpcEncounterType" RENAME TO "NpcEncounterType_old";
ALTER TYPE "NpcEncounterType_new" RENAME TO "NpcEncounterType";
DROP TYPE "public"."NpcEncounterType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "resource_transfer_missions" DROP CONSTRAINT "resource_transfer_missions_sourcePlanetId_fkey";

-- DropForeignKey
ALTER TABLE "resource_transfer_missions" DROP CONSTRAINT "resource_transfer_missions_targetPlanetId_fkey";

-- DropForeignKey
ALTER TABLE "resource_transfer_missions" DROP CONSTRAINT "resource_transfer_missions_userId_fkey";

-- DropIndex
DROP INDEX "alliance_applications_universeId_allianceId_status_idx";

-- DropIndex
DROP INDEX "alliance_applications_universeId_allianceId_userId_key";

-- DropIndex
DROP INDEX "alliance_members_universeId_allianceId_idx";

-- DropIndex
DROP INDEX "alliances_universeId_idx";

-- DropIndex
DROP INDEX "alliances_universeId_tag_key";

-- DropIndex
DROP INDEX "colonization_jobs_universeId_status_finishesAt_idx";

-- DropIndex
DROP INDEX "colonization_jobs_universeId_userId_status_idx";

-- DropIndex
DROP INDEX "construction_jobs_universeId_planetId_status_idx";

-- DropIndex
DROP INDEX "construction_jobs_universeId_status_finishesAt_idx";

-- DropIndex
DROP INDEX "expedition_missions_universeId_phase_arrivesAt_idx";

-- DropIndex
DROP INDEX "expedition_missions_universeId_phase_returnsAt_idx";

-- DropIndex
DROP INDEX "expedition_missions_universeId_userId_phase_idx";

-- DropIndex
DROP INDEX "expedition_reports_universeId_userId_isRead_occurredAt_idx";

-- DropIndex
DROP INDEX "galactic_events_universeId_endsAt_idx";

-- DropIndex
DROP INDEX "npc_encounters_universeId_expiresAt_idx";

-- DropIndex
DROP INDEX "npc_encounters_universeId_galaxy_system_position_key";

-- DropIndex
DROP INDEX "planet_buildings_universeId_planetId_type_key";

-- DropIndex
DROP INDEX "planet_ships_universeId_planetId_type_key";

-- DropIndex
DROP INDEX "planets_universeId_galaxy_system_position_key";

-- DropIndex
DROP INDEX "planets_universeId_ownerId_idx";

-- DropIndex
DROP INDEX "player_achievements_universeId_userId_idx";

-- DropIndex
DROP INDEX "player_achievements_universeId_userId_type_key";

-- DropIndex
DROP INDEX "pve_missions_universeId_encounterId_idx";

-- DropIndex
DROP INDEX "pve_missions_universeId_userId_phase_idx";

-- DropIndex
DROP INDEX "pvp_missions_universeId_targetPlanetId_phase_idx";

-- DropIndex
DROP INDEX "pvp_missions_universeId_userId_phase_idx";

-- DropIndex
DROP INDEX "research_jobs_universeId_status_finishesAt_idx";

-- DropIndex
DROP INDEX "research_jobs_universeId_userId_status_idx";

-- DropIndex
DROP INDEX "research_levels_universeId_userId_type_key";

-- DropIndex
DROP INDEX "sessions_universeId_userId_revokedAt_idx";

-- DropIndex
DROP INDEX "ship_production_jobs_universeId_planetId_status_idx";

-- DropIndex
DROP INDEX "ship_production_jobs_universeId_status_finishesAt_idx";

-- DropIndex
DROP INDEX "users_universeId_email_key";

-- DropIndex
DROP INDEX "users_universeId_idx";

-- DropIndex
DROP INDEX "users_universeId_username_key";

-- AlterTable
ALTER TABLE "planets" DROP COLUMN "specialization";

-- DropTable
DROP TABLE "resource_transfer_missions";

-- DropEnum
DROP TYPE "PlanetSpecialization";

-- DropEnum
DROP TYPE "TransferPhase";

-- CreateIndex
CREATE INDEX "alliance_applications_allianceId_status_idx" ON "alliance_applications"("allianceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "alliance_applications_allianceId_userId_key" ON "alliance_applications"("allianceId", "userId");

-- CreateIndex
CREATE INDEX "alliance_members_allianceId_idx" ON "alliance_members"("allianceId");

-- CreateIndex
CREATE UNIQUE INDEX "alliances_tag_key" ON "alliances"("tag");

-- CreateIndex
CREATE INDEX "colonization_jobs_userId_status_idx" ON "colonization_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "colonization_jobs_status_finishesAt_idx" ON "colonization_jobs"("status", "finishesAt");

-- CreateIndex
CREATE INDEX "construction_jobs_planetId_status_idx" ON "construction_jobs"("planetId", "status");

-- CreateIndex
CREATE INDEX "construction_jobs_status_finishesAt_idx" ON "construction_jobs"("status", "finishesAt");

-- CreateIndex
CREATE INDEX "expedition_missions_userId_phase_idx" ON "expedition_missions"("userId", "phase");

-- CreateIndex
CREATE INDEX "expedition_missions_phase_arrivesAt_idx" ON "expedition_missions"("phase", "arrivesAt");

-- CreateIndex
CREATE INDEX "expedition_missions_phase_returnsAt_idx" ON "expedition_missions"("phase", "returnsAt");

-- CreateIndex
CREATE INDEX "expedition_reports_userId_isRead_occurredAt_idx" ON "expedition_reports"("userId", "isRead", "occurredAt");

-- CreateIndex
CREATE INDEX "galactic_events_endsAt_idx" ON "galactic_events"("endsAt");

-- CreateIndex
CREATE INDEX "npc_encounters_expiresAt_idx" ON "npc_encounters"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "npc_encounters_galaxy_system_position_key" ON "npc_encounters"("galaxy", "system", "position");

-- CreateIndex
CREATE UNIQUE INDEX "planet_buildings_planetId_type_key" ON "planet_buildings"("planetId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "planet_ships_planetId_type_key" ON "planet_ships"("planetId", "type");

-- CreateIndex
CREATE INDEX "planets_ownerId_idx" ON "planets"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "planets_galaxy_system_position_key" ON "planets"("galaxy", "system", "position");

-- CreateIndex
CREATE INDEX "player_achievements_userId_idx" ON "player_achievements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_achievements_userId_type_key" ON "player_achievements"("userId", "type");

-- CreateIndex
CREATE INDEX "pve_missions_userId_phase_idx" ON "pve_missions"("userId", "phase");

-- CreateIndex
CREATE INDEX "pve_missions_encounterId_idx" ON "pve_missions"("encounterId");

-- CreateIndex
CREATE INDEX "pvp_missions_userId_phase_idx" ON "pvp_missions"("userId", "phase");

-- CreateIndex
CREATE INDEX "pvp_missions_targetPlanetId_phase_idx" ON "pvp_missions"("targetPlanetId", "phase");

-- CreateIndex
CREATE INDEX "research_jobs_userId_status_idx" ON "research_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "research_jobs_status_finishesAt_idx" ON "research_jobs"("status", "finishesAt");

-- CreateIndex
CREATE UNIQUE INDEX "research_levels_userId_type_key" ON "research_levels"("userId", "type");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "ship_production_jobs_planetId_status_idx" ON "ship_production_jobs"("planetId", "status");

-- CreateIndex
CREATE INDEX "ship_production_jobs_status_finishesAt_idx" ON "ship_production_jobs"("status", "finishesAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

