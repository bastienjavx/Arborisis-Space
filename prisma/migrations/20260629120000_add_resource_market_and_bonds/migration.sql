-- Marché des ressources et obligations NPC.

CREATE TYPE "BondPositionStatus" AS ENUM ('ACTIVE', 'CLAIMED');

CREATE TABLE "resource_market_orders" (
  "id" TEXT NOT NULL,
  "universeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resource" "ResourceType" NOT NULL,
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
  CONSTRAINT "resource_market_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_market_trades" (
  "id" TEXT NOT NULL,
  "universeId" TEXT NOT NULL,
  "resource" "ResourceType" NOT NULL,
  "buyOrderId" TEXT NOT NULL,
  "sellOrderId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "buyerPlanetId" TEXT NOT NULL,
  "sellerPlanetId" TEXT NOT NULL,
  CONSTRAINT "resource_market_trades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_ohlcv_candles" (
  "id" TEXT NOT NULL,
  "universeId" TEXT NOT NULL,
  "resource" "ResourceType" NOT NULL,
  "interval" "OhlcvInterval" NOT NULL,
  "openTime" TIMESTAMP(3) NOT NULL,
  "open" INTEGER NOT NULL,
  "high" INTEGER NOT NULL,
  "low" INTEGER NOT NULL,
  "close" INTEGER NOT NULL,
  "volume" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "resource_ohlcv_candles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_exchange_trades" (
  "id" TEXT NOT NULL,
  "universeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planetId" TEXT NOT NULL,
  "fromResource" "ResourceType" NOT NULL,
  "toResource" "ResourceType" NOT NULL,
  "amountIn" INTEGER NOT NULL,
  "amountOut" INTEGER NOT NULL,
  "unitRate" DOUBLE PRECISION NOT NULL,
  "spread" DOUBLE PRECISION NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resource_exchange_trades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_bond_positions" (
  "id" TEXT NOT NULL,
  "universeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "offeringId" TEXT NOT NULL,
  "resource" "ResourceType" NOT NULL,
  "principal" INTEGER NOT NULL,
  "yieldRate" DOUBLE PRECISION NOT NULL,
  "payoutAmount" INTEGER NOT NULL,
  "status" "BondPositionStatus" NOT NULL DEFAULT 'ACTIVE',
  "sourcePlanetId" TEXT NOT NULL,
  "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "maturesAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  CONSTRAINT "player_bond_positions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resource_market_orders_universeId_resource_side_status_pricePerUnit_idx"
  ON "resource_market_orders"("universeId", "resource", "side", "status", "pricePerUnit");
CREATE INDEX "resource_market_orders_universeId_resource_pricePerUnit_status_side_idx"
  ON "resource_market_orders"("universeId", "resource", "pricePerUnit", "status", "side");
CREATE INDEX "resource_market_orders_userId_status_idx"
  ON "resource_market_orders"("userId", "status");
CREATE INDEX "resource_market_orders_expiresAt_idx"
  ON "resource_market_orders"("expiresAt");

CREATE INDEX "resource_market_trades_universeId_resource_executedAt_idx"
  ON "resource_market_trades"("universeId", "resource", "executedAt");
CREATE INDEX "resource_market_trades_buyerId_executedAt_idx"
  ON "resource_market_trades"("buyerId", "executedAt");
CREATE INDEX "resource_market_trades_sellerId_executedAt_idx"
  ON "resource_market_trades"("sellerId", "executedAt");

CREATE UNIQUE INDEX "resource_ohlcv_candles_universeId_resource_interval_openTime_key"
  ON "resource_ohlcv_candles"("universeId", "resource", "interval", "openTime");

CREATE INDEX "resource_exchange_trades_universeId_executedAt_idx"
  ON "resource_exchange_trades"("universeId", "executedAt");
CREATE INDEX "resource_exchange_trades_userId_executedAt_idx"
  ON "resource_exchange_trades"("userId", "executedAt");

CREATE INDEX "player_bond_positions_userId_status_maturesAt_idx"
  ON "player_bond_positions"("userId", "status", "maturesAt");
CREATE INDEX "player_bond_positions_universeId_resource_subscribedAt_idx"
  ON "player_bond_positions"("universeId", "resource", "subscribedAt");

ALTER TABLE "resource_market_orders"
  ADD CONSTRAINT "resource_market_orders_universeId_fkey"
  FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_market_orders"
  ADD CONSTRAINT "resource_market_orders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_market_trades"
  ADD CONSTRAINT "resource_market_trades_universeId_fkey"
  FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_market_trades"
  ADD CONSTRAINT "resource_market_trades_buyOrderId_fkey"
  FOREIGN KEY ("buyOrderId") REFERENCES "resource_market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resource_market_trades"
  ADD CONSTRAINT "resource_market_trades_sellOrderId_fkey"
  FOREIGN KEY ("sellOrderId") REFERENCES "resource_market_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "resource_ohlcv_candles"
  ADD CONSTRAINT "resource_ohlcv_candles_universeId_fkey"
  FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_exchange_trades"
  ADD CONSTRAINT "resource_exchange_trades_universeId_fkey"
  FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_bond_positions"
  ADD CONSTRAINT "player_bond_positions_universeId_fkey"
  FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_bond_positions"
  ADD CONSTRAINT "player_bond_positions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
