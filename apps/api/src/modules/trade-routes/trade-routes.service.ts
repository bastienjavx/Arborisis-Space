import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  type CreateTradeRouteDto,
  type TradeRouteView,
  TradeRouteStatus,
  ResourceType,
  SHIPS,
  ShipType,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlanetsService } from '../game/planets.service';
import { GameEngineService } from '../game/game-engine.service';
import { TransferService } from '../game/transfer.service';
import { TRADE_ROUTE_QUEUE, RUN_TRADE_ROUTE_JOB } from '../queue/queue.constants';

@Injectable()
export class TradeRoutesService {
  private readonly logger = new Logger(TradeRoutesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planets: PlanetsService,
    private readonly engine: GameEngineService,
    private readonly transfer: TransferService,
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
      throw new BadRequestException('La planète source et la destination doivent être différentes.');
    }

    await this.planets.assertOwnership(userId, dto.fromPlanetId);
    await this.planets.assertOwnership(userId, dto.toPlanetId);

    const shipConfig = SHIPS[dto.shipType];
    if (!shipConfig || shipConfig.cargo === 0) {
      throw new BadRequestException('Ce type de vaisseau ne peut pas transporter de cargaison.');
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

  async updateStatus(userId: string, routeId: string, status: TradeRouteStatus): Promise<TradeRouteView> {
    const route = await this.prisma.tradeRoute.findUnique({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route introuvable.');
    if (route.userId !== userId) throw new BadRequestException('Cette route ne vous appartient pas.');

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
    if (route.userId !== userId) throw new BadRequestException('Cette route ne vous appartient pas.');
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
        await this.transfer.launch(route.userId, {
          sourcePlanetId: route.fromPlanetId,
          targetPlanetId: route.toPlanetId,
          ships: { [route.shipType]: route.shipCount } as any,
          resources: { [route.resource]: qty } as any,
        });
      }
    } else if (route.itemKey) {
      // Objet d'inventaire
      const slot = await this.prisma.playerInventorySlot.findUnique({
        where: {
          userId_planetId_itemKey: {
            userId: route.userId,
            planetId: route.fromPlanetId,
            itemKey: route.itemKey,
          },
        },
      });
      const available = slot?.quantity ?? 0;
      const qty = Math.min(route.quantityPerRun, available, totalCargo);

      if (qty <= 0) {
        this.logger.warn(`Route ${routeId} : objets insuffisants, skip.`);
      } else {
        await this.prisma.$transaction(async (tx) => {
          await tx.playerInventorySlot.update({
            where: {
              userId_planetId_itemKey: {
                userId: route.userId,
                planetId: route.fromPlanetId,
                itemKey: route.itemKey!,
              },
            },
            data: { quantity: { decrement: qty } },
          });
          await tx.playerInventorySlot.upsert({
            where: {
              userId_planetId_itemKey: {
                userId: route.userId,
                planetId: route.toPlanetId,
                itemKey: route.itemKey!,
              },
            },
            update: { quantity: { increment: qty } },
            create: {
              userId: route.userId,
              planetId: route.toPlanetId,
              itemKey: route.itemKey!,
              quantity: qty,
            },
          });
        });
      }
    }

    const nextRunAt = new Date(now.getTime() + route.intervalHours * 3_600_000);
    await this.prisma.tradeRoute.update({
      where: { id: routeId },
      data: { lastRunAt: now, nextRunAt },
    });
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

  private toView(
    route: {
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
      status: TradeRouteStatus;
      lastRunAt: Date | null;
      nextRunAt: Date | null;
    },
  ): TradeRouteView {
    return {
      id: route.id,
      fromPlanetId: route.fromPlanetId,
      fromPlanetName: route.fromPlanet.name,
      toPlanetId: route.toPlanetId,
      toPlanetName: route.toPlanet.name,
      itemKey: route.itemKey as any,
      resource: route.resource as ResourceType | null,
      quantityPerRun: route.quantityPerRun,
      shipType: route.shipType as ShipType,
      shipCount: route.shipCount,
      intervalHours: route.intervalHours,
      status: route.status,
      lastRunAt: route.lastRunAt?.toISOString() ?? null,
      nextRunAt: route.nextRunAt?.toISOString() ?? null,
    };
  }
}
