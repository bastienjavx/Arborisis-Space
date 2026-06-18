import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import {
  BuildingType,
  canAfford,
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

@Injectable()
export class ShipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly finalization: FinalizationService,
    private readonly queue: GameQueueService,
  ) {}

  async overview(userId: string, planetId: string): Promise<FleetOverview> {
    await this.planets.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueShipProduction(planetId);
    const settled = await this.engine.settlePlanet(planetId);
    const [inventory, job] = await Promise.all([
      this.prisma.planetShip.findMany({ where: { planetId } }),
      this.prisma.shipProductionJob.findFirst({
        where: { planetId, status: JobStatus.PENDING },
        orderBy: { finishesAt: 'asc' },
      }),
    ]);
    const nursery = settled.buildings[BuildingType.ORBITAL_NURSERY] ?? 0;
    const amounts = this.engine.buildResourceState(settled).amounts;
    return {
      ships: SHIP_TYPES.map((type) => ({
        type,
        name: SHIPS[type].name,
        description: SHIPS[type].description,
        available: inventory.find((item) => item.type === type)?.quantity ?? 0,
        cost: SHIPS[type].cost,
        productionTimeSeconds: shipProductionTimeSeconds(type, 1, nursery),
        cargo: SHIPS[type].cargo,
        speed: SHIPS[type].speed,
        requiredNurseryLevel: SHIPS[type].requiresNurseryLevel,
        unlocked: nursery >= SHIPS[type].requiresNurseryLevel,
        canAfford: canAfford(amounts, SHIPS[type].cost),
      })),
      productionJob: job ? this.jobView(job) : null,
    };
  }

  async produce(userId: string, dto: ProduceShipsDto): Promise<ShipProductionJobView> {
    await this.planets.assertOwnership(userId, dto.planetId);
    await this.finalization.finalizeDueShipProduction(dto.planetId);
    let job;
    try {
      job = await this.prisma.serializable(async (tx) => {
        const pending = await tx.shipProductionJob.findFirst({
          where: { planetId: dto.planetId, status: JobStatus.PENDING },
        });
        if (pending) throw new ConflictException('Une production est déjà en cours.');

        const settled = await this.engine.settlePlanet(dto.planetId, new Date(), tx);
        const nursery = settled.buildings[BuildingType.ORBITAL_NURSERY] ?? 0;
        if (nursery < SHIPS[dto.type].requiresNurseryLevel) {
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
        await this.engine.spend(dto.planetId, cost, tx);
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
