-- CreateTable
CREATE TABLE "anti_cheat_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "universeId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARN',
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anti_cheat_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_ip_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "universeId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_ip_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anti_cheat_events_type_createdAt_idx" ON "anti_cheat_events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "anti_cheat_events_userId_createdAt_idx" ON "anti_cheat_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "anti_cheat_events_universeId_severity_createdAt_idx" ON "anti_cheat_events"("universeId", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "account_ip_links_ipHash_idx" ON "account_ip_links"("ipHash");

-- CreateIndex
CREATE UNIQUE INDEX "account_ip_links_userId_ipHash_key" ON "account_ip_links"("userId", "ipHash");

-- AddForeignKey
ALTER TABLE "account_ip_links" ADD CONSTRAINT "account_ip_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
