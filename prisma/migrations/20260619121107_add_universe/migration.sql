/*
  Warnings:

  - A unique constraint covering the columns `[universeId,galaxy,system,position]` on the table `npc_encounters` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[universeId,galaxy,system,position]` on the table `planets` will be added. If there are existing duplicate values, this will fail.
*/
-- CreateEnum
CREATE TYPE "UniverseStatus" AS ENUM ('ACTIVE', 'PROVISIONING', 'CLOSED');

-- CreateTable
CREATE TABLE "universes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalApiUrl" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 500,
    "playerCount" INTEGER NOT NULL DEFAULT 0,
    "status" "UniverseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "universes_slug_key" ON "universes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "universes_internalApiUrl_key" ON "universes"("internalApiUrl");

-- Insert default universe first so existing rows can be backfilled.
INSERT INTO "universes" ("id", "slug", "name", "internalApiUrl", "maxPlayers", "playerCount", "status", "updatedAt")
VALUES (gen_random_uuid()::TEXT, 'default', 'Monde Originel', 'http://localhost:4000', 500, 0, 'ACTIVE', CURRENT_TIMESTAMP);

-- DropIndex
DROP INDEX "npc_encounters_galaxy_system_position_key";

-- DropIndex
DROP INDEX "planets_galaxy_system_position_key";

-- AlterTable: add nullable columns first to avoid failing on existing rows.
ALTER TABLE "galactic_events" ADD COLUMN "universeId" TEXT;
ALTER TABLE "npc_encounters" ADD COLUMN "universeId" TEXT;
ALTER TABLE "planets" ADD COLUMN "universeId" TEXT;
ALTER TABLE "users" ADD COLUMN "universeId" TEXT;

-- Backfill existing rows with the default universe id.
UPDATE "galactic_events" SET "universeId" = (SELECT "id" FROM "universes" WHERE "slug" = 'default') WHERE "universeId" IS NULL;
UPDATE "npc_encounters" SET "universeId" = (SELECT "id" FROM "universes" WHERE "slug" = 'default') WHERE "universeId" IS NULL;
UPDATE "planets" SET "universeId" = (SELECT "id" FROM "universes" WHERE "slug" = 'default') WHERE "universeId" IS NULL;
UPDATE "users" SET "universeId" = (SELECT "id" FROM "universes" WHERE "slug" = 'default') WHERE "universeId" IS NULL;

-- Make columns NOT NULL now that all rows are backfilled.
ALTER TABLE "galactic_events" ALTER COLUMN "universeId" SET NOT NULL;
ALTER TABLE "npc_encounters" ALTER COLUMN "universeId" SET NOT NULL;
ALTER TABLE "planets" ALTER COLUMN "universeId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "universeId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "galactic_events_universeId_idx" ON "galactic_events"("universeId");

-- CreateIndex
CREATE INDEX "npc_encounters_universeId_idx" ON "npc_encounters"("universeId");

-- CreateIndex
CREATE UNIQUE INDEX "npc_encounters_universeId_galaxy_system_position_key" ON "npc_encounters"("universeId", "galaxy", "system", "position");

-- CreateIndex
CREATE INDEX "planets_universeId_idx" ON "planets"("universeId");

-- CreateIndex
CREATE UNIQUE INDEX "planets_universeId_galaxy_system_position_key" ON "planets"("universeId", "galaxy", "system", "position");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planets" ADD CONSTRAINT "planets_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galactic_events" ADD CONSTRAINT "galactic_events_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_encounters" ADD CONSTRAINT "npc_encounters_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
