import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ItemKey as PrismaItemKey } from '@prisma/client';
import {
  type CreateTradeRouteDto,
  ItemKey,
  type TradeRouteView,
  TradeRouteStatus,
  ResourceType,
  SHIPS,
  ShipType,
  TRANSPORT_SHIP_TYPES,
  fleetCargoCapacity,
  pveTravelTimeSeconds,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlanetsService } from '../game/planets.service';
import { GameEngineService } from '../game/game-engine.service';
import { TransferService } from '../game/transfer.service';
import { GameQueueService } from '../queue/game-queue.service';
import { TRADE_ROUTE_QUEUE, RUN_TRADE_ROUTE_JOB } from '../queue/queue.constants';

@Injectable()
export class TradeRoutesService {
  private readonly logger = new Logger(TradeRoutesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planets: PlanetsService,
    private readonly engine: GameEngineService,
    private readonly transfer: TransferService,
    private readonly gameQueue: GameQueueService,
    @InjectQueue(TRADE_ROUTE_QUEUE) private readonly routeQueue: Queue,
  ) {}

  async getRoutes(userId: string): Promise<TradeRouteView[]> {
    const routes = await this.prisma.tradeRoute.findMany({
      where: { userId },
      include: {
        fromPlanet: { select: { name: true } },
        toPlanet: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return routes.map((r) => this.toView(r));
  }

  async createRoute(userId: string, dto: CreateTradeRouteDto): Promise<TradeRouteView> {
    if (dto.fromPlanetId === dto.toPlanetId) {
      throw new BadRequestException(
        'La planète source et la destination doivent être différentes.',
      );
    }

    await this.planets.assertOwnership(userId, dto.fromPlanetId);
    await this.planets.assertOwnership(userId, dto.toPlanetId);

    if (!TRANSPORT_SHIP_TYPES.includes(dto.shipType as (typeof TRANSPORT_SHIP_TYPES)[number])) {
      throw new BadRequestException('Ce type de vaisseau ne peut pas transporter de cargaison.');
    }
    const shipSlot = await this.prisma.planetShip.findUnique({
      where: { planetId_type: { planetId: dto.fromPlanetId, type: dto.shipType } },
    });
    if ((shipSlot?.quantity ?? 0) < dto.shipCount) {
      throw new BadRequestException('Vaisseaux de transport disponibles insuffisants.');
    }

    const nextRunAt = new Date(Date.now() + dto.intervalHours * 3_600_000);

    const route = await this.prisma.tradeRoute.create({
      data: {
        userId,
        fromPlanetId: dto.fromPlanetId,
        toPlanetId: dto.toPlanetId,
        itemKey: dto.itemKey ?? null,
        resource: dto.resource ?? null,
        quantityPerRun: dto.quantityPerRun,
        shipType: dto.shipType,
        shipCount: dto.shipCount,
        intervalHours: dto.intervalHours,
        nextRunAt,
      },
      include: {
        fromPlanet: { select: { name: true } },
        toPlanet: { select: { name: true } },
      },
    });

    await this.scheduleRoute(route.id, nextRunAt);
    return this.toView(route);
  }

  async updateStatus(
    userId: string,
    routeId: string,
    status: TradeRouteStatus,
  ): Promise<TradeRouteView> {
    const route = await this.prisma.tradeRoute.findUnique({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route introuvable.');
    if (route.userId !== userId)
      throw new BadRequestException('Cette route ne vous appartient pas.');

    const updated = await this.prisma.tradeRoute.update({
      where: { id: routeId },
      data: { status },
      include: {
        fromPlanet: { select: { name: true } },
        toPlanet: { select: { name: true } },
      },
    });

    if (status === TradeRouteStatus.ACTIVE && !route.nextRunAt) {
      const next = new Date(Date.now() + route.intervalHours * 3_600_000);
      await this.prisma.tradeRoute.update({ where: { id: routeId }, data: { nextRunAt: next } });
      await this.scheduleRoute(routeId, next);
    }

    return this.toView(updated);
  }

  async deleteRoute(userId: string, routeId: string): Promise<void> {
    const route = await this.prisma.tradeRoute.findUnique({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route introuvable.');
    if (route.userId !== userId)
      throw new BadRequestException('Cette route ne vous appartient pas.');
    if (route.nextRunAt) {
      await this.gameQueue.removeTradeRouteJob(routeId, route.nextRunAt).catch(() => void 0);
    }
    await this.prisma.tradeRoute.delete({ where: { id: routeId } });
  }

  async runRoute(routeId: string, now = new Date()): Promise<void> {
    const route = await this.prisma.tradeRoute.findUnique({
      where: { id: routeId },
      include: { fromPlanet: true, toPlanet: true },
    });

    if (!route || route.status !== TradeRouteStatus.ACTIVE) return;
    if (route.nextRunAt && route.nextRunAt > now) return;

    const shipConfig = SHIPS[route.shipType as ShipType];
    const totalCargo = shipConfig.cargo * route.shipCount;
    const nextRunAt = new Date(now.getTime() + route.intervalHours * 3_600_000);

    const claimed = await this.prisma.tradeRoute.updateMany({
      where: {
        id: routeId,
        status: TradeRouteStatus.ACTIVE,
        nextRunAt: route.nextRunAt ? { lte: now } : null,
      },
      data: { lastRunAt: now, nextRunAt },
    });
    if (claimed.count !== 1) return;

    if (route.resource) {
      // Ressource de base
      const settled = await this.engine.settlePlanet(route.fromPlanetId);
      const p = settled.planet;
      const resourceMap: Record<string, number> = {
        BIOMASS: p.biomass,
        SAP: p.sap,
        MINERALS: p.minerals,
        SPORES: p.spores,
      };
      const available = resourceMap[route.resource] ?? 0;
      const qty = Math.min(route.quantityPerRun, available, totalCargo);

      if (qty <= 0) {
        this.logger.warn(`Route ${routeId} : ressources insuffisantes, skip.`);
      } else {
        try {
          const ships = {
            [ShipType.SYMBIOTIC_HARVESTER]: 0,
            [ShipType.CHITIN_FREIGHTER]: 0,
            [ShipType.SEED_POD]: 0,
            [route.shipType]: route.shipCount,
          };
          const resources = {
            [ResourceType.BIOMASS]: 0,
            [ResourceType.SAP]: 0,
            [ResourceType.MINERALS]: 0,
            [ResourceType.SPORES]: 0,
            [route.resource]: qty,
          };
          await this.transfer.launch(route.userId, {
            sourcePlanetId: route.fromPlanetId,
            targetPlanetId: route.toPlanetId,
            ships,
            resources,
          });
        } catch (error) {
          if (
            error instanceof BadRequestException &&
            error.message.includes('Vaisseaux de transport')
          ) {
            await this.prisma.tradeRoute.update({
              where: { id: routeId },
              data: { status: TradeRouteStatus.INSUFFICIENT_SHIPS, nextRunAt: null },
            });
            this.logger.warn(`Route ${routeId} mise en pause : vaisseaux insuffisants.`);
            return;
          } else if (error instanceof BadRequestException) {
            this.logger.warn(`Route ${routeId} : transfert impossible, skip.`);
            await this.scheduleRoute(routeId, nextRunAt);
            return;
          }
          throw error;
        }
      }
    } else if (route.itemKey) {
      const itemKey = route.itemKey as PrismaItemKey;
      const transportShips = { [route.shipType as ShipType]: route.shipCount };
      const cargo = fleetCargoCapacity(transportShips);
      const qty = Math.min(route.quantityPerRun, totalCargo, cargo);

      if (qty <= 0) {
        this.logger.warn(`Route ${routeId} : capacité insuffisante, skip.`);
      } else {
        const arrivesAt = new Date(
          Date.now() +
            pveTravelTimeSeconds(
              { galaxy: route.fromPlanet.galaxy, system: route.fromPlanet.system },
              {
                galaxy: route.toPlanet.galaxy,
                system: route.toPlanet.system,
                position: route.toPlanet.position,
              },
              transportShips,
            ) *
              1000,
        );

        const mission = await this.prisma.serializable(async (tx) => {
          const shipDebit = await tx.planetShip.updateMany({
            where: {
              planetId: route.fromPlanetId,
              type: route.shipType as ShipType,
              quantity: { gte: route.shipCount },
            },
            data: { quantity: { decrement: route.shipCount } },
          });
          if (shipDebit.count !== 1) {
            await tx.tradeRoute.update({
              where: { id: routeId },
              data: { status: TradeRouteStatus.INSUFFICIENT_SHIPS, nextRunAt: null },
            });
            return null;
          }

          const itemDebit = await tx.playerInventorySlot.updateMany({
            where: {
              userId: route.userId,
              planetId: route.fromPlanetId,
              itemKey,
              quantity: { gte: qty },
            },
            data: { quantity: { decrement: qty } },
          });
          if (itemDebit.count !== 1) {
            await tx.planetShip.updateMany({
              where: { planetId: route.fromPlanetId, type: route.shipType as ShipType },
              data: { quantity: { increment: route.shipCount } },
            });
            return null;
          }

          return tx.resourceTransferMission.create({
            data: {
              userId: route.userId,
              sourcePlanetId: route.fromPlanetId,
              targetPlanetId: route.toPlanetId,
              ships: transportShips,
              resources: {},
              itemCargo: { [itemKey]: qty },
              arrivesAt,
            },
          });
        });

        if (mission) {
          await this.gameQueue.scheduleTransfer(mission.id, arrivesAt);
        } else {
          this.logger.warn(`Route ${routeId} : objets ou vaisseaux insuffisants, skip.`);
        }
      }
    }

    await this.scheduleRoute(routeId, nextRunAt);
  }

  async sweepDueRoutes(now = new Date()): Promise<void> {
    const due = await this.prisma.tradeRoute.findMany({
      where: { status: TradeRouteStatus.ACTIVE, nextRunAt: { lte: now } },
    });
    for (const r of due) await this.runRoute(r.id, now).catch((err) => this.logger.error(err));
    if (due.length) this.logger.log(`Routes commerciales : ${due.length} exécutée(s).`);
  }

  private async scheduleRoute(routeId: string, runAt: Date): Promise<void> {
    const delay = Math.max(0, runAt.getTime() - Date.now());
    await this.routeQueue.add(
      RUN_TRADE_ROUTE_JOB,
      { routeId },
      {
        jobId: `route-${routeId}-${runAt.getTime()}`,
        delay,
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 10_000 },
      },
    );
  }

  private toView(route: {
    id: string;
    fromPlanetId: string;
    fromPlanet: { name: string };
    toPlanetId: string;
    toPlanet: { name: string };
    itemKey: string | null;
    resource: string | null;
    quantityPerRun: number;
    shipType: string;
    shipCount: number;
    intervalHours: number;
    status: string;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
  }): TradeRouteView {
    return {
      id: route.id,
      fromPlanetId: route.fromPlanetId,
      fromPlanetName: route.fromPlanet.name,
      toPlanetId: route.toPlanetId,
      toPlanetName: route.toPlanet.name,
      itemKey: route.itemKey as ItemKey | null,
      resource: route.resource as ResourceType | null,
      quantityPerRun: route.quantityPerRun,
      shipType: route.shipType as ShipType,
      shipCount: route.shipCount,
      intervalHours: route.intervalHours,
      status: route.status as TradeRouteStatus,
      lastRunAt: route.lastRunAt?.toISOString() ?? null,
      nextRunAt: route.nextRunAt?.toISOString() ?? null,
    };
  }
}
