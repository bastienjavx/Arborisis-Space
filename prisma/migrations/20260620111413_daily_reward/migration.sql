-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dailyStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastDailyClaimAt" TIMESTAMP(3);
