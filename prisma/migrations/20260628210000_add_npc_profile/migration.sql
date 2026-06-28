-- CreateTable
CREATE TABLE "npc_profiles" (
    "userId" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "archetype" VARCHAR(32) NOT NULL,
    "traits" JSONB NOT NULL DEFAULT '{}',
    "goal" VARCHAR(32),
    "goalTargetId" TEXT,
    "goalProgress" JSONB NOT NULL DEFAULT '{}',
    "mood" VARCHAR(16) NOT NULL DEFAULT 'CALM',
    "memory" JSONB NOT NULL DEFAULT '{}',
    "lastStrategyReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "npc_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "npc_profiles_universeId_idx" ON "npc_profiles"("universeId");

-- CreateIndex
CREATE INDEX "npc_profiles_universeId_archetype_idx" ON "npc_profiles"("universeId", "archetype");

-- AddForeignKey
ALTER TABLE "npc_profiles" ADD CONSTRAINT "npc_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
