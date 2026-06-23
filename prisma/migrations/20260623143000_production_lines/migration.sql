-- CreateEnum
CREATE TYPE "ProductionLineStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INPUT_SHORTAGE');

-- CreateTable
CREATE TABLE "production_lines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "outputKey" "ItemKey" NOT NULL,
    "outputQty" INTEGER NOT NULL,
    "cycleSeconds" INTEGER NOT NULL,
    "status" "ProductionLineStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_lines_userId_status_idx" ON "production_lines"("userId", "status");

-- CreateIndex
CREATE INDEX "production_lines_planetId_status_idx" ON "production_lines"("planetId", "status");

-- CreateIndex
CREATE INDEX "production_lines_status_nextRunAt_idx" ON "production_lines"("status", "nextRunAt");

-- AddForeignKey
ALTER TABLE "production_lines" ADD CONSTRAINT "production_lines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_lines" ADD CONSTRAINT "production_lines_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
