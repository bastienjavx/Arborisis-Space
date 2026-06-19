-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ResearchType" ADD VALUE 'NUTRIENT_CYCLING';
ALTER TYPE "ResearchType" ADD VALUE 'SUBTERRANEAN_ROOTS';
ALTER TYPE "ResearchType" ADD VALUE 'SPORAL_ECONOMY';
ALTER TYPE "ResearchType" ADD VALUE 'CHITIN_ARMOR';
ALTER TYPE "ResearchType" ADD VALUE 'BIOLOGICAL_WARFARE';
ALTER TYPE "ResearchType" ADD VALUE 'SWARM_TACTICS';
ALTER TYPE "ResearchType" ADD VALUE 'ORBITAL_DEFENSE_GRID';
ALTER TYPE "ResearchType" ADD VALUE 'HYPERSPORE_DRIVE';
ALTER TYPE "ResearchType" ADD VALUE 'WORMHOLE_MYCOLOGY';
ALTER TYPE "ResearchType" ADD VALUE 'SPORE_SENSE';
ALTER TYPE "ResearchType" ADD VALUE 'DEEP_SCAN';
