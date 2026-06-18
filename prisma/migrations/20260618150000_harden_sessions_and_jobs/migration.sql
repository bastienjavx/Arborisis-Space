-- Sessions multi-appareils. L'ancien users.refreshTokenHash reste temporairement
-- disponible pour convertir les sessions déjà ouvertes à leur prochain refresh.
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Les vérifications applicatives donnent de bons messages, ces contraintes
-- restent l'autorité en cas de requêtes concurrentes.
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "planetId" ORDER BY "startedAt", "id") AS rank
  FROM "construction_jobs" WHERE "status" = 'PENDING'
)
UPDATE "construction_jobs" SET "status" = 'CANCELLED'
WHERE "id" IN (SELECT "id" FROM ranked WHERE rank > 1);

WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "userId" ORDER BY "startedAt", "id") AS rank
  FROM "research_jobs" WHERE "status" = 'PENDING'
)
UPDATE "research_jobs" SET "status" = 'CANCELLED'
WHERE "id" IN (SELECT "id" FROM ranked WHERE rank > 1);

WITH ranked AS (
  SELECT "id", row_number() OVER (
    PARTITION BY "targetGalaxy", "targetSystem", "targetPosition" ORDER BY "startedAt", "id"
  ) AS rank
  FROM "colonization_jobs" WHERE "status" = 'PENDING'
)
UPDATE "colonization_jobs" SET "status" = 'CANCELLED'
WHERE "id" IN (SELECT "id" FROM ranked WHERE rank > 1);

CREATE UNIQUE INDEX "construction_jobs_one_pending_per_planet"
  ON "construction_jobs"("planetId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "research_jobs_one_pending_per_user"
  ON "research_jobs"("userId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "colonization_jobs_one_pending_per_target"
  ON "colonization_jobs"("targetGalaxy", "targetSystem", "targetPosition")
  WHERE "status" = 'PENDING';
