import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFENSES,
  DefenseType,
  type OrbitalDefenseView,
  type PlanetDefensesView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
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
    return this.getDefensesView(planetId, {});
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

    const totalCost = {
      BIOMASS: (config.cost.BIOMASS ?? 0) * quantity,
      SAP: (config.cost.SAP ?? 0) * quantity,
      MINERALS: (config.cost.MINERALS ?? 0) * quantity,
      SPORES: (config.cost.SPORES ?? 0) * quantity,
    };

    for (const [res, cost] of Object.entries(totalCost)) {
      if ((amounts[res as keyof typeof amounts] ?? 0) < cost) {
        throw new BadRequestException(
          `Ressources insuffisantes pour ${quantity} ${config.name} : ${res}`,
        );
      }
    }

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
        where: { planetId_defenseType: { planetId, defenseType: defenseType as any } },
        update: { quantity: { increment: quantity } },
        create: { planetId, defenseType: defenseType as any, quantity },
      }),
    ]);

    return this.getDefensesView(planetId, amounts);
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
        const row = await this.prisma.orbitalDefense.findUnique({
          where: { planetId_defenseType: { planetId, defenseType: type as any } },
        });
        if (!row) return;
        const newQty = Math.max(0, row.quantity - lost);
        await this.prisma.orbitalDefense.update({
          where: { planetId_defenseType: { planetId, defenseType: type as any } },
          data: { quantity: newQty },
        });
      }),
    );
  }

  private async getDefensesView(
    planetId: string,
    amounts: Record<string, number>,
  ): Promise<PlanetDefensesView> {
    const rows = await this.prisma.orbitalDefense.findMany({ where: { planetId } });
    let totalAttack = 0;
    let totalDefense = 0;

    const defenses: OrbitalDefenseView[] = Object.values(DefenseType).map((type) => {
      const row = rows.find((r) => r.defenseType === (type as any));
      const config = DEFENSES[type];
      const quantity = row?.quantity ?? 0;
      totalAttack += config.attack * quantity;
      totalDefense += config.defense * quantity;

      const canAfford = Object.entries(config.cost).every(
        ([res, cost]) => (amounts[res] ?? 0) >= (cost ?? 0),
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
        canAfford,
        unmet: [],
      };
    });

    return { defenses, totalAttack, totalDefense, isBuilding: false };
  }
}
