import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ItemKey as PrismaItemKey } from '@prisma/client';
import {
  CRAFTING_RECIPES,
  type CraftingJobView,
  ItemKey,
  type StartCraftingDto,
  ResourceType,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';
import { CRAFTING_QUEUE, FINALIZE_JOB } from '../queue/queue.constants';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CraftingService {
  private readonly logger = new Logger(CraftingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    @InjectQueue(CRAFTING_QUEUE) private readonly craftingQueue: Queue,
    private readonly events: EventsGateway,
  ) {}

  getRecipes(): typeof CRAFTING_RECIPES {
    return CRAFTING_RECIPES;
  }

  async startCrafting(userId: string, dto: StartCraftingDto): Promise<CraftingJobView> {
    const planet = await this.planets.assertOwnership(userId, dto.planetId);
    const recipe = CRAFTING_RECIPES.find((r) => r.id === dto.recipeId);
    if (!recipe) throw new NotFoundException('Recette introuvable.');

    const settled = await this.engine.settlePlanet(planet.id);

    const createdJob = await this.prisma.optimistic(async (tx) => {
      // Vérifier et déduire les ressources de base
      const resourceCosts: Partial<Record<ResourceType, number>> = {};
      for (const ing of recipe.ingredients) {
        if (ing.resource) {
          resourceCosts[ing.resource] =
            (resourceCosts[ing.resource] ?? 0) + ing.quantity * dto.quantity;
        }
      }

      const planetRow = await tx.planet.findUniqueOrThrow({ where: { id: dto.planetId } });
      const resourceMap: Record<string, number> = {
        BIOMASS: planetRow.biomass,
        SAP: planetRow.sap,
        MINERALS: planetRow.minerals,
        SPORES: planetRow.spores,
      };

      for (const [res, cost] of Object.entries(resourceCosts)) {
        if ((resourceMap[res] ?? 0) < cost) {
          throw new BadRequestException(
            `${res} insuffisant. Requis : ${cost}, disponible : ${Math.floor(resourceMap[res] ?? 0)}.`,
          );
        }
      }

      const itemCosts: { itemKey: PrismaItemKey; quantity: number }[] = [];
      for (const ing of recipe.ingredients) {
        if (ing.itemKey) {
          itemCosts.push({
            itemKey: ing.itemKey as PrismaItemKey,
            quantity: ing.quantity * dto.quantity,
          });
        }
      }

      for (const { itemKey, quantity } of itemCosts) {
        const slot = await tx.playerInventorySlot.findUnique({
          where: { userId_planetId_itemKey: { userId, planetId: dto.planetId, itemKey } },
        });
        if (!slot || slot.quantity < quantity) {
          throw new BadRequestException(
            `Objet ${itemKey} insuffisant. Requis : ${quantity}, disponible : ${slot?.quantity ?? 0}.`,
          );
        }
        await tx.playerInventorySlot.update({
          where: { userId_planetId_itemKey: { userId, planetId: dto.planetId, itemKey } },
          data: { quantity: { decrement: quantity } },
        });
      }

      // Déduire ressources de base
      if (Object.keys(resourceCosts).length > 0) {
        await tx.planet.update({
          where: { id: dto.planetId, version: planetRow.version },
          data: {
            biomass: resourceCosts[ResourceType.BIOMASS]
              ? { decrement: resourceCosts[ResourceType.BIOMASS] }
              : undefined,
            sap: resourceCosts[ResourceType.SAP]
              ? { decrement: resourceCosts[ResourceType.SAP] }
              : undefined,
            minerals: resourceCosts[ResourceType.MINERALS]
              ? { decrement: resourceCosts[ResourceType.MINERALS] }
              : undefined,
            spores: resourceCosts[ResourceType.SPORES]
              ? { decrement: resourceCosts[ResourceType.SPORES] }
              : undefined,
            lastResourceUpdate: settled.planet.lastResourceUpdate,
            version: { increment: 1 },
          },
        });
      }

      const completesAt = new Date(Date.now() + recipe.craftTimeSeconds * 1_000 * dto.quantity);

      return tx.craftingJob.create({
        data: {
          userId,
          planetId: dto.planetId,
          recipeId: recipe.id,
          outputKey: recipe.outputKey,
          outputQty: recipe.outputQty,
          quantity: dto.quantity,
          completesAt,
        },
      });
    });

    await this.craftingQueue.add(
      FINALIZE_JOB,
      { jobId: createdJob.id, universeId: settled.planet.universeId },
      {
        jobId: `craft-${createdJob.id}`,
        delay: Math.max(0, createdJob.completesAt.getTime() - Date.now()),
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5_000 },
      },
    );
    this.events.emitToUser(userId, 'planet:updated', { planetId: dto.planetId });

    const job = await this.prisma.craftingJob.findUniqueOrThrow({
      where: { id: createdJob.id },
      include: { planet: { select: { name: true } } },
    });
    return this.toView(job);
  }

  async getCraftingJobs(userId: string, planetId?: string): Promise<CraftingJobView[]> {
    const where = planetId ? { userId, planetId } : { userId };
    const jobs = await this.prisma.craftingJob.findMany({
      where: { ...where, status: 'PENDING' },
      include: { planet: { select: { name: true } } },
      orderBy: { completesAt: 'asc' },
    });

    return jobs.map((j) => this.toView(j));
  }

  private toView(j: {
    id: string;
    recipeId: string;
    outputKey: string;
    outputQty: number;
    quantity: number;
    planetId: string;
    planet: { name: string };
    startedAt: Date;
    completesAt: Date;
    status: string;
  }): CraftingJobView {
    return {
      id: j.id,
      recipeId: j.recipeId,
      outputKey: j.outputKey as ItemKey,
      outputQty: j.outputQty,
      quantity: j.quantity,
      planetId: j.planetId,
      planetName: j.planet.name,
      startedAt: j.startedAt.toISOString(),
      completesAt: j.completesAt.toISOString(),
      status: j.status as 'PENDING',
    };
  }

  async finalizeCraftingJob(jobId: string, now = new Date()): Promise<void> {
    await this.prisma.optimistic(async (tx) => {
      const job = await tx.craftingJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== 'PENDING' || job.completesAt > now) return;

      const totalQty = job.outputQty * job.quantity;
      await tx.playerInventorySlot.upsert({
        where: {
          userId_planetId_itemKey: {
            userId: job.userId,
            planetId: job.planetId,
            itemKey: job.outputKey,
          },
        },
        update: { quantity: { increment: totalQty } },
        create: {
          userId: job.userId,
          planetId: job.planetId,
          itemKey: job.outputKey,
          quantity: totalQty,
        },
      });

      await tx.craftingJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      });

      this.logger.log(`Artisanat finalisé : ${job.outputKey} ×${totalQty} pour user ${job.userId}`);
    });
  }

  async sweepAllDue(now = new Date()): Promise<void> {
    const due = await this.prisma.craftingJob.findMany({
      where: { status: 'PENDING', completesAt: { lte: now } },
    });
    for (const j of due) await this.finalizeCraftingJob(j.id, now);
    if (due.length) this.logger.log(`Balayage artisanat : ${due.length} job(s) finalisé(s).`);
  }
}
