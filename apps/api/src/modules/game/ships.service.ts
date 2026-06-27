import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import {
  BuildingType,
  canAfford,
  RaceType,
  SHIPS,
  SHIP_TYPES,
  shipCost,
  shipProductionTimeSeconds,
  type FleetOverview,
  type ProduceShipsDto,
  type ShipProductionJobView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameQueueService } from '../queue/game-queue.service';
import { FinalizationService } from './finalization.service';
import { GameEngineService } from './game-engine.service';
import { PlanetsService } from './planets.service';
import { EngagementHookService } from './engagement-hook.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ShipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly finalization: FinalizationService,
    private readonly queue: GameQueueService,
    private readonly dailyQuests: EngagementHookService,
    private readonly events: EventsGateway,
  ) {}

  async overview(userId: string, planetId: string): Promise<FleetOverview> {
    await this.planets.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueShipProduction(planetId);
    const [settled, user] = await Promise.all([
      this.engine.settlePlanet(planetId),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    const [inventory, job] = await Promise.all([
      this.prisma.planetShip.findMany({ where: { planetId } }),
      this.prisma.shipProductionJob.findFirst({
        where: { planetId, status: JobStatus.PENDING },
        orderBy: { finishesAt: 'asc' },
      }),
    ]);
    const nursery = settled.buildings[BuildingType.ORBITAL_NURSERY] ?? 0;
    const race = user.race as RaceType;
    const amounts = this.engine.buildResourceState(settled).amounts;
    return {
      ships: SHIP_TYPES.map((type) => {
        const cfg = SHIPS[type];
        const raceLocked = cfg.restrictedToRaces && !cfg.restrictedToRaces.includes(race);
        return {
          type,
          name: cfg.name,
          description: cfg.description,
          role: cfg.role,
          available: inventory.find((item) => item.type === type)?.quantity ?? 0,
          cost: cfg.cost,
          productionTimeSeconds: shipProductionTimeSeconds(type, 1, nursery),
          cargo: cfg.cargo,
          speed: cfg.speed,
          requiredNurseryLevel: cfg.requiresNurseryLevel,
          unlocked: !raceLocked && nursery >= cfg.requiresNurseryLevel,
          canAfford: canAfford(amounts, cfg.cost),
        };
      }),
      productionJob: job ? this.jobView(job) : null,
    };
  }

  async produce(userId: string, dto: ProduceShipsDto): Promise<ShipProductionJobView> {
    await this.planets.assertOwnership(userId, dto.planetId);
    await this.finalization.finalizeDueShipProduction(dto.planetId);
    let job;
    try {
      job = await this.prisma.optimistic(async (tx) => {
        const pending = await tx.shipProductionJob.findFirst({
          where: { planetId: dto.planetId, status: JobStatus.PENDING },
        });
        if (pending) throw new ConflictException('Une production est déjà en cours.');

        const settled = await this.engine.settlePlanet(dto.planetId, new Date(), tx);
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const race = user.race as RaceType;
        const nursery = settled.buildings[BuildingType.ORBITAL_NURSERY] ?? 0;
        const cfg = SHIPS[dto.type];
        if (cfg.restrictedToRaces && !cfg.restrictedToRaces.includes(race)) {
          throw new BadRequestException('Ce vaisseau est exclusif à une autre race.');
        }
        if (nursery < cfg.requiresNurseryLevel) {
          throw new BadRequestException('Niveau de Berceau Orbital insuffisant.');
        }
        const cost = shipCost(dto.type, dto.quantity);
        if (!canAfford(this.engine.buildResourceState(settled).amounts, cost)) {
          throw new BadRequestException('Ressources insuffisantes.');
        }
        const now = new Date();
        const finishesAt = new Date(
          now.getTime() + shipProductionTimeSeconds(dto.type, dto.quantity, nursery) * 1_000,
        );
        await this.engine.spend(dto.planetId, cost, tx, settled.planet.version);
        return tx.shipProductionJob.create({
          data: {
            planetId: dto.planetId,
            shipType: dto.type,
            quantity: dto.quantity,
            startedAt: now,
            finishesAt,
          },
        });
      });
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new ConflictException('Une production est déjà en cours.');
      throw error;
    }
    await this.queue.scheduleShipProduction(job.id, job.finishesAt);
    await this.dailyQuests.onShipsProduced(userId, dto.quantity).catch(() => void 0);
    this.events.emitToUser(userId, 'planet:updated', { planetId: dto.planetId });
    return this.jobView(job);
  }

  private jobView(job: {
    id: string;
    shipType: string;
    quantity: number;
    startedAt: Date;
    finishesAt: Date;
  }): ShipProductionJobView {
    const shipType = job.shipType as ProduceShipsDto['type'];
    return {
      id: job.id,
      kind: 'SHIP_PRODUCTION' as ShipProductionJobView['kind'],
      targetType: shipType,
      targetLevel: null,
      shipType,
      quantity: job.quantity,
      startedAt: job.startedAt.toISOString(),
      finishesAt: job.finishesAt.toISOString(),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
