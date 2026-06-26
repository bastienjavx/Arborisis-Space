import { Injectable } from '@nestjs/common';
import {
  ACHIEVEMENTS,
  AchievementType,
  RESEARCH_TYPES,
  SYSTEMS_PER_GALAXY,
  type AchievementView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinalizationService } from './finalization.service';
import { GameEngineService } from './game-engine.service';

@Injectable()
export class AchievementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finalization: FinalizationService,
    private readonly engine: GameEngineService,
  ) {}

  async getAchievements(userId: string): Promise<AchievementView[]> {
    await this.settlePlayerState(userId);
    const progress = await this.evaluate(userId);
    const alreadyUnlocked = new Set(
      (
        await this.prisma.playerAchievement.findMany({ where: { userId }, select: { type: true } })
      ).map((a) => a.type),
    );
    const newlyGranted = Object.values(AchievementType).filter(
      (type) => !alreadyUnlocked.has(type) && progress[type].progress >= progress[type].target,
    );
    if (newlyGranted.length > 0) {
      await this.prisma.optimistic(async (tx) => {
        // Relecture dans la transaction : une requête concurrente a pu débloquer
        // un succès depuis l'évaluation ci-dessus.
        const existing = new Set(
          (
            await tx.playerAchievement.findMany({
              where: { userId, type: { in: newlyGranted } },
              select: { type: true },
            })
          ).map((achievement) => achievement.type),
        );
        for (const type of newlyGranted) {
          if (existing.has(type)) continue;
          await tx.playerAchievement.create({ data: { userId, type } });
          const reward = ACHIEVEMENTS[type].reward;
          if (reward && Object.keys(reward).length > 0) {
            await this.engine.creditResourcesToHomeworld(userId, reward, new Date(), tx);
          }
        }
      });
    }
    const unlocked = await this.prisma.playerAchievement.findMany({ where: { userId } });
    const unlockedMap = new Map(unlocked.map((a) => [a.type, a.unlockedAt.toISOString()]));
    return Object.values(AchievementType).map((type) => ({
      type,
      name: ACHIEVEMENTS[type].name,
      description: ACHIEVEMENTS[type].description,
      rewardText: ACHIEVEMENTS[type].rewardText,
      reward: ACHIEVEMENTS[type].reward,
      unlockedAt: unlockedMap.get(type) ?? null,
      ...progress[type],
    }));
  }

  async checkAndGrant(userId: string): Promise<void> {
    await this.getAchievements(userId);
  }

  private async settlePlayerState(userId: string): Promise<void> {
    await Promise.all([
      this.finalization.finalizeDueResearchForUser(userId),
      this.finalization.finalizeDueColonizationForUser(userId),
    ]);
    const planets = await this.prisma.planet.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    await Promise.all(
      planets.flatMap(({ id }) => [
        this.finalization.finalizeDueForPlanet(id),
        this.finalization.finalizeDueShipProduction(id),
      ]),
    );
    await Promise.all(planets.map(({ id }) => this.engine.settlePlanet(id)));
  }

  private async evaluate(
    userId: string,
  ): Promise<
    Record<AchievementType, Pick<AchievementView, 'progress' | 'target' | 'progressLabel'>>
  > {
    const [planets, research, reports, missions, fastBuilds, user] = await Promise.all([
      this.prisma.planet.findMany({
        where: { ownerId: userId },
        include: { buildings: true, ships: true },
      }),
      this.prisma.researchLevel.findMany({ where: { userId } }),
      this.prisma.expeditionReport.findMany({ where: { userId } }),
      this.prisma.expeditionMission.findMany({
        where: { userId },
        select: {
          targetGalaxy: true,
          targetSystem: true,
          planet: { select: { galaxy: true, system: true } },
        },
      }),
      this.prisma.constructionJob.findMany({
        where: {
          planet: { ownerId: userId },
          status: 'COMPLETED',
        },
        select: { startedAt: true, finishesAt: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { artifactCount: true, universeId: true, createdAt: true },
      }),
    ]);

    const totalBuildingLevels = planets
      .flatMap((p) => p.buildings)
      .reduce((s, b) => s + b.level, 0);
    const totalShips = planets.flatMap((p) => p.ships).reduce((s, s2) => s + s2.quantity, 0);
    const titanCount = planets
      .flatMap((p) => p.ships)
      .filter((s) => s.type === 'SPOROGENESIS_TITAN')
      .reduce((s, s2) => s + s2.quantity, 0);
    const researchMap = new Map(research.map((r) => [r.type, r.level]));
    const colonyCount = planets.length;
    const maxSporange = Math.max(
      0,
      ...planets.flatMap((p) =>
        p.buildings.filter((b) => b.type === 'SPORANGE').map((b) => b.level),
      ),
    );
    const peacefulStreak = (() => {
      let streak = 0;
      let best = 0;
      for (const report of [...reports].sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      )) {
        streak = report.outcome === 'INCIDENT' ? 0 : streak + 1;
        best = Math.max(best, streak);
      }
      return best;
    })();
    const maxDistance = Math.max(
      0,
      ...missions.map(
        (mission) =>
          Math.abs(mission.targetGalaxy - mission.planet.galaxy) * SYSTEMS_PER_GALAXY +
          Math.abs(mission.targetSystem - mission.planet.system),
      ),
    );
    const survivedEvent = user
      ? await this.prisma.galacticEvent.count({
          where: {
            universeId: user.universeId,
            type: 'MYCOTOXIN_OUTBREAK',
            endsAt: { gte: user.createdAt, lte: new Date() },
          },
        })
      : 0;
    const completedFastBuild = fastBuilds.some(
      (job) => job.finishesAt.getTime() - job.startedAt.getTime() < 10_000,
    )
      ? 1
      : 0;
    const researchKinds = new Set(research.filter((r) => r.level >= 1).map((r) => r.type)).size;
    const maxBiomass = Math.max(0, ...planets.map((p) => p.biomass));
    const value = (progress: number, target: number, progressLabel: string) => ({
      progress: Math.min(progress, target),
      target,
      progressLabel,
    });

    return {
      [AchievementType.FIRST_SPROUT]: value(totalBuildingLevels, 1, 'niveau de bâtiment'),
      [AchievementType.RESEARCH_PIONEER]: value(
        Math.max(0, ...research.map((r) => r.level)),
        1,
        'recherche',
      ),
      [AchievementType.COSMIC_TRAVELER]: value(missions.length, 1, 'expédition'),
      [AchievementType.COLONIAL_FUNGUS]: value(colonyCount, 2, 'mondes'),
      [AchievementType.FLEET_COMMANDER]: value(totalShips, 10, 'vaisseaux'),
      [AchievementType.SPORE_MASTER]: value(maxSporange, 5, 'niveau'),
      [AchievementType.ANCIENT_DISCOVERY]: value(
        reports.some((r) => r.outcome === 'ANOMALY') ? 1 : 0,
        1,
        'anomalie',
      ),
      [AchievementType.GALACTIC_HIVE]: value(colonyCount, 6, 'mondes'),
      [AchievementType.MASTER_BUILDER]: value(totalBuildingLevels, 50, 'niveaux'),
      [AchievementType.SCHOLAR]: value(researchKinds, RESEARCH_TYPES.length, 'recherches'),
      [AchievementType.TITAN_BREEDER]: value(titanCount, 1, 'titan'),
      [AchievementType.HUNDRED_SHIPS]: value(totalShips, 100, 'vaisseaux'),
      [AchievementType.CONVERGENCE_HERALD]: value(user?.artifactCount ?? 0, 3, 'artefacts'),
      [AchievementType.EVENT_SURVIVOR]: value(survivedEvent, 1, 'événement traversé'),
      [AchievementType.DEEP_SPACE]: value(maxDistance, 20, 'distance'),
      [AchievementType.RESOURCE_BARON]: value(maxBiomass, 100_000, 'biomasse'),
      [AchievementType.SPEED_BUILDER]: value(completedFastBuild, 1, 'construction rapide'),
      [AchievementType.PEACEFUL_EXPLORER]: value(peacefulStreak, 50, 'expéditions'),
      [AchievementType.SPORAL_SAGE]: value(researchMap.get('SPORAL_PROPULSION') ?? 0, 10, 'niveau'),
      [AchievementType.THE_CONVERGENCE]: value(colonyCount, 11, 'mondes'),
    };
  }

  async grantIfNotExists(userId: string, type: AchievementType): Promise<void> {
    await this.prisma.playerAchievement.upsert({
      where: { userId_type: { userId, type } },
      update: {},
      create: { userId, type },
    });
  }
}
