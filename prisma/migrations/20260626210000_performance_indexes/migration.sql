-- Performance indexes for hot game paths.

-- Planet coordinate scans (galaxy view, PvP/PvE targeting).
CREATE INDEX IF NOT EXISTS "planets_galaxy_system_idx" ON "planets"("galaxy", "system");
CREATE INDEX IF NOT EXISTS "planets_universeId_galaxy_system_idx" ON "planets"("universeId", "galaxy", "system");
CREATE INDEX IF NOT EXISTS "planets_ownerId_isHomeworld_idx" ON "planets"("ownerId", "isHomeworld");

-- Mission lookups by source planet and phase.
CREATE INDEX IF NOT EXISTS "pvp_missions_sourcePlanetId_phase_idx" ON "pvp_missions"("sourcePlanetId", "phase");
CREATE INDEX IF NOT EXISTS "pvp_missions_arrivesAt_phase_idx" ON "pvp_missions"("arrivesAt", "phase");
CREATE INDEX IF NOT EXISTS "pvp_missions_returnsAt_phase_idx" ON "pvp_missions"("returnsAt", "phase");

CREATE INDEX IF NOT EXISTS "pve_missions_sourcePlanetId_phase_idx" ON "pve_missions"("sourcePlanetId", "phase");
CREATE INDEX IF NOT EXISTS "pve_missions_travelArrivesAt_phase_idx" ON "pve_missions"("travelArrivesAt", "phase");
CREATE INDEX IF NOT EXISTS "pve_missions_combatEndsAt_phase_idx" ON "pve_missions"("combatEndsAt", "phase");
CREATE INDEX IF NOT EXISTS "pve_missions_returnsAt_phase_idx" ON "pve_missions"("returnsAt", "phase");

-- Colonization target coordinate collision check.
CREATE INDEX IF NOT EXISTS "colonization_jobs_status_targetGalaxy_targetSystem_targetPosition_idx"
  ON "colonization_jobs"("status", "targetGalaxy", "targetSystem", "targetPosition");

-- Transfer finalization lookups.
CREATE INDEX IF NOT EXISTS "resource_transfer_missions_targetPlanetId_phase_idx"
  ON "resource_transfer_missions"("targetPlanetId", "phase");
CREATE INDEX IF NOT EXISTS "resource_transfer_missions_arrivesAt_phase_idx"
  ON "resource_transfer_missions"("arrivesAt", "phase");

-- Private chat query direction.
CREATE INDEX IF NOT EXISTS "chat_messages_recipientId_authorId_createdAt_idx"
  ON "chat_messages"("recipientId", "authorId", "createdAt");

-- Market order book + matching.
CREATE INDEX IF NOT EXISTS "market_orders_universeId_itemKey_pricePerUnit_status_side_idx"
  ON "market_orders"("universeId", "itemKey", "pricePerUnit", "status", "side");

-- Remove redundant non-unique index already covered by the unique constraint.
DROP INDEX IF EXISTS "ohlcv_candles_universeId_itemKey_interval_openTime_idx";
