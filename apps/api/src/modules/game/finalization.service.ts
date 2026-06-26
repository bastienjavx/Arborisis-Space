import { Injectable, Logger } from '@nestjs/common';
import { ItemKey as PrismaItemKey, JobStatus, TransferPhase } from '@prisma/client';
import {
  BUILDINGS,
  BuildingType,
  buildingCost,
  buildTimeSeconds,
  canAfford,
  NotificationType,
  RESEARCHES,
  ResearchType,
  ShipType,
  SHIPS,
  unmetBuildingRequirements,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';
import { withConcurrencyLimit } from '../../common/utils/concurrency';
import { NotificationsService } from '../notifications/notifications.service';
import { GameQueueService } from '../queue/game-queue.service';
import { EngagementHookService } from './engagement-hook.service';
import { GameEngineService } from './game-engine.service';
import { WorldFactoryService } from './world-factory.service';

/**
 * Finalise les jobs temporisés (construction, recherche, essaimage).
 * Toutes les méthodes sont IDEMPOTENTES et défensives : elles vérifient le
 * statut et l'échéance, de sorte qu'un worker BullMQ ET une finalisation
 * paresseuse (au moment d'une lecture) puissent coexister sans double effet.
 */
@Injectable()
export class FinalizationService {
  private readonly logger = new Logger(FinalizationService.name);
  private readonly SWEEP_CONCURRENCY = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly worldFactory: WorldFactoryService,
    private readonly notifications: NotificationsService,
    private readonly engine: GameEngineService,
    private readonly gameQueue: GameQueueService,
    private readonly engagementHook: EngagementHookService,
  ) {}

  async finalizeConstruction(jobId: string, now = new Date()): Promise<void> {
    let notifyData: {
      userId: string;
      planetId: string;
      buildingType: string;
      level: number;
    } | null = null;
    await this.prisma.serializable(async (tx) => {
      const job = await tx.constructionJob.findUnique({
        where: { id: jobId },
        include: { planet: { select: { ownerId: true, name: true } } },
      });
      if (!job || job.status !== JobStatus.PENDING || job.finishesAt > now) return;

      await tx.planetBuilding.update({
        where: { planetId_type: { planetId: job.planetId, type: job.buildingType } },
        data: { level: job.targetLevel },
      });
      await tx.constructionJob.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED },
      });
      notifyData = {
        userId: job.planet.ownerId,
        planetId: job.planetId,
        buildingType: job.buildingType,
        level: job.targetLevel,
      };
    });
    if (notifyData) {
      const { userId, planetId, buildingType, level } = notifyData as {
        userId: string;
        planetId: string;
        buildingType: string;
        level: number;
      };
      const buildingName = BUILDINGS[buildingType as BuildingType]?.name ?? buildingType;
      await this.notifications
        .enqueue(
          userId,
          NotificationType.CONSTRUCTION_COMPLETE,
          'Construction terminée',
          `${buildingName} atteint le niveau ${level}.`,
          { buildingType, level },
        )
        .catch(() => void 0);
      await this.processNextInQueue(planetId);
      await this.engagementHook.onBuildingCompleted(userId).catch(() => void 0);
    }
  }

  async processNextInQueue(planetId: string): Promise<void> {
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
      const research = this.engine.researchLevelsOf(settled.researchLevels);

      const cost = buildingCost(next.targetType as BuildingType, next.targetLevel);
      const resourceState = this.engine.buildResourceState(settled);
      if (!canAfford(resourceState.amounts, cost)) return;

      if (
        unmetBuildingRequirements(next.targetType as BuildingType, { buildings, research }).length >
        0
      ) {
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

      let newJobId: string | null = null;
      await this.prisma.$transaction(async (tx) => {
        await this.engine.spend(planetId, cost, tx);
        const job = await tx.constructionJob.create({
          data: {
            planetId,
            buildingType: next.targetType,
            targetLevel: next.targetLevel,
            startedAt: now,
            finishesAt,
          },
        });
        newJobId = job.id;
        await tx.constructionQueueItem.delete({ where: { id: next.id } });
      });

      if (newJobId) {
        await this.gameQueue.scheduleConstruction(newJobId, finishesAt);
      }
    } catch {
      // Queue processing is best-effort
    }
  }

  async finalizeResearch(jobId: string, now = new Date()): Promise<void> {
    let notifyData: { userId: string; researchType: string; level: number } | null = null;
    await this.prisma.serializable(async (tx) => {
      const job = await tx.researchJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== JobStatus.PENDING || job.finishesAt > now) return;

      await tx.researchLevel.update({
        where: { userId_type: { userId: job.userId, type: job.researchType } },
        data: { level: job.targetLevel },
      });
      await tx.researchJob.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED },
      });
      notifyData = { userId: job.userId, researchType: job.researchType, level: job.targetLevel };
    });
    if (notifyData) {
      const { userId, researchType, level } = notifyData as {
        userId: string;
        researchType: string;
        level: number;
      };
      const researchName = RESEARCHES[researchType as ResearchType]?.name ?? researchType;
      await this.notifications
        .enqueue(
          userId,
          NotificationType.RESEARCH_COMPLETE,
          'Recherche terminée',
          `${researchName} atteint le niveau ${level}.`,
          { researchType, level },
        )
        .catch(() => void 0);
      await this.engagementHook.onResearchCompleted(userId).catch(() => void 0);
    }
  }

  async finalizeColonization(jobId: string, now = new Date()): Promise<void> {
    await this.prisma.serializable(async (tx) => {
      const job = await tx.colonizationJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== JobStatus.PENDING || job.finishesAt > now) return;

      const universeId = await getDefaultUniverseId(tx);
      const occupied = await tx.planet.findUnique({
        where: {
          universeId_galaxy_system_position: {
            universeId,
            galaxy: job.targetGalaxy,
            system: job.targetSystem,
            position: job.targetPosition,
          },
        },
      });

      if (occupied) {
        // Emplacement pris entre-temps : essaimage annulé.
        await tx.colonizationJob.update({
          where: { id: jobId },
          data: { status: JobStatus.CANCELLED },
        });
        this.logger.warn(`Essaimage ${jobId} annulé : emplacement occupé.`);
        return;
      }

      await this.worldFactory.createColony(tx, job.userId, universeId, {
        galaxy: job.targetGalaxy,
        system: job.targetSystem,
        position: job.targetPosition,
      });
      await tx.colonizationJob.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED },
      });
      await this.notifications
        .enqueue(
          job.userId,
          NotificationType.COLONIZATION_COMPLETE,
          'Essaimage réussi',
          `Votre colonie en ${job.targetGalaxy}:${job.targetSystem}:${job.targetPosition} est fondée.`,
          { galaxy: job.targetGalaxy, system: job.targetSystem, position: job.targetPosition },
        )
        .catch(() => void 0);
    });
  }

  async finalizeShipProduction(jobId: string, now = new Date()): Promise<void> {
    await this.prisma.serializable(async (tx) => {
      const job = await tx.shipProductionJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== JobStatus.PENDING || job.finishesAt > now) return;
      await tx.planetShip.upsert({
        where: { planetId_type: { planetId: job.planetId, type: job.shipType } },
        update: { quantity: { increment: job.quantity } },
        create: { planetId: job.planetId, type: job.shipType, quantity: job.quantity },
      });
      await tx.shipProductionJob.update({
        where: { id: job.id },
        data: { status: JobStatus.COMPLETED },
      });
    });

    const done = await this.prisma.shipProductionJob.findUnique({
      where: { id: jobId },
      include: { planet: { select: { ownerId: true } } },
    });
    if (done?.status === JobStatus.COMPLETED) {
      const shipName = SHIPS[done.shipType as ShipType]?.name ?? done.shipType;
      await this.notifications
        .enqueue(
          done.planet.ownerId,
          NotificationType.SHIP_PRODUCED,
          'Production navale terminée',
          `${done.quantity}× ${shipName} prêt(s) au déploiement.`,
          { shipType: done.shipType, quantity: done.quantity },
        )
        .catch(() => void 0);
    }
  }

  // ── Finalisation paresseuse (défensive, lors des lectures) ──

  async finalizeDueForPlanet(planetId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.constructionJob.findMany({
      where: { planetId, status: JobStatus.PENDING, finishesAt: { lte: now } },
    });
    await withConcurrencyLimit(due, this.SWEEP_CONCURRENCY, (job) =>
      this.finalizeConstruction(job.id, now),
    );
  }

  async finalizeDueResearchForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.researchJob.findMany({
      where: { userId, status: JobStatus.PENDING, finishesAt: { lte: now } },
    });
    await withConcurrencyLimit(due, this.SWEEP_CONCURRENCY, (job) =>
      this.finalizeResearch(job.id, now),
    );
  }

  async finalizeDueColonizationForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.colonizationJob.findMany({
      where: { userId, status: JobStatus.PENDING, finishesAt: { lte: now } },
    });
    await withConcurrencyLimit(due, this.SWEEP_CONCURRENCY, (job) =>
      this.finalizeColonization(job.id, now),
    );
  }

  async finalizeDueShipProduction(planetId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.shipProductionJob.findMany({
      where: { planetId, status: JobStatus.PENDING, finishesAt: { lte: now } },
    });
    await withConcurrencyLimit(due, this.SWEEP_CONCURRENCY, (job) =>
      this.finalizeShipProduction(job.id, now),
    );
  }

  /** Balayage de récupération au démarrage : finalise tout job échu. */
  async sweepAllDue(now = new Date()): Promise<void> {
    const [c, r, col, ships] = await Promise.all([
      this.prisma.constructionJob.findMany({
        where: { status: JobStatus.PENDING, finishesAt: { lte: now } },
      }),
      this.prisma.researchJob.findMany({
        where: { status: JobStatus.PENDING, finishesAt: { lte: now } },
      }),
      this.prisma.colonizationJob.findMany({
        where: { status: JobStatus.PENDING, finishesAt: { lte: now } },
      }),
      this.prisma.shipProductionJob.findMany({
        where: { status: JobStatus.PENDING, finishesAt: { lte: now } },
      }),
    ]);
    await Promise.all([
      withConcurrencyLimit(c, this.SWEEP_CONCURRENCY, (job) =>
        this.finalizeConstruction(job.id, now),
      ),
      withConcurrencyLimit(r, this.SWEEP_CONCURRENCY, (job) => this.finalizeResearch(job.id, now)),
      withConcurrencyLimit(col, this.SWEEP_CONCURRENCY, (job) =>
        this.finalizeColonization(job.id, now),
      ),
      withConcurrencyLimit(ships, this.SWEEP_CONCURRENCY, (job) =>
        this.finalizeShipProduction(job.id, now),
      ),
    ]);
    if (c.length + r.length + col.length + ships.length > 0) {
      this.logger.log(
        `Balayage : ${c.length} construction(s), ${r.length} recherche(s), ${col.length} essaimage(s), ${ships.length} production(s) finalisé(s).`,
      );
    }
  }

  async finalizeDueTransfersForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.resourceTransferMission.findMany({
      where: { userId, phase: TransferPhase.OUTBOUND, arrivesAt: { lte: now } },
    });
    await withConcurrencyLimit(due, this.SWEEP_CONCURRENCY, (m) =>
      this.finalizeTransferById(m.id, now),
    );
  }

  async finalizeTransferById(missionId: string, now = new Date()): Promise<void> {
    const mission = await this.prisma.resourceTransferMission.findUnique({
      where: { id: missionId },
    });
    if (!mission || mission.phase !== TransferPhase.OUTBOUND || mission.arrivesAt > now) return;

    const resources = mission.resources as Record<string, number>;
    const ships = mission.ships as Record<string, number>;
    const itemCargo = mission.itemCargo as Record<string, number>;

    await this.prisma.$transaction(async (tx) => {
      await tx.planet.update({
        where: { id: mission.targetPlanetId },
        data: {
          biomass: { increment: resources['BIOMASS'] ?? 0 },
          sap: { increment: resources['SAP'] ?? 0 },
          minerals: { increment: resources['MINERALS'] ?? 0 },
          spores: { increment: resources['SPORES'] ?? 0 },
        },
      });
      for (const [type, qty] of Object.entries(ships)) {
        await tx.planetShip.upsert({
          where: { planetId_type: { planetId: mission.targetPlanetId, type: type as ShipType } },
          update: { quantity: { increment: qty } },
          create: { planetId: mission.targetPlanetId, type: type as ShipType, quantity: qty },
        });
      }
      for (const [itemKey, qty] of Object.entries(itemCargo)) {
        if (qty <= 0) continue;
        await tx.playerInventorySlot.upsert({
          where: {
            userId_planetId_itemKey: {
              userId: mission.userId,
              planetId: mission.targetPlanetId,
              itemKey: itemKey as PrismaItemKey,
            },
          },
          update: { quantity: { increment: qty } },
          create: {
            userId: mission.userId,
            planetId: mission.targetPlanetId,
            itemKey: itemKey as PrismaItemKey,
            quantity: qty,
          },
        });
      }
      await tx.resourceTransferMission.update({
        where: { id: missionId },
        data: { phase: TransferPhase.COMPLETED, completedAt: now },
      });
    });
  }
}
