-- CreateTable
CREATE TABLE "npc_action_logs" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "userId" TEXT,
    "actionType" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npc_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "npc_action_logs_universeId_createdAt_idx" ON "npc_action_logs"("universeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "npc_action_logs_userId_createdAt_idx" ON "npc_action_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "npc_action_logs_actionType_createdAt_idx" ON "npc_action_logs"("actionType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "npc_action_logs_universeId_status_createdAt_idx" ON "npc_action_logs"("universeId", "status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "npc_action_logs" ADD CONSTRAINT "npc_action_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
