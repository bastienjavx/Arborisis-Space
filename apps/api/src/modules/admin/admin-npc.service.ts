import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  NpcActionLogStatus,
  NpcActionType,
  NpcArchetype,
  NpcGoal,
  NpcMood,
} from '@arborisis/shared';
import type {
  NpcActionLogView,
  NpcActionLogQueryDto,
  NpcActionStatsView,
  NpcBrainView,
  NpcRelationView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { parseMemory } from '../npc/npc-memory';
import { requireModerator } from './admin-auth.helper';

const TIMELINE_BUCKET_MINUTES = 10;

@Injectable()
export class AdminNpcService {
  constructor(private readonly prisma: PrismaService) {}

  async logs(actorId: string, query: NpcActionLogQueryDto): Promise<NpcActionLogView[]> {
    const actor = await requireModerator(this.prisma, actorId);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const logs = await this.prisma.npcActionLog.findMany({
      where: {
        universeId: actor.universeId,
        ...(query.actionType ? { actionType: query.actionType } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    return logs.map((log) => ({
      id: log.id,
      userId: log.userId ?? '',
      username: log.user?.username ?? '(supprimé)',
      actionType: log.actionType as NpcActionType,
      status: log.status as NpcActionLogStatus,
      detail: log.detail as Record<string, unknown>,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async stats(actorId: string): Promise<NpcActionStatsView> {
    const actor = await requireModerator(this.prisma, actorId);
    const universeId = actor.universeId;
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
    const last1h = new Date(now.getTime() - 60 * 60 * 1_000);

    const [
      totalLast24h,
      totalLast1h,
      failedLast24h,
      npcBotCount,
      activeBotCount,
      byType,
      byStatus,
      byBot,
      timeline,
    ] = await Promise.all([
      this.prisma.npcActionLog.count({
        where: { universeId, createdAt: { gte: last24h } },
      }),
      this.prisma.npcActionLog.count({
        where: { universeId, createdAt: { gte: last1h } },
      }),
      this.prisma.npcActionLog.count({
        where: { universeId, status: NpcActionLogStatus.FAILED, createdAt: { gte: last24h } },
      }),
      this.prisma.user.count({ where: { universeId, role: UserRole.NPC } }),
      this.prisma.npcActionLog
        .groupBy({
          by: ['userId'],
          where: { universeId, createdAt: { gte: last24h } },
        })
        .then((rows) => rows.length),
      this.prisma.npcActionLog.groupBy({
        by: ['actionType'],
        where: { universeId, createdAt: { gte: last24h } },
        _count: { actionType: true },
        orderBy: { _count: { actionType: 'desc' } },
      }),
      this.prisma.npcActionLog.groupBy({
        by: ['status'],
        where: { universeId, createdAt: { gte: last24h } },
        _count: { status: true },
        orderBy: { _count: { status: 'desc' } },
      }),
      this.prisma.npcActionLog.groupBy({
        by: ['userId'],
        where: { universeId, createdAt: { gte: last24h } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      this.timelineBuckets(universeId, last24h),
    ]);

    const usernames = await this.usernamesByIds(
      byBot.map((b) => b.userId).filter((id): id is string => !!id),
    );

    return {
      totalLast24h,
      totalLast1h,
      failedLast24h,
      npcBotCount,
      activeBotCount,
      byType: byType.map((row) => ({
        actionType: row.actionType as NpcActionType,
        count: row._count.actionType,
      })),
      byStatus: byStatus.map((row) => ({
        status: row.status as NpcActionLogStatus,
        count: row._count.status,
      })),
      byBot: byBot.map((row) => ({
        userId: row.userId ?? '',
        username: usernames[row.userId ?? ''] ?? row.userId ?? '(supprimé)',
        count: row._count.userId,
      })),
      timeline,
    };
  }

  /** État du « cerveau » de chaque bot : personnalité, but courant et relations. */
  async brains(actorId: string): Promise<NpcBrainView[]> {
    const actor = await requireModerator(this.prisma, actorId);
    const profiles = await this.prisma.npcProfile.findMany({
      where: { universeId: actor.universeId },
      include: { user: { select: { username: true } } },
      orderBy: [{ archetype: 'asc' }, { userId: 'asc' }],
      take: 200,
    });

    const relatedIds = new Set<string>();
    const memories = new Map<string, ReturnType<typeof parseMemory>>();
    for (const profile of profiles) {
      const memory = parseMemory(profile.memory);
      memories.set(profile.userId, memory);
      for (const playerId of Object.keys(memory.relations)) relatedIds.add(playerId);
    }
    const usernames = await this.usernamesByIds([...relatedIds]);

    return profiles.map((profile) => {
      const memory = memories.get(profile.userId)!;
      const topRelations: NpcRelationView[] = Object.entries(memory.relations)
        .map(([playerId, relation]) => ({
          playerId,
          username: usernames[playerId] ?? '(inconnu)',
          threat: round(relation.threat),
          grudge: round(relation.grudge),
          battlesWon: relation.battlesWon,
          battlesLost: relation.battlesLost,
        }))
        .sort((a, b) => b.threat + b.grudge - (a.threat + a.grudge))
        .slice(0, 5);

      return {
        userId: profile.userId,
        username: profile.user?.username ?? '(supprimé)',
        archetype: profile.archetype as NpcArchetype,
        traits: toNumberRecord(profile.traits),
        goal: parseGoalView(profile.goal),
        goalTargetId: profile.goalTargetId,
        mood: parseMoodView(profile.mood),
        lastStrategyReviewAt: profile.lastStrategyReviewAt?.toISOString() ?? null,
        topRelations,
      };
    });
  }

  private async timelineBuckets(
    universeId: string,
    since: Date,
  ): Promise<Array<{ bucket: string; count: number }>> {
    const bucketMs = TIMELINE_BUCKET_MINUTES * 60 * 1_000;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ bucket: Date; count: bigint }>>(
      `
      SELECT
        to_timestamp(floor(extract(epoch FROM "createdAt") / $1) * $1) AT TIME ZONE 'UTC' AS bucket,
        COUNT(*)::int AS count
      FROM "npc_action_logs"
      WHERE "universeId" = $2
        AND "createdAt" >= $3
      GROUP BY floor(extract(epoch FROM "createdAt") / $1)
      ORDER BY bucket ASC
      `,
      bucketMs / 1_000,
      universeId,
      since,
    );

    const result = new Map<string, number>();
    const now = new Date();
    let cursor = new Date(since.getTime());
    while (cursor <= now) {
      result.set(this.formatBucket(cursor, bucketMs), 0);
      cursor = new Date(cursor.getTime() + bucketMs);
    }

    for (const row of rows) {
      result.set(this.formatBucket(row.bucket, bucketMs), Number(row.count));
    }

    return Array.from(result.entries()).map(([bucket, count]) => ({ bucket, count }));
  }

  private formatBucket(date: Date, bucketMs: number): string {
    const rounded = new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);
    return rounded.toISOString();
  }

  private async usernamesByIds(userIds: string[]): Promise<Record<string, string>> {
    if (userIds.length === 0) return {};
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    return Object.fromEntries(users.map((u) => [u.id, u.username]));
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumberRecord(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
  }
  return result;
}

function parseGoalView(value: string | null): NpcGoal | null {
  if (!value) return null;
  return (Object.values(NpcGoal) as string[]).includes(value) ? (value as NpcGoal) : null;
}

function parseMoodView(value: string): NpcMood {
  return (Object.values(NpcMood) as string[]).includes(value) ? (value as NpcMood) : NpcMood.CALM;
}
