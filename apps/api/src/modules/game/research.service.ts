import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import {
  BuildingType,
  canAfford,
  RaceType,
  RESEARCHES,
  ResearchType,
  researchCost,
  researchTimeSeconds,
  unmetResearchRequirements,
  type JobView,
  type ResearchOverview,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameQueueService } from '../queue/game-queue.service';
import { FinalizationService } from './finalization.service';
import { RedisService } from '../../common/redis/redis.service';
import { GameEngineService } from './game-engine.service';
import { buildResearchViews, researchJobView } from './game.mappers';
import { PlanetsService } from './planets.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ResearchService {
  private static readonly RESEARCH_LEVELS_TTL_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly finalization: FinalizationService,
    private readonly queue: GameQueueService,
    private readonly events: EventsGateway,
    private readonly redis: RedisService,
  ) {}

  private researchLevelsKey(userId: string): string {
    return `research:levels:${userId}`;
  }

  private async getCachedResearchLevels(
    userId: string,
  ): Promise<Record<ResearchType, number> | null> {
    const raw = await this.redis.get(this.researchLevelsKey(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<ResearchType, number>;
    } catch {
      return null;
    }
  }

  private async setCachedResearchLevels(
    userId: string,
    levels: Record<ResearchType, number>,
  ): Promise<void> {
    await this.redis.set(
      this.researchLevelsKey(userId),
      JSON.stringify(levels),
      ResearchService.RESEARCH_LEVELS_TTL_SECONDS,
    );
  }

  async invalidateResearchLevels(userId: string): Promise<void> {
    await this.redis.del(this.researchLevelsKey(userId));
  }

  /** Vue d'ensemble des recherches, coûts évalués sur la planète choisie. */
  async getOverview(userId: string, planetId: string): Promise<ResearchOverview> {
    await this.planets.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueResearchForUser(userId);

    const settled = await this.engine.settlePlanet(planetId);
    const resources = this.engine.buildResourceState(settled);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const race = user.race as RaceType;

    let research: Record<ResearchType, number> | null = await this.getCachedResearchLevels(userId);
    if (!research) {
      research = settled.research as Record<ResearchType, number>;
      await this.setCachedResearchLevels(userId, research);
    }

    const researches = buildResearchViews(settled.buildings, research, resources.amounts, race);

    const active = await this.prisma.researchJob.findFirst({
      where: { userId, status: JobStatus.PENDING },
      orderBy: { finishesAt: 'asc' },
    });

    return { activeJob: active ? researchJobView(active) : null, researches };
  }

  async start(userId: string, planetId: string, type: ResearchType): Promise<JobView> {
    await this.planets.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueResearchForUser(userId);
    let job;
    try {
      job = await this.prisma.optimistic(async (tx) => {
        const pending = await tx.researchJob.findFirst({
          where: { userId, status: JobStatus.PENDING },
        });
        if (pending) throw new ConflictException('Une recherche est déjà en cours.');

        const settled = await this.engine.settlePlanet(planetId, new Date(), tx);
        const { buildings, research } = settled;
        const resources = this.engine.buildResourceState(settled);
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const race = user.race as RaceType;
        const targetLevel = (research[type] ?? 0) + 1;
        if (targetLevel > RESEARCHES[type].maxLevel) {
          throw new BadRequestException('Niveau maximum atteint pour cette recherche.');
        }
        if (unmetResearchRequirements(type, { buildings, research }).length > 0) {
          throw new BadRequestException('Prérequis non satisfaits.');
        }
        const cost = researchCost(type, targetLevel, race);
        if (!canAfford(resources.amounts, cost)) {
          throw new BadRequestException('Ressources insuffisantes.');
        }
        const seconds = researchTimeSeconds(
          type,
          targetLevel,
          buildings[BuildingType.RESEARCH_NEXUS] ?? 0,
        );
        const now = new Date();
        const finishesAt = new Date(now.getTime() + seconds * 1000);
        await this.engine.spend(planetId, cost, tx, settled.planet.version);
        return tx.researchJob.create({
          data: { userId, planetId, researchType: type, targetLevel, startedAt: now, finishesAt },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Une recherche est déjà en cours.');
      }
      throw error;
    }
    await this.queue.scheduleResearch(job.id, job.finishesAt);
    await this.invalidateResearchLevels(userId);
    this.events.emitToUser(userId, 'planet:updated', { planetId });

    return researchJobView(job);
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
