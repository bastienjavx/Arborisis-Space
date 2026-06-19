ALTER TABLE "planets"
ADD COLUMN "ecologicalStability" DOUBLE PRECISION NOT NULL DEFAULT 100;

UPDATE "planets"
SET "ecologicalStability" = "stability";

ALTER TABLE "planet_buildings"
ADD COLUMN "productionIntensity" INTEGER NOT NULL DEFAULT 100;
