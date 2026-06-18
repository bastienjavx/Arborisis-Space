import { Injectable } from '@nestjs/common';
import type { GalacticEvent, Planet, PlanetBuilding, Prisma, ResearchLevel } from '@prisma/client';
import {
  BASE_PLANET_FIELDS,
  BuildingType,
  computeProduction,
  computeStabilityDecay,
  FIELDS_PER_TERRAFORMATION,
  GalacticEventType,
  PlanetType,
  ProductionResult,
  ResearchType,
  ResourceType,
  STABILITY_MAX,
  STABILITY_MIN,
  STABILITY_SYMBIOSIS_BONUS,
  storageCap,
  type ResourceState,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface SettledPlanet {
  planet: Planet & { buildings: PlanetBuilding[] };
  buildings: Partial<Record<BuildingType, number>>;
  research: Partial<Record<ResearchType, number>>;
  production: ProductionResult;
}

/**
 * Cœur server-authoritative : recalcule les ressources d'une planète à partir
 * du temps écoulé depuis `lastResourceUpdate`. Aucune valeur cliente n'est
 * jamais utilisée — c'est l'unique source de vérité des stocks.
 */
@Injectable()
export class GameEngineService {
  constructor(private readonly prisma: PrismaService) {}

  buildingLevelsOf(buildings: PlanetBuilding[]): Partial<Record<BuildingType, number>> {
    const map: Partial<Record<BuildingType, number>> = {};
    for (const b of buildings) map[b.type] = b.level;
    return map;
  }

  researchLevelsOf(levels: ResearchLevel[]): Partial<Record<ResearchType, number>> {
    const map: Partial<Record<ResearchType, number>> = {};
    for (const r of levels) map[r.type] = r.level;
    return map;
  }

  private amountsOf(planet: Planet): Record<ResourceType, number> {
    return {
      [ResourceType.BIOMASS]: planet.biomass,
      [ResourceType.SAP]: planet.sap,
      [ResourceType.MINERALS]: planet.minerals,
      [ResourceType.SPORES]: planet.spores,
    };
  }

  /**
   * Applique la production accumulée et persiste les nouveaux stocks.
   * À appeler avant toute lecture/mutation pour garantir des données fiables.
   */
  async settlePlanet(
    planetId: string,
    now = new Date(),
    db?: Prisma.TransactionClient,
  ): Promise<SettledPlanet> {
    if (!db) {
      return this.prisma.serializable((tx) => this.settlePlanet(planetId, now, tx));
    }
    const planet = await db.planet.findUniqueOrThrow({
      where: { id: planetId },
      include: { buildings: true },
    });
    const researchLevels = await db.researchLevel.findMany({
      where: { userId: planet.ownerId },
    });

    const buildings = this.buildingLevelsOf(planet.buildings);
    const research = this.researchLevelsOf(researchLevels);

    // Check for active galactic events affecting production
    const activeEvent = await this.getActiveEvent(db);
    const production = computeProduction({
      buildings,
      research,
      stability: planet.stability,
      planetType: planet.planetType as PlanetType,
    });

    // Apply SPORE_BLOOM event: +50% production
    if (activeEvent?.type === GalacticEventType.SPORE_BLOOM) {
      for (const r of Object.values(ResourceType)) {
        production.perHour[r] = Math.round(production.perHour[r] * 1.5 * 100) / 100;
      }
    }

    const elapsedMs = Math.max(0, now.getTime() - planet.lastResourceUpdate.getTime());
    const hours = elapsedMs / 3_600_000;
    const cap = storageCap(buildings[BuildingType.STORAGE_VACUOLE] ?? 0);
    const amounts = this.amountsOf(planet);

    const next: Record<ResourceType, number> = { ...amounts };
    for (const r of Object.values(ResourceType)) {
      const gained = production.perHour[r] * hours;
      next[r] = amounts[r] > cap ? amounts[r] : Math.min(cap, amounts[r] + gained);
    }

    // Compute stability decay
    const sporrangeLevel = buildings[BuildingType.SPORANGE] ?? 0;
    const usedFields = planet.buildings.reduce((sum, b) => sum + (b.level > 0 ? 1 : 0), 0);
    const terraform = research[ResearchType.TERRAFORMATION] ?? 0;
    const maxFields = BASE_PLANET_FIELDS + terraform * FIELDS_PER_TERRAFORMATION;
    const decayPerHour = computeStabilityDecay(usedFields, maxFields, sporrangeLevel);
    const symbiosis = research[ResearchType.SYMBIOSIS] ?? 0;
    const stabilityMax = STABILITY_MAX + symbiosis * STABILITY_SYMBIOSIS_BONUS;
    const newStability = Math.min(
      stabilityMax,
      Math.max(STABILITY_MIN, planet.stability - decayPerHour * hours),
    );

    const updated = await db.planet.update({
      where: { id: planetId },
      data: {
        biomass: next[ResourceType.BIOMASS],
        sap: next[ResourceType.SAP],
        minerals: next[ResourceType.MINERALS],
        spores: next[ResourceType.SPORES],
        stability: newStability,
        lastResourceUpdate: now,
      },
      include: { buildings: true },
    });

    return { planet: updated, buildings, research, production };
  }

  /** Construit l'état ressources exposé au client. */
  buildResourceState(settled: SettledPlanet): ResourceState {
    const { planet, buildings, production } = settled;
    const cap = storageCap(buildings[BuildingType.STORAGE_VACUOLE] ?? 0);
    const capacity = {
      [ResourceType.BIOMASS]: cap,
      [ResourceType.SAP]: cap,
      [ResourceType.MINERALS]: cap,
      [ResourceType.SPORES]: cap,
    };
    return {
      amounts: this.amountsOf(planet),
      perHour: production.perHour,
      capacity,
      energyProduced: Math.round(production.energyProduced),
      energyConsumed: Math.round(production.energyConsumed),
      energyRatio: Math.round(production.energyRatio * 100) / 100,
      stability: planet.stability,
    };
  }

  /** Retourne l'événement galactique actif (endsAt > now), ou null. */
  async getActiveEvent(
    db?: Prisma.TransactionClient,
  ): Promise<GalacticEvent | null> {
    const client = db ?? this.prisma;
    return client.galacticEvent.findFirst({
      where: { endsAt: { gt: new Date() } },
      orderBy: { startAt: 'desc' },
    });
  }

  /** Débite un coût en ressources d'une planète déjà settlée. */
  async spend(
    planetId: string,
    cost: Partial<Record<ResourceType, number>>,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await db.planet.update({
      where: { id: planetId },
      data: {
        biomass: { decrement: cost[ResourceType.BIOMASS] ?? 0 },
        sap: { decrement: cost[ResourceType.SAP] ?? 0 },
        minerals: { decrement: cost[ResourceType.MINERALS] ?? 0 },
        spores: { decrement: cost[ResourceType.SPORES] ?? 0 },
      },
    });
  }
}
