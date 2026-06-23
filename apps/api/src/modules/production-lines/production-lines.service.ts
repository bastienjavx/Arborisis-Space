import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ItemKey,
  MAX_PRODUCTION_LINES_PER_PLANET,
  PRODUCTION_LINE_RECIPES,
  ProductionLineStatus,
  type CreateProductionLineDto,
  type ProductionLineView,
  ResourceType,
  type UpdateProductionLineDto,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';
import { PRODUCTION_LINE_QUEUE, RUN_PRODUCTION_LINE_JOB } from '../queue/queue.constants';

@Injectable()
export class ProductionLinesService {
  private readonly logger = new Logger(ProductionLinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    @InjectQueue(PRODUCTION_LINE_QUEUE) private readonly lineQueue: Queue,
  ) {}

  async getLines(userId: string): Promise<ProductionLineView[]> {
    const lines = await this.prisma.productionLine.findMany({
      where: { userId },
      include: { planet: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return lines.map((line) => this.toView(line));
  }

  async createLine(userId: string, dto: CreateProductionLineDto): Promise<ProductionLineView> {
    await this.planets.assertOwnership(userId, dto.planetId);
    const recipe = PRODUCTION_LINE_RECIPES.find((r) => r.id === dto.recipeId);
    if (!recipe) throw new NotFoundException('Recette de production introuvable.');

    const count = await this.prisma.productionLine.count({
      where: { userId, planetId: dto.planetId },
    });
    if (count >= MAX_PRODUCTION_LINES_PER_PLANET) {
      throw new BadRequestException(
        `Limite de ${MAX_PRODUCTION_LINES_PER_PLANET} lignes de production par planète atteinte.`,
      );
    }

    const nextRunAt = new Date(Date.now() + recipe.cycleSeconds * 1_000);
    const line = await this.prisma.productionLine.create({
      data: {
        userId,
        planetId: dto.planetId,
        recipeId: recipe.id,
        outputKey: recipe.outputKey,
        outputQty: recipe.outputQty,
        cycleSeconds: recipe.cycleSeconds,
        nextRunAt,
      },
      include: { planet: { select: { name: true } } },
    });

    await this.scheduleLine(line.id, nextRunAt);
    return this.toView(line);
  }

  async updateLine(
    userId: string,
    lineId: string,
    dto: UpdateProductionLineDto,
  ): Promise<ProductionLineView> {
    const line = await this.prisma.productionLine.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException('Ligne de production introuvable.');
    if (line.userId !== userId)
      throw new BadRequestException('Cette ligne de production ne vous appartient pas.');

    let nextRunAt = line.nextRunAt;
    if (dto.status === ProductionLineStatus.ACTIVE && line.status !== ProductionLineStatus.ACTIVE) {
      nextRunAt = new Date(Date.now() + line.cycleSeconds * 1_000);
    } else if (
      dto.status === ProductionLineStatus.PAUSED ||
      dto.status === ProductionLineStatus.INPUT_SHORTAGE
    ) {
      nextRunAt = null;
    }

    const updated = await this.prisma.productionLine.update({
      where: { id: lineId },
      data: {
        status: dto.status,
        nextRunAt,
      },
      include: { planet: { select: { name: true } } },
    });

    if (updated.status === ProductionLineStatus.ACTIVE && updated.nextRunAt) {
      await this.scheduleLine(updated.id, updated.nextRunAt);
    }

    return this.toView(updated);
  }

  async deleteLine(userId: string, lineId: string): Promise<void> {
    const line = await this.prisma.productionLine.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException('Ligne de production introuvable.');
    if (line.userId !== userId)
      throw new BadRequestException('Cette ligne de production ne vous appartient pas.');
    await this.prisma.productionLine.delete({ where: { id: lineId } });
  }

  async runLine(lineId: string, now = new Date()): Promise<void> {
    const line = await this.prisma.productionLine.findUnique({ where: { id: lineId } });
    if (!line || line.status !== ProductionLineStatus.ACTIVE) return;
    if (line.nextRunAt && line.nextRunAt > now) return;

    const recipe = PRODUCTION_LINE_RECIPES.find((r) => r.id === line.recipeId);
    if (!recipe) {
      await this.prisma.productionLine.update({
        where: { id: lineId },
        data: { status: ProductionLineStatus.PAUSED, nextRunAt: null },
      });
      this.logger.warn(`Ligne ${lineId} mise en pause : recette inconnue.`);
      return;
    }

    await this.engine.settlePlanet(line.planetId);
    const nextRunAt = new Date(now.getTime() + line.cycleSeconds * 1_000);

    const completed = await this.prisma.serializable(async (tx) => {
      const claimed = await tx.productionLine.updateMany({
        where: {
          id: lineId,
          status: ProductionLineStatus.ACTIVE,
          nextRunAt: line.nextRunAt ? { lte: now } : null,
        },
        data: { lastRunAt: now, nextRunAt },
      });
      if (claimed.count !== 1) return false;

      const planet = await tx.planet.findUniqueOrThrow({ where: { id: line.planetId } });
      const available: Record<ResourceType, number> = {
        [ResourceType.BIOMASS]: planet.biomass,
        [ResourceType.SAP]: planet.sap,
        [ResourceType.MINERALS]: planet.minerals,
        [ResourceType.SPORES]: planet.spores,
      };

      const missing = Object.entries(recipe.inputs).some(
        ([resource, quantity]) => available[resource as ResourceType] < (quantity ?? 0),
      );
      if (missing) {
        await tx.productionLine.update({
          where: { id: lineId },
          data: { status: ProductionLineStatus.INPUT_SHORTAGE, nextRunAt: null },
        });
        return false;
      }

      await tx.planet.update({
        where: { id: line.planetId },
        data: {
          biomass: recipe.inputs[ResourceType.BIOMASS]
            ? { decrement: recipe.inputs[ResourceType.BIOMASS] }
            : undefined,
          sap: recipe.inputs[ResourceType.SAP]
            ? { decrement: recipe.inputs[ResourceType.SAP] }
            : undefined,
          minerals: recipe.inputs[ResourceType.MINERALS]
            ? { decrement: recipe.inputs[ResourceType.MINERALS] }
            : undefined,
          spores: recipe.inputs[ResourceType.SPORES]
            ? { decrement: recipe.inputs[ResourceType.SPORES] }
            : undefined,
        },
      });

      await tx.playerInventorySlot.upsert({
        where: {
          userId_planetId_itemKey: {
            userId: line.userId,
            planetId: line.planetId,
            itemKey: line.outputKey,
          },
        },
        update: { quantity: { increment: line.outputQty } },
        create: {
          userId: line.userId,
          planetId: line.planetId,
          itemKey: line.outputKey,
          quantity: line.outputQty,
        },
      });

      return true;
    });

    if (completed) {
      await this.scheduleLine(lineId, nextRunAt);
      this.logger.debug(`Ligne de production exécutée : ${lineId}`);
    }
  }

  async sweepDueLines(now = new Date()): Promise<void> {
    const due = await this.prisma.productionLine.findMany({
      where: { status: ProductionLineStatus.ACTIVE, nextRunAt: { lte: now } },
    });
    for (const line of due) await this.runLine(line.id, now).catch((err) => this.logger.error(err));
    if (due.length) this.logger.log(`Lignes de production : ${due.length} exécutée(s).`);
  }

  private async scheduleLine(lineId: string, runAt: Date): Promise<void> {
    await this.lineQueue.add(
      RUN_PRODUCTION_LINE_JOB,
      { lineId },
      {
        jobId: `production-line-${lineId}-${runAt.getTime()}`,
        delay: Math.max(0, runAt.getTime() - Date.now()),
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 10_000 },
      },
    );
  }

  private toView(line: {
    id: string;
    planetId: string;
    planet: { name: string };
    recipeId: string;
    outputKey: string;
    outputQty: number;
    cycleSeconds: number;
    status: string;
    nextRunAt: Date | null;
    lastRunAt: Date | null;
    createdAt: Date;
  }): ProductionLineView {
    return {
      id: line.id,
      planetId: line.planetId,
      planetName: line.planet.name,
      recipeId: line.recipeId,
      outputKey: line.outputKey as ItemKey,
      outputQty: line.outputQty,
      cycleSeconds: line.cycleSeconds,
      status: line.status as ProductionLineStatus,
      nextRunAt: line.nextRunAt?.toISOString() ?? null,
      lastRunAt: line.lastRunAt?.toISOString() ?? null,
      createdAt: line.createdAt.toISOString(),
    };
  }
}
