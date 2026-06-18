import { Injectable } from '@nestjs/common';
import { ACHIEVEMENTS, AchievementType, type AchievementView } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAchievements(userId: string): Promise<AchievementView[]> {
    const unlocked = await this.prisma.playerAchievement.findMany({ where: { userId } });
    const unlockedMap = new Map(unlocked.map((a) => [a.type, a.unlockedAt.toISOString()]));
    return Object.values(AchievementType).map((type) => ({
      type,
      name: ACHIEVEMENTS[type].name,
      description: ACHIEVEMENTS[type].description,
      rewardText: ACHIEVEMENTS[type].rewardText,
      unlockedAt: unlockedMap.get(type) ?? null,
    }));
  }

  async checkAndGrant(userId: string): Promise<void> {
    const [planets, research, reports, existing, user] = await Promise.all([
      this.prisma.planet.findMany({
        where: { ownerId: userId },
        include: { buildings: true, ships: true },
      }),
      this.prisma.researchLevel.findMany({ where: { userId } }),
      this.prisma.expeditionReport.findMany({ where: { userId } }),
      this.prisma.playerAchievement.findMany({ where: { userId }, select: { type: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { artifactCount: true } }),
    ]);

    const alreadyUnlocked = new Set(existing.map((a) => a.type));
    const toGrant: AchievementType[] = [];

    const totalBuildingLevels = planets.flatMap((p) => p.buildings).reduce((s, b) => s + b.level, 0);
    const totalShips = planets.flatMap((p) => p.ships).reduce((s, s2) => s + s2.quantity, 0);
    const titanCount = planets.flatMap((p) => p.ships).filter((s) => s.type === 'SPOROGENESIS_TITAN').reduce((s, s2) => s + s2.quantity, 0);
    const researchMap = new Map(research.map((r) => [r.type, r.level]));
    const colonyCount = planets.length;

    const check = (type: AchievementType, condition: boolean) => {
      if (condition && !alreadyUnlocked.has(type)) toGrant.push(type);
    };

    check(AchievementType.FIRST_SPROUT, totalBuildingLevels >= 1);
    check(AchievementType.RESEARCH_PIONEER, research.some((r) => r.level >= 1));
    check(AchievementType.COSMIC_TRAVELER, reports.length >= 1);
    check(AchievementType.COLONIAL_FUNGUS, colonyCount >= 2);
    check(AchievementType.FLEET_COMMANDER, totalShips >= 10);
    check(AchievementType.SPORE_MASTER, planets.some((p) => p.buildings.some((b) => b.type === 'SPORANGE' && b.level >= 5)));
    check(AchievementType.ANCIENT_DISCOVERY, reports.some((r) => r.outcome === 'ANOMALY'));
    check(AchievementType.GALACTIC_HIVE, colonyCount >= 6);
    check(AchievementType.MASTER_BUILDER, totalBuildingLevels >= 50);
    check(AchievementType.SCHOLAR, new Set(research.filter((r) => r.level >= 1).map((r) => r.type)).size >= 6);
    check(AchievementType.TITAN_BREEDER, titanCount >= 1);
    check(AchievementType.HUNDRED_SHIPS, totalShips >= 100);
    check(AchievementType.CONVERGENCE_HERALD, (user?.artifactCount ?? 0) >= 3);
    check(AchievementType.RESOURCE_BARON, planets.some((p) => p.biomass >= 100_000));
    check(AchievementType.PEACEFUL_EXPLORER, (() => {
      const sorted = [...reports].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      let consecutive = 0;
      let max = 0;
      for (const r of sorted) {
        if (r.outcome === 'INCIDENT') { max = Math.max(max, consecutive); consecutive = 0; }
        else consecutive++;
      }
      return Math.max(max, consecutive) >= 50;
    })());
    check(AchievementType.SPORAL_SAGE, (researchMap.get('SPORAL_PROPULSION') ?? 0) >= 10);
    check(AchievementType.THE_CONVERGENCE, colonyCount >= 11);

    if (toGrant.length === 0) return;
    await this.prisma.playerAchievement.createMany({
      data: toGrant.map((type) => ({ userId, type })),
      skipDuplicates: true,
    });
  }

  async grantIfNotExists(userId: string, type: AchievementType): Promise<void> {
    await this.prisma.playerAchievement.upsert({
      where: { userId_type: { userId, type } },
      update: {},
      create: { userId, type },
    });
  }
}
