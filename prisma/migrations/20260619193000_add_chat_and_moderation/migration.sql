-- Add moderator role and chat/moderation persistence.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';

CREATE TYPE "ChatScope" AS ENUM ('GLOBAL', 'ALLIANCE', 'PRIVATE');
CREATE TYPE "ModerationActionType" AS ENUM ('DELETE_MESSAGE', 'MUTE', 'UNMUTE', 'ROLE_CHANGE');

ALTER TABLE "users" ADD COLUMN "mutedUntil" TIMESTAMP(3);

CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL,
  "universeId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "scope" "ChatScope" NOT NULL,
  "allianceId" TEXT,
  "recipientId" TEXT,
  "content" VARCHAR(1000) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_actions" (
  "id" TEXT NOT NULL,
  "universeId" TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "messageId" TEXT,
  "action" "ModerationActionType" NOT NULL,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_messages_universeId_scope_createdAt_idx" ON "chat_messages"("universeId", "scope", "createdAt");
CREATE INDEX "chat_messages_allianceId_createdAt_idx" ON "chat_messages"("allianceId", "createdAt");
CREATE INDEX "chat_messages_authorId_recipientId_createdAt_idx" ON "chat_messages"("authorId", "recipientId", "createdAt");
CREATE INDEX "moderation_actions_universeId_createdAt_idx" ON "moderation_actions"("universeId", "createdAt");
CREATE INDEX "moderation_actions_moderatorId_createdAt_idx" ON "moderation_actions"("moderatorId", "createdAt");

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "universes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
