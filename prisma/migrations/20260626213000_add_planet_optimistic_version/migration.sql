-- Migration: add_planet_optimistic_version
-- Ajoute une colonne de verrou optimiste sur la table planets.

ALTER TABLE "planets"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "planets_version_idx" ON "planets"("version");
