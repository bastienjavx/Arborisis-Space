import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DefenseType as PrismaDefenseType } from '@prisma/client';
import {
  DEFENSES,
  ResourceType,
  DefenseType,
  type UnmetRequirement,
  type OrbitalDefenseView,
  type PlanetDefensesView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService, type SettledPlanet } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';

@Injectable()
export class DefensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
  ) {}

  async getDefenses(userId: string, planetId: string): Promise<PlanetDefensesView> {
    await this.planets.assertOwnership(userId, planetId);
    const settled = await this.engine.settlePlanet(planetId);
    const { amounts } = this.engine.buildResourceState(settled);
    return this.getDefensesView(planetId, settled, amounts);
  }

  async build(
    userId: string,
    planetId: string,
    defenseType: DefenseType,
    quantity: number,
  ): Promise<PlanetDefensesView> {
    if (quantity < 1 || !Number.isInteger(quantity)) {
      throw new BadRequestException('La quantité doit être un entier positif.');
    }
    if (quantity > 10_000) {
      throw new BadRequestException('Maximum 10 000 unités par construction.');
    }

    const config = DEFENSES[defenseType];
    if (!config) throw new NotFoundException('Type de défense invalide.');

    await this.planets.assertOwnership(userId, planetId);

    const settled = await this.engine.settlePlanet(planetId);
    const { amounts } = this.engine.buildResourceState(settled);
    const unmet = this.checkRequirements(config.requires, settled);
    if (unmet.length > 0) {
      throw new BadRequestException('Prérequis de défense non satisfaits.');
    }

    const totalCost: Record<ResourceType, number> = {
      [ResourceType.BIOMASS]: (config.cost[ResourceType.BIOMASS] ?? 0) * quantity,
      [ResourceType.SAP]: (config.cost[ResourceType.SAP] ?? 0) * quantity,
      [ResourceType.MINERALS]: (config.cost[ResourceType.MINERALS] ?? 0) * quantity,
      [ResourceType.SPORES]: (config.cost[ResourceType.SPORES] ?? 0) * quantity,
    };

    for (const [res, cost] of Object.entries(totalCost)) {
      if ((amounts[res as keyof typeof amounts] ?? 0) < cost) {
        throw new BadRequestException(
          `Ressources insuffisantes pour ${quantity} ${config.name} : ${res}`,
        );
      }
    }

    const prismaDefenseType = defenseType as unknown as PrismaDefenseType;

    await this.prisma.$transaction([
      this.prisma.planet.update({
        where: { id: planetId },
        data: {
          biomass: { decrement: totalCost.BIOMASS },
          sap: { decrement: totalCost.SAP },
          minerals: { decrement: totalCost.MINERALS },
          spores: { decrement: totalCost.SPORES },
        },
      }),
      this.prisma.orbitalDefense.upsert({
        where: { planetId_defenseType: { planetId, defenseType: prismaDefenseType } },
        update: { quantity: { increment: quantity } },
        create: { planetId, defenseType: prismaDefenseType, quantity },
      }),
    ]);

    const updatedSettled = await this.engine.settlePlanet(planetId);
    const updatedResources = this.engine.buildResourceState(updatedSettled);
    return this.getDefensesView(planetId, updatedSettled, updatedResources.amounts);
  }

  /** Récupère les défenses d'une planète pour le calcul de combat (pas de vérification d'ownership). */
  async getDefensesForCombat(
    planetId: string,
  ): Promise<
    { type: DefenseType; quantity: number; attack: number; defense: number; hull: number }[]
  > {
    const rows = await this.prisma.orbitalDefense.findMany({
      where: { planetId, quantity: { gt: 0 } },
    });
    return rows.map((r) => {
      const config = DEFENSES[r.defenseType as DefenseType];
      return {
        type: r.defenseType as DefenseType,
        quantity: r.quantity,
        attack: config.attack,
        defense: config.defense,
        hull: config.hull,
      };
    });
  }

  /** Soustrait des défenses après combat. */
  async applyLosses(planetId: string, losses: Partial<Record<DefenseType, number>>): Promise<void> {
    await Promise.all(
      Object.entries(losses).map(async ([type, lost]) => {
        if (!lost || lost <= 0) return;
        const defenseType = type as unknown as PrismaDefenseType;
        const row = await this.prisma.orbitalDefense.findUnique({
          where: { planetId_defenseType: { planetId, defenseType } },
        });
        if (!row) return;
        const newQty = Math.max(0, row.quantity - lost);
        await this.prisma.orbitalDefense.update({
          where: { planetId_defenseType: { planetId, defenseType } },
          data: { quantity: newQty },
        });
      }),
    );
  }

  private async getDefensesView(
    planetId: string,
    settled: SettledPlanet,
    amounts: Record<ResourceType, number>,
  ): Promise<PlanetDefensesView> {
    const rows = await this.prisma.orbitalDefense.findMany({ where: { planetId } });
    let totalAttack = 0;
    let totalDefense = 0;

    const defenses: OrbitalDefenseView[] = Object.values(DefenseType).map((type) => {
      const row = rows.find((r) => r.defenseType === (type as unknown as PrismaDefenseType));
      const config = DEFENSES[type];
      const quantity = row?.quantity ?? 0;
      totalAttack += config.attack * quantity;
      totalDefense += config.defense * quantity;
      const unmet = this.checkRequirements(config.requires, settled);

      const canAfford = Object.entries(config.cost).every(
        ([res, cost]) => (amounts[res as ResourceType] ?? 0) >= (cost ?? 0),
      );

      return {
        type,
        name: config.name,
        description: config.description,
        quantity,
        attack: config.attack,
        defense: config.defense,
        hull: config.hull,
        cost: config.cost,
        buildTimeSeconds: config.buildTimeSeconds,
        canAfford: unmet.length === 0 && canAfford,
        unmet,
      };
    });

    return { defenses, totalAttack, totalDefense, isBuilding: false };
  }

  private checkRequirements(
    requires: (typeof DEFENSES)[DefenseType]['requires'],
    settled: SettledPlanet,
  ): UnmetRequirement[] {
    const unmet: UnmetRequirement[] = [];
    if (!requires) return unmet;

    for (const [type, requiredLevel] of Object.entries(requires.buildings ?? {})) {
      const currentLevel = settled.buildings[type as keyof typeof settled.buildings] ?? 0;
      if (currentLevel < requiredLevel) {
        unmet.push({
          kind: 'building',
          type: type as UnmetRequirement['type'],
          requiredLevel,
          currentLevel,
        });
      }
    }

    for (const [type, requiredLevel] of Object.entries(requires.research ?? {})) {
      const currentLevel = settled.research[type as keyof typeof settled.research] ?? 0;
      if (currentLevel < requiredLevel) {
        unmet.push({
          kind: 'research',
          type: type as UnmetRequirement['type'],
          requiredLevel,
          currentLevel,
        });
      }
    }

    return unmet;
  }
}
