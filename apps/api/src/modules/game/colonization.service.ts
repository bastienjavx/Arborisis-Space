import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import {
  canAfford,
  colonizationCost,
  colonizationTimeSeconds,
  maxColonies,
  ResearchType,
  type Coordinates,
  type JobView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';
import { GameQueueService } from '../queue/game-queue.service';
import { FinalizationService } from './finalization.service';
import { GameEngineService } from './game-engine.service';
import { GalaxyService } from './galaxy.service';
import { colonizationJobView } from './game.mappers';
import { PlanetsService } from './planets.service';

@Injectable()
export class ColonizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly galaxy: GalaxyService,
    private readonly finalization: FinalizationService,
    private readonly queue: GameQueueService,
  ) {}

  async colonize(userId: string, sourcePlanetId: string, target: Coordinates): Promise<JobView> {
    await this.planets.assertOwnership(userId, sourcePlanetId);
    await this.finalization.finalizeDueColonizationForUser(userId);
    this.galaxy.assertValidPosition(target.galaxy, target.system, target.position);
    let job;
    try {
      job = await this.prisma.serializable(async (tx) => {
        const universeId = await getDefaultUniverseId(tx);
        const propulsion =
          (
            await tx.researchLevel.findUnique({
              where: { userId_type: { userId, type: ResearchType.SPORAL_PROPULSION } },
            })
          )?.level ?? 0;
        const allowedColonies = maxColonies(propulsion);
        if (allowedColonies < 1) {
          throw new BadRequestException('Recherchez la Propulsion sporale pour essaimer.');
        }

        const ownedPlanetCount = await tx.planet.count({ where: { ownerId: userId } });
        const pendingColonizations = await tx.colonizationJob.count({
          where: { userId, status: JobStatus.PENDING },
        });
        if (ownedPlanetCount - 1 + pendingColonizations >= allowedColonies) {
          throw new ConflictException('Limite de colonies atteinte.');
        }

        const occupied = await tx.planet.findUnique({
          where: {
            universeId_galaxy_system_position: {
              universeId,
              galaxy: target.galaxy,
              system: target.system,
              position: target.position,
            },
          },
        });
        if (occupied) throw new ConflictException('Emplacement déjà occupé.');
        const inbound = await tx.colonizationJob.findFirst({
          where: {
            status: JobStatus.PENDING,
            targetGalaxy: target.galaxy,
            targetSystem: target.system,
            targetPosition: target.position,
          },
        });
        if (inbound) {
          throw new ConflictException('Un essaimage est déjà en route vers cet emplacement.');
        }

        const settled = await this.engine.settlePlanet(sourcePlanetId, new Date(), tx);
        const cost = colonizationCost(ownedPlanetCount);
        if (!canAfford(this.engine.buildResourceState(settled).amounts, cost)) {
          throw new BadRequestException('Ressources insuffisantes pour l’essaimage.');
        }
        const now = new Date();
        const finishesAt = new Date(now.getTime() + colonizationTimeSeconds(propulsion) * 1_000);
        await this.engine.spend(sourcePlanetId, cost, tx);
        return tx.colonizationJob.create({
          data: {
            userId,
            sourcePlanetId,
            targetGalaxy: target.galaxy,
            targetSystem: target.system,
            targetPosition: target.position,
            startedAt: now,
            finishesAt,
          },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Un essaimage est déjà en route vers cet emplacement.');
      }
      throw error;
    }
    await this.queue.scheduleColonization(job.id, job.finishesAt);

    return colonizationJobView(job);
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  async listActive(userId: string): Promise<JobView[]> {
    await this.finalization.finalizeDueColonizationForUser(userId);
    const jobs = await this.prisma.colonizationJob.findMany({
      where: { userId, status: JobStatus.PENDING },
      orderBy: { finishesAt: 'asc' },
    });
    return jobs.map(colonizationJobView);
  }
}
