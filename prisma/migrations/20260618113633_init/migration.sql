-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('BIOMASS_SYNTHESIZER', 'SAP_WELL', 'MINERAL_VEIN', 'SPORANGE', 'PHOTOSYNTHETIC_CANOPY', 'STORAGE_VACUOLE', 'RESEARCH_NEXUS', 'SYMBIOTIC_CORE');

-- CreateEnum
CREATE TYPE "ResearchType" AS ENUM ('ADVANCED_PHOTOSYNTHESIS', 'GENETIC_ENGINEERING', 'SYMBIOSIS', 'TERRAFORMATION', 'BIOENGINEERING', 'SPORAL_PROPULSION');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isHomeworld" BOOLEAN NOT NULL DEFAULT false,
    "galaxy" INTEGER NOT NULL,
    "system" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "biomass" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minerals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spores" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastResourceUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet_buildings" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "type" "BuildingType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "planet_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_levels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ResearchType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "research_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_jobs" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "buildingType" "BuildingType" NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "researchType" "ResearchType" NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "planetId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colonization_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourcePlanetId" TEXT NOT NULL,
    "targetGalaxy" INTEGER NOT NULL,
    "targetSystem" INTEGER NOT NULL,
    "targetPosition" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colonization_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "planets_ownerId_idx" ON "planets"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "planets_galaxy_system_position_key" ON "planets"("galaxy", "system", "position");

-- CreateIndex
CREATE UNIQUE INDEX "planet_buildings_planetId_type_key" ON "planet_buildings"("planetId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "research_levels_userId_type_key" ON "research_levels"("userId", "type");

-- CreateIndex
CREATE INDEX "construction_jobs_planetId_status_idx" ON "construction_jobs"("planetId", "status");

-- CreateIndex
CREATE INDEX "construction_jobs_status_finishesAt_idx" ON "construction_jobs"("status", "finishesAt");

-- CreateIndex
CREATE INDEX "research_jobs_userId_status_idx" ON "research_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "research_jobs_status_finishesAt_idx" ON "research_jobs"("status", "finishesAt");

-- CreateIndex
CREATE INDEX "colonization_jobs_userId_status_idx" ON "colonization_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "colonization_jobs_status_finishesAt_idx" ON "colonization_jobs"("status", "finishesAt");

-- AddForeignKey
ALTER TABLE "planets" ADD CONSTRAINT "planets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planet_buildings" ADD CONSTRAINT "planet_buildings_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_levels" ADD CONSTRAINT "research_levels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_jobs" ADD CONSTRAINT "construction_jobs_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colonization_jobs" ADD CONSTRAINT "colonization_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colonization_jobs" ADD CONSTRAINT "colonization_jobs_sourcePlanetId_fkey" FOREIGN KEY ("sourcePlanetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
