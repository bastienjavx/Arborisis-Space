-- CreateEnum
CREATE TYPE "ItemKey" AS ENUM ('MYCELIAL_FIBER', 'BIOLUMINESCENT_GEL', 'CHITIN_SHARD', 'SPORE_ESSENCE', 'VOID_CRYSTAL', 'ANCIENT_FRAGMENT', 'REINFORCED_CHITIN', 'CRYSTALLIZED_SAP', 'NEURAL_MATRIX', 'VOID_ALLOY', 'MYCOTOXIN_VIAL', 'CONVERGENCE_SHARD');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('BIOMASS', 'SAP', 'MINERALS', 'SPORES');

-- CreateEnum
CREATE TYPE "OhlcvInterval" AS ENUM ('ONE_HOUR', 'FOUR_HOURS', 'ONE_DAY');

-- CreateEnum
CREATE TYPE "MarketOrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "MarketOrderStatus" AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TradeRouteStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INSUFFICIENT_SHIPS');

-- AlterTable
ALTER TABLE "resource_transfer_missions" ADD COLUMN "itemCargo" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "player_inventory_slots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "itemKey" "ItemKey" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_inventory_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_orders" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" "ItemKey" NOT NULL,
    "side" "MarketOrderSide" NOT NULL,
    "status" "MarketOrderStatus" NOT NULL DEFAULT 'OPEN',
    "pricePerUnit" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "filledQuantity" INTEGER NOT NULL DEFAULT 0,
    "escrowBiomass" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "sourcePlanetId" TEXT NOT NULL,

    CONSTRAINT "market_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_trades" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "itemKey" "ItemKey" NOT NULL,
    "buyOrderId" TEXT NOT NULL,
    "sellOrderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerPlanetId" TEXT NOT NULL,
    "sellerPlanetId" TEXT NOT NULL,

    CONSTRAINT "market_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ohlcv_candles" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "itemKey" "ItemKey" NOT NULL,
    "interval" "OhlcvInterval" NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "open" INTEGER NOT NULL,
    "high" INTEGER NOT NULL,
    "low" INTEGER NOT NULL,
    "close" INTEGER NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ohlcv_candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crafting_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "outputKey" "ItemKey" NOT NULL,
    "outputQty" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crafting_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_routes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromPlanetId" TEXT NOT NULL,
    "toPlanetId" TEXT NOT NULL,
    "itemKey" "ItemKey",
    "resource" "ResourceType",
    "quantityPerRun" INTEGER NOT NULL,
    "shipType" "ShipType" NOT NULL,
    "shipCount" INTEGER NOT NULL,
    "intervalHours" INTEGER NOT NULL DEFAULT 4,
    "status" "TradeRouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_inventory_slots_userId_planetId_itemKey_key" ON "player_inventory_slots"("userId", "planetId", "itemKey");

-- CreateIndex
CREATE INDEX "player_inventory_slots_userId_idx" ON "player_inventory_slots"("userId");

-- CreateIndex
CREATE INDEX "player_inventory_slots_planetId_idx" ON "player_inventory_slots"("planetId");

-- CreateIndex
CREATE INDEX "market_orders_universeId_itemKey_side_status_pricePerUnit_idx" ON "market_orders"("universeId", "itemKey", "side", "status", "pricePerUnit");

-- CreateIndex
CREATE INDEX "market_orders_userId_status_idx" ON "market_orders"("userId", "status");

-- CreateIndex
CREATE INDEX "market_orders_expiresAt_idx" ON "market_orders"("expiresAt");

-- CreateIndex
CREATE INDEX "market_trades_universeId_itemKey_executedAt_idx" ON "market_trades"("universeId", "itemKey", "executedAt");

-- CreateIndex
CREATE INDEX "market_trades_buyerId_executedAt_idx" ON "market_trades"("buyerId", "executedAt");

-- CreateIndex
CREATE INDEX "market_trades_sellerId_executedAt_idx" ON "market_trades"("sellerId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ohlcv_candles_universeId_itemKey_interval_openTime_key" ON "ohlcv_candles"("universeId", "itemKey", "interval", "openTime");

-- CreateIndex
CREATE INDEX "ohlcv_candles_universeId_itemKey_interval_openTime_idx" ON "ohlcv_candles"("universeId", "itemKey", "interval", "openTime");

-- CreateIndex
CREATE INDEX "crafting_jobs_userId_status_idx" ON "crafting_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "crafting_jobs_planetId_status_idx" ON "crafting_jobs"("planetId", "status");

-- CreateIndex
CREATE INDEX "crafting_jobs_status_completesAt_idx" ON "crafting_jobs"("status", "completesAt");

-- CreateIndex
CREATE INDEX "trade_routes_userId_idx" ON "trade_routes"("userId");

-- CreateIndex
CREATE INDEX "trade_routes_status_nextRunAt_idx" ON "trade_routes"("status", "nextRunAt");

-- AddForeignKey
ALTER TABLE "player_inventory_slots" ADD CONSTRAINT "player_inventory_slots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_inventory_slots" ADD CONSTRAINT "player_inventory_slots_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ohlcv_candles" ADD CONSTRAINT "ohlcv_candles_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crafting_jobs" ADD CONSTRAINT "crafting_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crafting_jobs" ADD CONSTRAINT "crafting_jobs_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_routes" ADD CONSTRAINT "trade_routes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_routes" ADD CONSTRAINT "trade_routes_fromPlanetId_fkey" FOREIGN KEY ("fromPlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_routes" ADD CONSTRAINT "trade_routes_toPlanetId_fkey" FOREIGN KEY ("toPlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
