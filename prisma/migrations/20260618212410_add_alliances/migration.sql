-- CreateEnum
CREATE TYPE "AllianceRole" AS ENUM ('LEADER', 'OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "alliances" (
    "id" TEXT NOT NULL,
    "tag" VARCHAR(4) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "description" VARCHAR(500),
    "bannerColor" VARCHAR(7) NOT NULL DEFAULT '#22c55e',
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alliances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alliance_members" (
    "id" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AllianceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alliance_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alliance_applications" (
    "id" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" VARCHAR(500),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alliance_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alliances_tag_key" ON "alliances"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "alliances_leaderId_key" ON "alliances"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "alliance_members_userId_key" ON "alliance_members"("userId");

-- CreateIndex
CREATE INDEX "alliance_members_allianceId_idx" ON "alliance_members"("allianceId");

-- CreateIndex
CREATE INDEX "alliance_applications_allianceId_status_idx" ON "alliance_applications"("allianceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "alliance_applications_allianceId_userId_key" ON "alliance_applications"("allianceId", "userId");

-- AddForeignKey
ALTER TABLE "alliances" ADD CONSTRAINT "alliances_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alliance_members" ADD CONSTRAINT "alliance_members_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alliance_members" ADD CONSTRAINT "alliance_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alliance_applications" ADD CONSTRAINT "alliance_applications_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alliance_applications" ADD CONSTRAINT "alliance_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
