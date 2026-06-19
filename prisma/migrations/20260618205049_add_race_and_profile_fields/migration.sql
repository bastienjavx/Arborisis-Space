-- CreateEnum
CREATE TYPE "RaceType" AS ENUM ('MYCELIANS', 'PHOTOSYNTHEX', 'CHITINIDS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarSeed" TEXT,
ADD COLUMN     "bannerColor" TEXT NOT NULL DEFAULT '#22c55e',
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "race" "RaceType" NOT NULL DEFAULT 'MYCELIANS';
