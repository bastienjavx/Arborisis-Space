-- Migration: Add unique constraint on debris field location

CREATE UNIQUE INDEX "debris_fields_universeId_galaxy_system_position_key"
  ON "debris_fields"("universeId", "galaxy", "system", "position");
