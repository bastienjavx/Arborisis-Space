-- Ajoute une période de grâce sur les refresh tokens pour tolérer
-- les pertes de réponse réseau lors de la rotation (refresh token perdu côté client).
ALTER TABLE "sessions"
  ADD COLUMN "previousRefreshTokenHash" TEXT,
  ADD COLUMN "previousRefreshTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "sessions_previousRefreshTokenHash_idx" ON "sessions"("previousRefreshTokenHash");
