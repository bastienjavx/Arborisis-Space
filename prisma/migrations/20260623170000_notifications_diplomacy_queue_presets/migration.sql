-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONSTRUCTION_COMPLETE', 'RESEARCH_COMPLETE', 'EXPEDITION_RETURNED', 'COLONIZATION_COMPLETE', 'ATTACK_INCOMING', 'ATTACK_REPORT', 'SHIP_PRODUCED', 'TRADE_ROUTE_RUN', 'ACHIEVEMENT_UNLOCKED', 'DAILY_REWARD_AVAILABLE', 'MARKET_ORDER_FILLED', 'PVE_COMPLETE');

-- CreateEnum
CREATE TYPE "DiplomaticStatus" AS ENUM ('WAR', 'NON_AGGRESSION_PACT', 'TRADE_ALLIANCE');

-- CreateEnum
CREATE TYPE "DiplomaticOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diplomatic_relations" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "alliance1Id" TEXT NOT NULL,
    "alliance2Id" TEXT NOT NULL,
    "status" "DiplomaticStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "diplomatic_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diplomatic_offers" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "fromAllianceId" TEXT NOT NULL,
    "toAllianceId" TEXT NOT NULL,
    "proposedStatus" "DiplomaticStatus" NOT NULL,
    "message" VARCHAR(500),
    "status" "DiplomaticOfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diplomatic_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_queue" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "targetType" "BuildingType" NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "queueOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "construction_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_presets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "ships" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "diplomatic_relations_alliance1Id_alliance2Id_key" ON "diplomatic_relations"("alliance1Id", "alliance2Id");

-- CreateIndex
CREATE INDEX "diplomatic_relations_universeId_idx" ON "diplomatic_relations"("universeId");

-- CreateIndex
CREATE INDEX "diplomatic_offers_toAllianceId_status_idx" ON "diplomatic_offers"("toAllianceId", "status");

-- CreateIndex
CREATE INDEX "diplomatic_offers_fromAllianceId_status_idx" ON "diplomatic_offers"("fromAllianceId", "status");

-- CreateIndex
CREATE INDEX "construction_queue_planetId_queueOrder_idx" ON "construction_queue"("planetId", "queueOrder");

-- CreateIndex
CREATE INDEX "fleet_presets_userId_idx" ON "fleet_presets"("userId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_queue" ADD CONSTRAINT "construction_queue_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_presets" ADD CONSTRAINT "fleet_presets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
