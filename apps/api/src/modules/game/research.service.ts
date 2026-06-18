import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import {
  BuildingType,
  canAfford,
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
import { GameEngineService } from './game-engine.service';
import { buildResearchViews, researchJobView } from './game.mappers';
import { PlanetsService } from './planets.service';

@Injectable()
export class ResearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly finalization: FinalizationService,
    private readonly queue: GameQueueService,
  ) {}

  /** Vue d'ensemble des recherches, coûts évalués sur la planète choisie. */
  async getOverview(userId: string, planetId: string): Promise<ResearchOverview> {
    await this.planets.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueResearchForUser(userId);

    const settled = await this.engine.settlePlanet(planetId);
    const resources = this.engine.buildResourceState(settled);
    const researches = buildResearchViews(settled.buildings, settled.research, resources.amounts);

    const active = await this.prisma.researchJob.findFirst({
      where: { userId, status: JobStatus.PENDING },
      orderBy: { finishesAt: 'asc' },
    });

    return { activeJob: active ? researchJobView(active) : null, researches };
  }

  async start(userId: string, planetId: string, type: ResearchType): Promise<JobView> {
    await this.planets.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueResearchForUser(userId);

    // Une seule recherche à la fois par empire.
    const pending = await this.prisma.researchJob.findFirst({
      where: { userId, status: JobStatus.PENDING },
    });
    if (pending) throw new ConflictException('Une recherche est déjà en cours.');

    const settled = await this.engine.settlePlanet(planetId);
    const { buildings, research } = settled;
    const resources = this.engine.buildResourceState(settled);

    const currentLevel = research[type] ?? 0;
    const targetLevel = currentLevel + 1;
    if (targetLevel > RESEARCHES[type].maxLevel) {
      throw new BadRequestException('Niveau maximum atteint pour cette recherche.');
    }

    const unmet = unmetResearchRequirements(type, { buildings, research });
    if (unmet.length > 0) throw new BadRequestException('Prérequis non satisfaits.');

    const cost = researchCost(type, targetLevel);
    if (!canAfford(resources.amounts, cost)) {
      throw new BadRequestException('Ressources insuffisantes.');
    }

    const nexusLevel = buildings[BuildingType.RESEARCH_NEXUS] ?? 0;
    const seconds = researchTimeSeconds(type, targetLevel, nexusLevel);
    const now = new Date();
    const finishesAt = new Date(now.getTime() + seconds * 1000);

    await this.engine.spend(planetId, cost);
    const job = await this.prisma.researchJob.create({
      data: { userId, planetId, researchType: type, targetLevel, startedAt: now, finishesAt },
    });
    await this.queue.scheduleResearch(job.id, finishesAt);

    return researchJobView(job);
  }
}
