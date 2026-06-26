-- Migration: Mega Gameplay Improvements
-- Phase 1: Commandants Symbiotiques
-- Phase 2: Lunes Organiques + Champs de Débris
-- Phase 3: Territoire d'Alliance
-- Phase 4: Population / Main-d'œuvre
-- Phase 5: Défenses Orbitales
-- Phase 6: Brouillard de Guerre (GalaxyVisibility)
-- Nouveau vaisseau: BIO_RECYCLER

-- ═══════════════════════════════════════════════════════════
-- Enums: Commandants
-- ═══════════════════════════════════════════════════════════

CREATE TYPE "CommanderType" AS ENUM (
  'MYCO_WARLORD',
  'CHITIN_GUARDIAN',
  'VOID_REAPER',
  'SPORE_STORM',
  'SYMBIONT_SAGE',
  'ROOT_WEAVER',
  'FUNGAL_MERCHANT',
  'CANOPY_ARCHITECT',
  'VOID_NAVIGATOR',
  'SPORE_ORACLE',
  'HIVE_HERALD',
  'ANCIENT_SYMBIONT'
);

CREATE TYPE "CommanderRarity" AS ENUM (
  'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'
);

CREATE TYPE "CommanderTalentBranch" AS ENUM (
  'COMBAT', 'GATHERING', 'CONSTRUCTION', 'RESEARCH', 'LEADERSHIP'
);

CREATE TYPE "CommanderStatus" AS ENUM (
  'IDLE', 'ON_FLEET', 'ASSIGNED_TO_PLANET'
);

-- ═══════════════════════════════════════════════════════════
-- Enums: Lunes & Débris
-- ═══════════════════════════════════════════════════════════

CREATE TYPE "MoonBuildingType" AS ENUM (
  'LUNAR_CORE', 'SPORE_PHALANX', 'BIO_JUMP_GATE', 'LUNAR_NURSERY', 'CRYSTALLINE_SILO'
);

-- ═══════════════════════════════════════════════════════════
-- Enums: Défenses Orbitales
-- ═══════════════════════════════════════════════════════════

CREATE TYPE "DefenseType" AS ENUM (
  'ION_CANNON', 'SPORE_NET', 'SHIELD_MEMBRANE', 'MYCELIAL_TURRET', 'VOID_LANCE', 'ORBITAL_THORN_BED'
);

-- ═══════════════════════════════════════════════════════════
-- Enums: Territoire d'Alliance
-- ═══════════════════════════════════════════════════════════

CREATE TYPE "AllianceTerritoryStatus" AS ENUM (
  'NEUTRAL', 'CLAIMED', 'CONTESTED'
);

CREATE TYPE "BeaconStatus" AS ENUM (
  'ACTIVE', 'DECAYING', 'DESTROYED'
);

-- ═══════════════════════════════════════════════════════════
-- Enum: Nouveau vaisseau BIO_RECYCLER
-- ═══════════════════════════════════════════════════════════

ALTER TYPE "ShipType" ADD VALUE 'BIO_RECYCLER';

-- ═══════════════════════════════════════════════════════════
-- Enum: Nouvelles notifications
-- ═══════════════════════════════════════════════════════════

ALTER TYPE "NotificationType" ADD VALUE 'DEBRIS_FIELD_APPEARED';
ALTER TYPE "NotificationType" ADD VALUE 'DEBRIS_COLLECTED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMANDER_LEVELED_UP';
ALTER TYPE "NotificationType" ADD VALUE 'MOON_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'TERRITORY_CLAIMED';
ALTER TYPE "NotificationType" ADD VALUE 'TERRITORY_ATTACKED';
ALTER TYPE "NotificationType" ADD VALUE 'DEFENSE_UNDER_ATTACK';

-- ═══════════════════════════════════════════════════════════
-- Tables: Commandants
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "commanders" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId"              TEXT NOT NULL,
  "type"                "CommanderType" NOT NULL,
  "rarity"              "CommanderRarity" NOT NULL,
  "level"               INTEGER NOT NULL DEFAULT 1,
  "xp"                  INTEGER NOT NULL DEFAULT 0,
  "talentPoints"        INTEGER NOT NULL DEFAULT 0,
  "status"              "CommanderStatus" NOT NULL DEFAULT 'IDLE',
  "assignedToPlanetId"  TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "commanders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commanders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "commanders_userId_idx" ON "commanders"("userId");

CREATE TABLE "commander_talent_investments" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid(),
  "commanderId"    TEXT NOT NULL,
  "branch"         "CommanderTalentBranch" NOT NULL,
  "nodeId"         TEXT NOT NULL,
  "pointsInvested" INTEGER NOT NULL DEFAULT 1,
  "unlockedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "commander_talent_investments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commander_talent_investments_commanderId_branch_nodeId_key" UNIQUE ("commanderId", "branch", "nodeId"),
  CONSTRAINT "commander_talent_investments_commanderId_fkey" FOREIGN KEY ("commanderId") REFERENCES "commanders"("id") ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- Tables: Lunes + Débris
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "debris_fields" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "universeId"  TEXT NOT NULL,
  "galaxy"      INTEGER NOT NULL,
  "system"      INTEGER NOT NULL,
  "position"    INTEGER NOT NULL,
  "biomass"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minerals"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "debris_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "debris_fields_universeId_galaxy_system_idx" ON "debris_fields"("universeId", "galaxy", "system");
CREATE INDEX "debris_fields_expiresAt_idx" ON "debris_fields"("expiresAt");

CREATE TABLE "moons" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "planetId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "maxFields" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "moons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moons_planetId_key" UNIQUE ("planetId")
);

CREATE TABLE "moon_building_levels" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
  "moonId"       TEXT NOT NULL,
  "buildingType" "MoonBuildingType" NOT NULL,
  "level"        INTEGER NOT NULL DEFAULT 0,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "moon_building_levels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moon_building_levels_moonId_buildingType_key" UNIQUE ("moonId", "buildingType"),
  CONSTRAINT "moon_building_levels_moonId_fkey" FOREIGN KEY ("moonId") REFERENCES "moons"("id") ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- Tables: Défenses Orbitales
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "orbital_defenses" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "planetId"    TEXT NOT NULL,
  "defenseType" "DefenseType" NOT NULL,
  "quantity"    INTEGER NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "orbital_defenses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orbital_defenses_planetId_defenseType_key" UNIQUE ("planetId", "defenseType"),
  CONSTRAINT "orbital_defenses_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE
);

CREATE INDEX "orbital_defenses_planetId_idx" ON "orbital_defenses"("planetId");

-- ═══════════════════════════════════════════════════════════
-- Tables: Territoire d'Alliance
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "alliance_territories" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid(),
  "allianceId"    TEXT NOT NULL,
  "universeId"    TEXT NOT NULL,
  "galaxy"        INTEGER NOT NULL,
  "system"        INTEGER NOT NULL,
  "status"        "AllianceTerritoryStatus" NOT NULL DEFAULT 'CLAIMED',
  "beaconStatus"  "BeaconStatus" NOT NULL DEFAULT 'ACTIVE',
  "beaconHealth"  INTEGER NOT NULL DEFAULT 1000,
  "contestedBy"   TEXT,
  "claimedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "alliance_territories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alliance_territories_universeId_galaxy_system_key" UNIQUE ("universeId", "galaxy", "system"),
  CONSTRAINT "alliance_territories_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE
);

CREATE INDEX "alliance_territories_allianceId_idx" ON "alliance_territories"("allianceId");

-- ═══════════════════════════════════════════════════════════
-- Tables: Population
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "planet_populations" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid(),
  "planetId"      TEXT NOT NULL,
  "population"    INTEGER NOT NULL DEFAULT 1000,
  "maxPopulation" INTEGER NOT NULL DEFAULT 5000,
  "lastGrowthAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "planet_populations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "planet_populations_planetId_key" UNIQUE ("planetId"),
  CONSTRAINT "planet_populations_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- Tables: Brouillard de guerre
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "galaxy_visibility" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId"        TEXT NOT NULL,
  "universeId"    TEXT NOT NULL,
  "galaxy"        INTEGER NOT NULL,
  "system"        INTEGER NOT NULL,
  "lastScoutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "galaxy_visibility_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "galaxy_visibility_userId_universeId_galaxy_system_key" UNIQUE ("userId", "universeId", "galaxy", "system"),
  CONSTRAINT "galaxy_visibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "galaxy_visibility_userId_universeId_idx" ON "galaxy_visibility"("userId", "universeId");
