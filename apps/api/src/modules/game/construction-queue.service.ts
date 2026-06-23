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
  usedPlanetFields,
  type AddToQueueDto,
  type ConstructionQueueItemView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from './game-engine.service';
import { PlanetsService } from './planets.service';

const MAX_QUEUE_SIZE = 5;

@Injectable()
export class ConstructionQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
  ) {}

  async getQueue(userId: string, planetId: string): Promise<ConstructionQueueItemView[]> {
    await this.planets.assertOwnership(userId, planetId);
    const items = await this.prisma.constructionQueueItem.findMany({
      where: { planetId },
      orderBy: { queueOrder: 'asc' },
    });
    return items.map((item) => ({
      id: item.id,
      targetType: item.targetType as BuildingType,
      targetLevel: item.targetLevel,
      queueOrder: item.queueOrder,
    }));
  }

  async addToQueue(userId: string, dto: AddToQueueDto): Promise<ConstructionQueueItemView> {
    await this.planets.assertOwnership(userId, dto.planetId);

    const [existing, settled, research] = await Promise.all([
      this.prisma.constructionQueueItem.findMany({
        where: { planetId: dto.planetId },
        orderBy: { queueOrder: 'asc' },
      }),
      this.engine.settlePlanet(dto.planetId),
      this.prisma.researchLevel.findMany({ where: { userId } }),
    ]);

    if (existing.length >= MAX_QUEUE_SIZE) {
      throw new ConflictException(`File de construction limitée à ${MAX_QUEUE_SIZE} éléments.`);
    }

    const buildingLevels = { ...this.engine.buildingLevelsOf(settled.planet.buildings) };
    const researchLevels = this.engine.researchLevelsOf(research);

    for (const queued of existing) {
      buildingLevels[queued.targetType as BuildingType] = queued.targetLevel;
    }

    const targetLevel = (buildingLevels[dto.targetType] ?? 0) + 1;
    if (targetLevel > BUILDINGS[dto.targetType].maxLevel) {
      throw new BadRequestException('Niveau maximum atteint pour ce bâtiment.');
    }
    if (unmetBuildingRequirements(dto.targetType, { buildings: buildingLevels, research: researchLevels }).length > 0) {
      throw new BadRequestException('Prérequis non satisfaits.');
    }

    const usedFields = usedPlanetFields(
      settled.planet.buildings.map((b) => {
        const queued = existing.find((q) => q.targetType === b.type);
        return queued ? queued.targetLevel : b.level;
      }),
    );
    const maxFields = planetFields(researchLevels[ResearchType.TERRAFORMATION] ?? 0);
    const newBuilding = !settled.planet.buildings.find(
      (b) => b.type === dto.targetType && b.level > 0,
    ) && !existing.find((q) => q.targetType === dto.targetType);
    if (newBuilding && usedFields >= maxFields) {
      throw new ConflictException("Plus d'emplacements disponibles.");
    }

    const nextOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.queueOrder)) + 1 : 1;
    const item = await this.prisma.constructionQueueItem.create({
      data: {
        planetId: dto.planetId,
        targetType: dto.targetType,
        targetLevel,
        queueOrder: nextOrder,
      },
    });

    return {
      id: item.id,
      targetType: item.targetType as BuildingType,
      targetLevel: item.targetLevel,
      queueOrder: item.queueOrder,
    };
  }

  async removeFromQueue(userId: string, itemId: string): Promise<void> {
    const item = await this.prisma.constructionQueueItem.findUnique({ where: { id: itemId } });
    if (!item) return;
    await this.planets.assertOwnership(userId, item.planetId);
    await this.prisma.constructionQueueItem.delete({ where: { id: itemId } });
    await this.reorderQueue(item.planetId);
  }

  private async reorderQueue(planetId: string): Promise<void> {
    const items = await this.prisma.constructionQueueItem.findMany({
      where: { planetId },
      orderBy: { queueOrder: 'asc' },
    });
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      if (item.queueOrder !== i + 1) {
        await this.prisma.constructionQueueItem.update({
          where: { id: item.id },
          data: { queueOrder: i + 1 },
        });
      }
    }
  }

  /** Appelé par le processeur de construction après finalisation — démarre le prochain job. */
  async processNextInQueue(planetId: string, userId: string): Promise<void> {
    const next = await this.prisma.constructionQueueItem.findFirst({
      where: { planetId },
      orderBy: { queueOrder: 'asc' },
    });
    if (!next) return;

    const pending = await this.prisma.constructionJob.findFirst({
      where: { planetId, status: JobStatus.PENDING },
    });
    if (pending) return;

    try {
      const settled = await this.engine.settlePlanet(planetId);
      const buildings = this.engine.buildingLevelsOf(settled.planet.buildings);
      const research = this.engine.researchLevelsOf(
        await this.prisma.researchLevel.findMany({ where: { userId } }),
      );

      const cost = buildingCost(next.targetType as BuildingType, next.targetLevel);
      const resourceState = this.engine.buildResourceState(settled);
      if (!canAfford(resourceState.amounts, cost)) return;

      if (unmetBuildingRequirements(next.targetType as BuildingType, { buildings, research }).length > 0) {
        await this.prisma.constructionQueueItem.delete({ where: { id: next.id } });
        return;
      }

      const seconds = buildTimeSeconds(
        next.targetType as BuildingType,
        next.targetLevel,
        buildings[BuildingType.SYMBIOTIC_CORE] ?? 0,
      );
      const now = new Date();
      const finishesAt = new Date(now.getTime() + seconds * 1000);

      await this.prisma.$transaction(async (tx) => {
        await this.engine.spend(planetId, cost, tx);
        await tx.constructionJob.create({
          data: {
            planetId,
            buildingType: next.targetType,
            targetLevel: next.targetLevel,
            startedAt: now,
            finishesAt,
          },
        });
        await tx.constructionQueueItem.delete({ where: { id: next.id } });
      });
    } catch {
      // Queue processing is best-effort
    }
  }
}
