import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BondPositionStatus as PrismaBondPositionStatus, Prisma } from '@prisma/client';
import {
  BondPositionStatus,
  NPC_BOND_OFFERINGS,
  RESOURCE_MARKET_CONFIG,
  ResourceType,
  type BondOfferingView,
  type ClaimBondDto,
  type PlayerBondPositionView,
  type SubscribeBondDto,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';
import { EventsGateway } from '../events/events.gateway';
import { ResourceMarketService } from './resource-market.service';

@Injectable()
export class BondService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly resourceMarket: ResourceMarketService,
    private readonly events: EventsGateway,
  ) {}

  async getOfferings(universeId: string): Promise<BondOfferingView[]> {
    return Promise.all(
      NPC_BOND_OFFERINGS.map(async (offering) => ({
        id: offering.id,
        name: offering.name,
        resource: offering.resource,
        durationHours: offering.durationHours,
        minPrincipal: offering.minPrincipal,
        maxPrincipal: offering.maxPrincipal,
        currentYieldRate: await this.currentYieldRate(universeId, offering.id),
      })),
    );
  }

  async getMyPositions(userId: string, universeId: string): Promise<PlayerBondPositionView[]> {
    const positions = await this.prisma.playerBondPosition.findMany({
      where: { userId, universeId },
      orderBy: { subscribedAt: 'desc' },
      take: 200,
    });
    const planetIds = [...new Set(positions.map((position) => position.sourcePlanetId))];
    const planets = await this.prisma.planet.findMany({
      where: { id: { in: planetIds } },
      select: { id: true, name: true },
    });
    const planetNames = new Map(planets.map((planet) => [planet.id, planet.name]));
    return positions.map((position) =>
      this.toPositionView(position, planetNames.get(position.sourcePlanetId) ?? null),
    );
  }

  async subscribe(
    userId: string,
    universeId: string,
    dto: SubscribeBondDto,
  ): Promise<PlayerBondPositionView> {
    const offering = NPC_BOND_OFFERINGS.find((candidate) => candidate.id === dto.offeringId);
    if (!offering) throw new BadRequestException('Offre d’obligation inconnue.');
    if (dto.principal < offering.minPrincipal || dto.principal > offering.maxPrincipal) {
      throw new BadRequestException(
        `Principal hors limites : ${offering.minPrincipal} à ${offering.maxPrincipal}.`,
      );
    }

    const planet = await this.planets.assertOwnership(userId, dto.sourcePlanetId);
    const yieldRate = await this.currentYieldRate(universeId, offering.id);
    const payoutAmount = dto.principal + Math.floor(dto.principal * yieldRate);
    const maturesAt = new Date(Date.now() + offering.durationHours * 3_600_000);

    const position = await this.prisma.optimistic(async (tx) => {
      const settled = await this.engine.settlePlanet(planet.id, new Date(), tx);
      const available = this.resourceAmount(settled.planet, offering.resource);
      if (available < dto.principal) {
        throw new BadRequestException(
          `${this.resourceName(offering.resource)} insuffisante. Requise : ${dto.principal}, disponible : ${Math.floor(available)}.`,
        );
      }
      await tx.planet.update({
        where: { id: planet.id, version: settled.planet.version },
        data: {
          ...this.resourceDelta(offering.resource, -dto.principal),
          version: { increment: 1 },
        },
      });
      return tx.playerBondPosition.create({
        data: {
          universeId,
          userId,
          offeringId: offering.id,
          resource: offering.resource,
          principal: dto.principal,
          yieldRate,
          payoutAmount,
          sourcePlanetId: planet.id,
          maturesAt,
        },
      });
    });

    this.events.emitToUser(userId, 'planet:updated', { planetId: planet.id });
    return this.toPositionView(position, planet.name);
  }

  async claim(
    userId: string,
    positionId: string,
    dto: ClaimBondDto,
  ): Promise<PlayerBondPositionView> {
    const position = await this.prisma.playerBondPosition.findUnique({ where: { id: positionId } });
    if (!position) throw new NotFoundException('Obligation introuvable.');
    if (position.userId !== userId)
      throw new BadRequestException('Cette obligation ne vous appartient pas.');
    if (position.status !== PrismaBondPositionStatus.ACTIVE) {
      throw new BadRequestException('Cette obligation a déjà été réclamée.');
    }
    if (position.maturesAt.getTime() > Date.now()) {
      throw new BadRequestException('Cette obligation n’est pas encore arrivée à maturité.');
    }

    const targetPlanet = dto.targetPlanetId
      ? await this.planets.assertOwnership(userId, dto.targetPlanetId)
      : await this.resolveDefaultClaimPlanet(userId, position.sourcePlanetId);

    const claimed = await this.prisma.optimistic(async (tx) => {
      const update = await tx.playerBondPosition.updateMany({
        where: { id: position.id, userId, status: PrismaBondPositionStatus.ACTIVE },
        data: { status: PrismaBondPositionStatus.CLAIMED, claimedAt: new Date() },
      });
      if (update.count !== 1) {
        throw new BadRequestException('Cette obligation a déjà été réclamée.');
      }
      const settled = await this.engine.settlePlanet(targetPlanet.id, new Date(), tx);
      await tx.planet.update({
        where: { id: targetPlanet.id, version: settled.planet.version },
        data: {
          ...this.resourceDelta(position.resource as ResourceType, position.payoutAmount),
          version: { increment: 1 },
        },
      });
      return tx.playerBondPosition.findUniqueOrThrow({ where: { id: position.id } });
    });

    this.events.emitToUser(userId, 'planet:updated', { planetId: targetPlanet.id });
    return this.toPositionView(claimed, targetPlanet.name);
  }

  private async currentYieldRate(universeId: string, offeringId: string): Promise<number> {
    const offering = NPC_BOND_OFFERINGS.find((candidate) => candidate.id === offeringId);
    if (!offering) throw new BadRequestException('Offre d’obligation inconnue.');
    const basePrice = RESOURCE_MARKET_CONFIG.baseValueBiomass[offering.resource];
    const reference =
      offering.resource === ResourceType.BIOMASS
        ? 1
        : await this.resourceMarket.fairPrice(universeId, offering.resource);
    const pressure = Math.abs(reference / basePrice - 1);
    return (
      Math.round(
        Math.min(0.25, offering.baseYieldRate * (1 + pressure * offering.pressureYieldMultiplier)) *
          10_000,
      ) / 10_000
    );
  }

  private async resolveDefaultClaimPlanet(userId: string, sourcePlanetId: string) {
    const source = await this.prisma.planet.findFirst({
      where: { id: sourcePlanetId, ownerId: userId },
      select: { id: true, name: true },
    });
    if (source) return source;
    const fallback = await this.prisma.planet.findFirst({
      where: { ownerId: userId },
      orderBy: [{ isHomeworld: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, name: true },
    });
    if (!fallback) throw new BadRequestException('Aucune planète disponible pour le paiement.');
    return fallback;
  }

  private resourceAmount(
    planet: { biomass: number; sap: number; minerals: number; spores: number },
    resource: ResourceType,
  ): number {
    if (resource === ResourceType.BIOMASS) return planet.biomass;
    if (resource === ResourceType.SAP) return planet.sap;
    if (resource === ResourceType.MINERALS) return planet.minerals;
    return planet.spores;
  }

  private resourceDelta(resource: ResourceType, amount: number): Prisma.PlanetUpdateInput {
    const op = amount >= 0 ? { increment: amount } : { decrement: Math.abs(amount) };
    if (resource === ResourceType.BIOMASS) return { biomass: op };
    if (resource === ResourceType.SAP) return { sap: op };
    if (resource === ResourceType.MINERALS) return { minerals: op };
    return { spores: op };
  }

  private resourceName(resource: ResourceType): string {
    return resource === ResourceType.BIOMASS
      ? 'Biomasse'
      : resource === ResourceType.SAP
        ? 'Sève'
        : resource === ResourceType.MINERALS
          ? 'Minéraux'
          : 'Spores';
  }

  private toPositionView(
    position: {
      id: string;
      offeringId: string;
      resource: string;
      principal: number;
      yieldRate: number;
      payoutAmount: number;
      status: string;
      sourcePlanetId: string;
      subscribedAt: Date;
      maturesAt: Date;
      claimedAt: Date | null;
    },
    sourcePlanetName: string | null,
  ): PlayerBondPositionView {
    const offering = NPC_BOND_OFFERINGS.find((candidate) => candidate.id === position.offeringId);
    return {
      id: position.id,
      offeringId: position.offeringId,
      offeringName: offering?.name ?? position.offeringId,
      resource: position.resource as ResourceType,
      principal: position.principal,
      yieldRate: position.yieldRate,
      payoutAmount: position.payoutAmount,
      status: position.status as BondPositionStatus,
      isMatured: position.maturesAt.getTime() <= Date.now(),
      sourcePlanetId: position.sourcePlanetId,
      sourcePlanetName,
      subscribedAt: position.subscribedAt.toISOString(),
      maturesAt: position.maturesAt.toISOString(),
      claimedAt: position.claimedAt?.toISOString() ?? null,
    };
  }
}
