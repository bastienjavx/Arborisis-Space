import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemKey as PrismaItemKey, TransferPhase } from '@prisma/client';
import {
  fleetCargoCapacity,
  pveTravelTimeSeconds,
  ResourceType,
  ShipType,
  TRANSPORT_SHIP_TYPES,
  type ResourceTransferMissionView,
  type TransferResourcesDto,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from './game-engine.service';
import { GameQueueService } from '../queue/game-queue.service';

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly queue: GameQueueService,
  ) {}

  async launch(userId: string, dto: TransferResourcesDto): Promise<ResourceTransferMissionView> {
    const { sourcePlanetId, targetPlanetId, ships, resources } = dto;

    if (sourcePlanetId === targetPlanetId)
      throw new BadRequestException('Source et destination identiques.');

    const [source, target] = await Promise.all([
      this.prisma.planet.findUnique({ where: { id: sourcePlanetId } }),
      this.prisma.planet.findUnique({ where: { id: targetPlanetId } }),
    ]);
    if (!source) throw new NotFoundException('Planète source introuvable.');
    if (!target) throw new NotFoundException('Planète destination introuvable.');
    if (source.ownerId !== userId) throw new ForbiddenException('Planète source non possédée.');
    if (target.ownerId !== userId)
      throw new ForbiddenException('Vous ne pouvez transférer que vers vos propres planètes.');

    const transportShips: Partial<Record<ShipType, number>> = {};
    for (const t of TRANSPORT_SHIP_TYPES) {
      const qty = (ships as Record<string, number>)[t] ?? 0;
      if (qty > 0) transportShips[t] = qty;
    }
    const cargo = fleetCargoCapacity(transportShips);
    const totalResources = Object.values(resources as Record<string, number>).reduce(
      (s, v) => s + v,
      0,
    );
    if (totalResources > cargo)
      throw new BadRequestException(
        `Capacité de cargaison insuffisante : ${cargo} < ${totalResources}.`,
      );

    const travelSec = pveTravelTimeSeconds(
      { galaxy: source.galaxy, system: source.system },
      { galaxy: target.galaxy, system: target.system, position: target.position },
      transportShips,
    );
    const arrivesAt = new Date(Date.now() + travelSec * 1000);

    // Toutes les vérifications (solde de ressources, vaisseaux disponibles) ET les
    // débits sont effectués dans une même transaction sérialisable : deux transferts
    // concurrents depuis la même planète ne peuvent plus passer le contrôle puis
    // débiter en parallèle (anti double-dépense / création de ressources).
    const mission = await this.prisma.serializable(async (tx) => {
      const settled = await this.engine.settlePlanet(sourcePlanetId, new Date(), tx);
      const amounts = {
        [ResourceType.BIOMASS]: settled.planet.biomass,
        [ResourceType.SAP]: settled.planet.sap,
        [ResourceType.MINERALS]: settled.planet.minerals,
        [ResourceType.SPORES]: settled.planet.spores,
      };
      for (const [res, qty] of Object.entries(resources as Record<string, number>)) {
        if (qty > (amounts[res as ResourceType] ?? 0))
          throw new BadRequestException(`Ressources insuffisantes : ${res}.`);
      }

      const inventory = await tx.planetShip.findMany({ where: { planetId: sourcePlanetId } });
      for (const [type, qty] of Object.entries(transportShips)) {
        const available = inventory.find((s) => s.type === (type as ShipType))?.quantity ?? 0;
        if ((qty as number) > available)
          throw new BadRequestException('Vaisseaux de transport disponibles insuffisants.');
      }

      await this.engine.spend(
        sourcePlanetId,
        resources as Partial<Record<ResourceType, number>>,
        tx,
      );
      for (const [type, qty] of Object.entries(transportShips)) {
        await tx.planetShip.updateMany({
          where: { planetId: sourcePlanetId, type: type as ShipType },
          data: { quantity: { decrement: qty as number } },
        });
      }
      return tx.resourceTransferMission.create({
        data: {
          userId,
          sourcePlanetId,
          targetPlanetId,
          ships: transportShips,
          resources,
          arrivesAt,
        },
      });
    });

    await this.queue.scheduleTransfer(mission.id, arrivesAt);

    return this.toView(mission, source.name, target.name);
  }

  async finalizeTransfer(missionId: string): Promise<void> {
    const mission = await this.prisma.resourceTransferMission.findUnique({
      where: { id: missionId },
      include: { sourcePlanet: true, targetPlanet: true },
    });
    if (!mission || mission.phase !== TransferPhase.OUTBOUND) return;
    if (mission.arrivesAt > new Date()) return;

    const resources = mission.resources as Record<string, number>;
    const ships = mission.ships as Record<string, number>;
    const itemCargo = mission.itemCargo as Record<string, number>;

    await this.prisma.$transaction(async (tx) => {
      await tx.planet.update({
        where: { id: mission.targetPlanetId },
        data: {
          biomass: { increment: resources[ResourceType.BIOMASS] ?? 0 },
          sap: { increment: resources[ResourceType.SAP] ?? 0 },
          minerals: { increment: resources[ResourceType.MINERALS] ?? 0 },
          spores: { increment: resources[ResourceType.SPORES] ?? 0 },
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
        data: { phase: TransferPhase.COMPLETED, completedAt: new Date() },
      });
    });
  }

  async listMissions(userId: string): Promise<ResourceTransferMissionView[]> {
    const missions = await this.prisma.resourceTransferMission.findMany({
      where: { userId, phase: TransferPhase.OUTBOUND },
      include: { sourcePlanet: true, targetPlanet: true },
      orderBy: { arrivesAt: 'asc' },
    });
    return missions.map((m) => this.toView(m, m.sourcePlanet.name, m.targetPlanet.name));
  }

  private toView(
    m: {
      id: string;
      sourcePlanetId: string;
      targetPlanetId: string;
      ships: unknown;
      resources: unknown;
      arrivesAt: Date;
    },
    sourceName: string,
    targetName: string,
  ): ResourceTransferMissionView {
    return {
      id: m.id,
      sourcePlanetId: m.sourcePlanetId,
      sourcePlanetName: sourceName,
      targetPlanetId: m.targetPlanetId,
      targetPlanetName: targetName,
      ships: m.ships as Record<ShipType, number>,
      resources: m.resources as Record<ResourceType, number>,
      arrivesAt: m.arrivesAt.toISOString(),
    };
  }
}
