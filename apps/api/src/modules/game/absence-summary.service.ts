import { Injectable } from '@nestjs/common';
import {
  ABSENCE_SUMMARY_MIN_SECONDS,
  PvpMissionType,
  ResourceType,
  RESOURCE_TYPES,
  storageCap,
  BuildingType,
  type AbsenceSummaryView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinalizationService } from './finalization.service';
import { GameEngineService } from './game-engine.service';

@Injectable()
export class AbsenceSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finalization: FinalizationService,
    private readonly engine: GameEngineService,
  ) {}

  async getSummary(userId: string, now = new Date()): Promise<AbsenceSummaryView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { lastSeenAt: true },
    });

    const empty = this.emptyView();

    // Première visite : on initialise simplement le repère, sans résumé.
    if (!user.lastSeenAt) {
      await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: now } });
      return empty;
    }

    const since = user.lastSeenAt;
    const awaySeconds = Math.max(0, Math.floor((now.getTime() - since.getTime()) / 1_000));

    // Settle l'état (crédite la production) avant de mesurer.
    const planetIds = await this.settlePlayerState(userId);
    const hours = awaySeconds / 3_600;

    const producedResources = this.emptyBundle();
    for (const planetId of planetIds) {
      const settled = await this.engine.settlePlanet(planetId, now);
      const cap = storageCap(settled.buildings[BuildingType.STORAGE_VACUOLE] ?? 0);
      for (const r of RESOURCE_TYPES) {
        const gain = Math.max(0, settled.production.perHour[r] * hours);
        producedResources[r] += Math.min(cap, gain);
      }
    }
    for (const r of RESOURCE_TYPES) producedResources[r] = Math.round(producedResources[r]);

    const window = { gte: since, lte: now };
    const [
      construction,
      research,
      ships,
      colonization,
      expeditionsReturned,
      pveResolved,
      attacksSuffered,
    ] = await Promise.all([
      this.prisma.constructionJob.count({
        where: { planet: { ownerId: userId }, status: 'COMPLETED', finishesAt: window },
      }),
      this.prisma.researchJob.count({
        where: { userId, status: 'COMPLETED', finishesAt: window },
      }),
      this.prisma.shipProductionJob.count({
        where: { planet: { ownerId: userId }, status: 'COMPLETED', finishesAt: window },
      }),
      this.prisma.colonizationJob.count({
        where: { userId, status: 'COMPLETED', finishesAt: window },
      }),
      this.prisma.expeditionReport.count({ where: { userId, returnedAt: window } }),
      this.prisma.pveMission.count({ where: { userId, completedAt: window } }),
      this.prisma.pvpMission.count({
        where: {
          targetPlanet: { ownerId: userId },
          type: PvpMissionType.ATTACK,
          completedAt: window,
        },
      }),
    ]);

    await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: now } });

    const totalProduced = RESOURCE_TYPES.reduce((s, r) => s + producedResources[r], 0);
    const hasActivity =
      totalProduced > 0 ||
      construction + research + ships + colonization > 0 ||
      expeditionsReturned > 0 ||
      pveResolved > 0 ||
      attacksSuffered > 0;

    return {
      show: awaySeconds >= ABSENCE_SUMMARY_MIN_SECONDS && hasActivity,
      awaySeconds,
      producedResources,
      completedJobs: { construction, research, ships, colonization },
      expeditionsReturned,
      pveResolved,
      attacksSuffered,
    };
  }

  private emptyBundle(): Record<ResourceType, number> {
    return {
      [ResourceType.BIOMASS]: 0,
      [ResourceType.SAP]: 0,
      [ResourceType.MINERALS]: 0,
      [ResourceType.SPORES]: 0,
    };
  }

  private emptyView(): AbsenceSummaryView {
    return {
      show: false,
      awaySeconds: 0,
      producedResources: this.emptyBundle(),
      completedJobs: { construction: 0, research: 0, ships: 0, colonization: 0 },
      expeditionsReturned: 0,
      pveResolved: 0,
      attacksSuffered: 0,
    };
  }

  private async settlePlayerState(userId: string): Promise<string[]> {
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
    return planets.map((p) => p.id);
  }
}
