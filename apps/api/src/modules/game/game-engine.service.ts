import { BadRequestException, Injectable } from '@nestjs/common';
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
import { OptimisticLockError, PrismaService } from '../../common/prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly events?: EventsGateway,
  ) {}

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
      return this.prisma.optimistic((tx) => this.settlePlanet(planetId, now, tx));
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
      where: { id: planetId, version: planet.version },
      data: {
        biomass: next[ResourceType.BIOMASS],
        sap: next[ResourceType.SAP],
        minerals: next[ResourceType.MINERALS],
        spores: next[ResourceType.SPORES],
        stability: newStability,
        ecologicalStability,
        lastResourceUpdate: now,
        version: { increment: 1 },
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

  /**
   * Crédite un bundle de ressources à une planète, cappé au stockage courant.
   * Settle d'abord la planète (autorité serveur), puis incrémente les stocks sans
   * dépasser la capacité. Renvoie les montants réellement acceptés et l'excédent perdu.
   * Réutilisé par les récompenses (succès, quêtes, daily, saisons).
   */
  async creditResourcesToPlanet(
    planetId: string,
    bundle: Partial<Record<ResourceType, number>>,
    now = new Date(),
    db?: Prisma.TransactionClient,
  ): Promise<{
    accepted: Record<ResourceType, number>;
    overflow: Record<ResourceType, number>;
  }> {
    if (!db) {
      return this.prisma.optimistic((tx) =>
        this.creditResourcesToPlanet(planetId, bundle, now, tx),
      );
    }
    const settled = await this.settlePlanet(planetId, now, db);
    const cap = storageCap(settled.buildings[BuildingType.STORAGE_VACUOLE] ?? 0);
    const current = this.amountsOf(settled.planet);
    const accepted = {} as Record<ResourceType, number>;
    const overflow = {} as Record<ResourceType, number>;
    for (const resource of Object.values(ResourceType)) {
      const want = Math.max(0, Math.floor(bundle[resource] ?? 0));
      accepted[resource] = Math.max(0, Math.min(want, cap - current[resource]));
      overflow[resource] = want - accepted[resource];
    }
    await db.planet.update({
      where: { id: planetId, version: settled.planet.version },
      data: {
        biomass: { increment: accepted[ResourceType.BIOMASS] },
        sap: { increment: accepted[ResourceType.SAP] },
        minerals: { increment: accepted[ResourceType.MINERALS] },
        spores: { increment: accepted[ResourceType.SPORES] },
        version: { increment: 1 },
      },
    });
    return { accepted, overflow };
  }

  /**
   * Crédite un butin sur le Noyau-Monde du joueur (ou, à défaut, sa plus ancienne
   * planète). Renvoie les montants acceptés, ou null si le joueur n'a aucune planète.
   */
  async creditResourcesToHomeworld(
    userId: string,
    bundle: Partial<Record<ResourceType, number>>,
    now = new Date(),
    db?: Prisma.TransactionClient,
  ): Promise<Record<ResourceType, number> | null> {
    const client = db ?? this.prisma;
    const home =
      (await client.planet.findFirst({
        where: { ownerId: userId, isHomeworld: true },
        select: { id: true },
      })) ??
      (await client.planet.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }));
    if (!home) return null;
    const { accepted } = await this.creditResourcesToPlanet(home.id, bundle, now, db);
    return accepted;
  }

  /** Notifie le client qu'une planète a changé. */
  emitPlanetUpdated(userId: string, planetId: string): void {
    this.events?.emitToUser(userId, 'planet:updated', { planetId });
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
    expectedVersion?: number,
  ): Promise<void> {
    const biomass = cost[ResourceType.BIOMASS] ?? 0;
    const sap = cost[ResourceType.SAP] ?? 0;
    const minerals = cost[ResourceType.MINERALS] ?? 0;
    const spores = cost[ResourceType.SPORES] ?? 0;

    // Décrément conditionnel : la mise à jour n'a lieu que si le solde couvre le coût
    // et que le verrou optimiste correspond. Si expectedVersion est fourni, on valide
    // la version ; sinon on conserve le comportement de garde conditionnelle legacy.
    const where: Prisma.PlanetWhereInput = {
      id: planetId,
      biomass: { gte: biomass },
      sap: { gte: sap },
      minerals: { gte: minerals },
      spores: { gte: spores },
    };
    if (expectedVersion !== undefined) {
      (where as Prisma.PlanetWhereUniqueInput & { version: number }).version = expectedVersion;
    }

    const data: Prisma.PlanetUpdateInput = {
      biomass: { decrement: biomass },
      sap: { decrement: sap },
      minerals: { decrement: minerals },
      spores: { decrement: spores },
    };
    if (expectedVersion !== undefined) {
      data.version = { increment: 1 };
    }

    const result = await db.planet.updateMany({
      where,
      data,
    });
    if (result.count !== 1) {
      if (expectedVersion !== undefined) {
        throw new OptimisticLockError();
      }
      throw new BadRequestException('Ressources insuffisantes.');
    }
  }
}
