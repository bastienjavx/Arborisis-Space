-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShipType" ADD VALUE 'SPORAL_DRONE';
ALTER TYPE "ShipType" ADD VALUE 'ACID_BOMBER';
ALTER TYPE "ShipType" ADD VALUE 'CHITIN_DESTROYER';
ALTER TYPE "ShipType" ADD VALUE 'BIOMASS_DREADNOUGHT';
ALTER TYPE "ShipType" ADD VALUE 'SEED_POD';
ALTER TYPE "ShipType" ADD VALUE 'SHADOW_SPORE';
ALTER TYPE "ShipType" ADD VALUE 'ORBITAL_THORN';
ALTER TYPE "ShipType" ADD VALUE 'SPORAL_SWARM';
ALTER TYPE "ShipType" ADD VALUE 'LUMINOUS_WARDEN';
ALTER TYPE "ShipType" ADD VALUE 'CHITIN_BULWARK';
