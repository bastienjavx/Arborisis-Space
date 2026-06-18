import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import {
  BUILDINGS,
  BuildingType,
  buildingCost,
  buildTimeSeconds,
  canAfford,
  planetFields,
  ResearchType,
  unmetBuildingRequirements,
  type JobView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameQueueService } from '../queue/game-queue.service';
import { FinalizationService } from './finalization.service';
import { GameEngineService } from './game-engine.service';
import { constructionJobView } from './game.mappers';
import { PlanetsService } from './planets.service';

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly finalization: FinalizationService,
    private readonly queue: GameQueueService,
  ) {}

  async upgrade(userId: string, planetId: string, type: BuildingType): Promise<JobView> {
    await this.planets.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueForPlanet(planetId);
    let job;
    try {
      job = await this.prisma.serializable(async (tx) => {
        const pending = await tx.constructionJob.findFirst({
          where: { planetId, status: JobStatus.PENDING },
        });
        if (pending) {
          throw new ConflictException('Une construction est déjà en cours sur cette planète.');
        }

        const settled = await this.engine.settlePlanet(planetId, new Date(), tx);
        const { buildings, research } = settled;
        const resources = this.engine.buildResourceState(settled);
        const targetLevel = (buildings[type] ?? 0) + 1;
        if (targetLevel > BUILDINGS[type].maxLevel) {
          throw new BadRequestException('Niveau maximum atteint pour ce bâtiment.');
        }
        if (unmetBuildingRequirements(type, { buildings, research }).length > 0) {
          throw new BadRequestException('Prérequis non satisfaits.');
        }
        const usedFields = settled.planet.buildings.reduce((sum, b) => sum + b.level, 0);
        const maxFields = planetFields(research[ResearchType.TERRAFORMATION] ?? 0);
        if (usedFields >= maxFields) {
          throw new ConflictException(
            'Plus d’emplacements disponibles. Recherchez la Terraformation.',
          );
        }
        const cost = buildingCost(type, targetLevel);
        if (!canAfford(resources.amounts, cost)) {
          throw new BadRequestException('Ressources insuffisantes.');
        }
        const seconds = buildTimeSeconds(
          type,
          targetLevel,
          buildings[BuildingType.SYMBIOTIC_CORE] ?? 0,
        );
        const now = new Date();
        const finishesAt = new Date(now.getTime() + seconds * 1000);
        await this.engine.spend(planetId, cost, tx);
        return tx.constructionJob.create({
          data: { planetId, buildingType: type, targetLevel, startedAt: now, finishesAt },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Une construction est déjà en cours sur cette planète.');
      }
      throw error;
    }
    await this.queue.scheduleConstruction(job.id, job.finishesAt);

    return constructionJobView(job);
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  async cancel(userId: string, planetId: string): Promise<void> {
    await this.planets.assertOwnership(userId, planetId);
    // Annulation simple : pas de remboursement dans ce MVP.
    await this.prisma.constructionJob.updateMany({
      where: { planetId, status: JobStatus.PENDING },
      data: { status: JobStatus.CANCELLED },
    });
  }
}
