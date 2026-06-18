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

    // Propulsion sporale requise + limite de colonies.
    const propulsion =
      (await this.prisma.researchLevel.findUnique({
        where: { userId_type: { userId, type: ResearchType.SPORAL_PROPULSION } },
      }))?.level ?? 0;
    const allowedColonies = maxColonies(propulsion);
    if (allowedColonies < 1) {
      throw new BadRequestException('Recherchez la Propulsion sporale pour essaimer.');
    }

    const ownedPlanetCount = await this.prisma.planet.count({ where: { ownerId: userId } });
    const pendingColonizations = await this.prisma.colonizationJob.count({
      where: { userId, status: JobStatus.PENDING },
    });
    const currentColonies = ownedPlanetCount - 1; // hors Noyau-Monde
    if (currentColonies + pendingColonizations >= allowedColonies) {
      throw new ConflictException('Limite de colonies atteinte.');
    }

    // Emplacement libre (pas de planète ni d'essaimage déjà en route).
    const occupied = await this.prisma.planet.findUnique({
      where: {
        galaxy_system_position: {
          galaxy: target.galaxy,
          system: target.system,
          position: target.position,
        },
      },
    });
    if (occupied) throw new ConflictException('Emplacement déjà occupé.');
    const inbound = await this.prisma.colonizationJob.findFirst({
      where: {
        status: JobStatus.PENDING,
        targetGalaxy: target.galaxy,
        targetSystem: target.system,
        targetPosition: target.position,
      },
    });
    if (inbound) throw new ConflictException('Un essaimage est déjà en route vers cet emplacement.');

    const settled = await this.engine.settlePlanet(sourcePlanetId);
    const resources = this.engine.buildResourceState(settled);
    const cost = colonizationCost(ownedPlanetCount);
    if (!canAfford(resources.amounts, cost)) {
      throw new BadRequestException('Ressources insuffisantes pour l’essaimage.');
    }

    const seconds = colonizationTimeSeconds(propulsion);
    const now = new Date();
    const finishesAt = new Date(now.getTime() + seconds * 1000);

    await this.engine.spend(sourcePlanetId, cost);
    const job = await this.prisma.colonizationJob.create({
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
    await this.queue.scheduleColonization(job.id, finishesAt);

    return colonizationJobView(job);
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
