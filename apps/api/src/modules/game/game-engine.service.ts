import { Injectable } from '@nestjs/common';
import type { GalacticEvent, Planet, PlanetBuilding, Prisma, ResearchLevel } from '@prisma/client';
import {
  BuildingType,
  computeProduction,
  computeStabilityDecay,
  effectiveStability,
  GalacticEventType,
  PlanetSpecialization,
  PlanetType,
  planetFields,
  RaceType,
  ResearchType,
  ResourceType,
  STABILITY_MAX,
  STABILITY_MIN,
  STABILITY_SYMBIOSIS_BONUS,
  storageCap,
  usedPlanetFields,
  type ProductionResult,
  type ResourceState,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface SettledPlanet {
  planet: Planet & { buildings: PlanetBuilding[] };
  buildings: Partial<Record<BuildingType, number>>;
  productionIntensities: Partial<Record<BuildingType, number>>;
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

  productionIntensitiesOf(buildings: PlanetBuilding[]): Partial<Record<BuildingType, number>> {
    const map: Partial<Record<BuildingType, number>> = {};
    for (const building of buildings) map[building.type] = building.productionIntensity;
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
      include: { buildings: true, owner: true },
    });
    const researchLevels = await db.researchLevel.findMany({
      where: { userId: planet.ownerId },
    });

    const buildings = this.buildingLevelsOf(planet.buildings);
    const productionIntensities = this.productionIntensitiesOf(planet.buildings);
    const research = this.researchLevelsOf(researchLevels);

    // Check for active galactic events affecting production
    const activeEvent = await this.getActiveEvent(db);
    const production = computeProduction({
      buildings,
      productionIntensities,
      research,
      stability: planet.stability,
      planetType: planet.planetType as PlanetType,
      race: planet.owner.race as RaceType,
      specialization: (planet.specialization as PlanetSpecialization) ?? null,
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
    const usedFields = usedPlanetFields(planet.buildings.map((b) => b.level));
    const terraform = research[ResearchType.TERRAFORMATION] ?? 0;
    const maxFields = planetFields(terraform);
    const decayPerHour = computeStabilityDecay(usedFields, maxFields, sporrangeLevel);
    const symbiosis = research[ResearchType.SYMBIOSIS] ?? 0;
    const stabilityMax = STABILITY_MAX + symbiosis * STABILITY_SYMBIOSIS_BONUS;
    const ecologicalStability = Math.min(
      stabilityMax,
      Math.max(STABILITY_MIN, planet.ecologicalStability - decayPerHour * hours),
    );
    const newStability = effectiveStability(
      ecologicalStability,
      production.energyRatio,
      stabilityMax,
    );

    const updated = await db.planet.update({
      where: { id: planetId },
      data: {
        biomass: next[ResourceType.BIOMASS],
        sap: next[ResourceType.SAP],
        minerals: next[ResourceType.MINERALS],
        spores: next[ResourceType.SPORES],
        stability: newStability,
        ecologicalStability,
        lastResourceUpdate: now,
      },
      include: { buildings: true },
    });

    const currentProduction = computeProduction({
      buildings,
      productionIntensities,
      research,
      stability: newStability,
      planetType: updated.planetType as PlanetType,
      race: planet.owner.race as RaceType,
      specialization: (updated.specialization as PlanetSpecialization) ?? null,
    });
    if (activeEvent?.type === GalacticEventType.SPORE_BLOOM) {
      for (const r of Object.values(ResourceType)) {
        currentProduction.perHour[r] = Math.round(currentProduction.perHour[r] * 1.5 * 100) / 100;
      }
    }

    return {
      planet: updated,
      buildings,
      productionIntensities,
      research,
      production: currentProduction,
    };
  }

  /** Construit l'état ressources exposé au client. */
  buildResourceState(settled: SettledPlanet): ResourceState {
    const { planet, buildings, production, research } = settled;
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
      ecologicalStability: planet.ecologicalStability,
      stabilityMaximum:
        STABILITY_MAX + (research[ResearchType.SYMBIOSIS] ?? 0) * STABILITY_SYMBIOSIS_BONUS,
    };
  }

  /** Retourne l'événement galactique actif (endsAt > now), ou null. */
  async getActiveEvent(db?: Prisma.TransactionClient): Promise<GalacticEvent | null> {
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
