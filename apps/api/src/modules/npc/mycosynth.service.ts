import { Injectable, Logger } from '@nestjs/common';
import { JobStatus, PvpMissionPhase } from '@prisma/client';
import {
  buildingCost,
  BuildingType,
  canAfford,
  GALAXY_COUNT,
  maxColonies,
  POSITIONS_PER_SYSTEM,
  RaceType,
  researchCost,
  ResearchType,
  SHIPS,
  SHIP_TYPES,
  ShipRole,
  ShipType,
  SYSTEMS_PER_GALAXY,
  unmetBuildingRequirements,
  unmetResearchRequirements,
  type Coordinates,
} from '@arborisis/shared';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';
import { GameEngineService } from '../game/game-engine.service';
import { BuildingsService } from '../game/buildings.service';
import { ResearchService } from '../game/research.service';
import { ShipsService } from '../game/ships.service';
import { ColonizationService } from '../game/colonization.service';
import { FinalizationService } from '../game/finalization.service';
import { WorldFactoryService } from '../game/world-factory.service';
import { PvpService } from '../pvp/pvp.service';

const USERNAME = 'MYCOSYNTH';
const EMAIL = 'mycosynth@npc.internal';
const RACE = RaceType.MYCELIANS;

const BUILDING_PRIORITY: Array<[BuildingType, number]> = [
  [BuildingType.PHOTOSYNTHETIC_CANOPY, 6],
  [BuildingType.BIOMASS_SYNTHESIZER, 6],
  [BuildingType.SAP_WELL, 6],
  [BuildingType.MINERAL_VEIN, 5],
  [BuildingType.SYMBIOTIC_CORE, 3],
  [BuildingType.STORAGE_VACUOLE, 4],
  [BuildingType.RESEARCH_NEXUS, 4],
  [BuildingType.PHOTOSYNTHETIC_CANOPY, 10],
  [BuildingType.BIOMASS_SYNTHESIZER, 10],
  [BuildingType.SAP_WELL, 10],
  [BuildingType.MINERAL_VEIN, 8],
  [BuildingType.SPORANGE, 6],
  [BuildingType.ORBITAL_NURSERY, 5],
  [BuildingType.STORAGE_VACUOLE, 8],
  [BuildingType.RESEARCH_NEXUS, 8],
  [BuildingType.SYMBIOTIC_CORE, 6],
];

const RESEARCH_PRIORITY: Array<[ResearchType, number]> = [
  [ResearchType.ADVANCED_PHOTOSYNTHESIS, 3],
  [ResearchType.GENETIC_ENGINEERING, 2],
  [ResearchType.BIOENGINEERING, 2],
  [ResearchType.SPORAL_PROPULSION, 1],
  [ResearchType.BIOENGINEERING, 3],
  [ResearchType.CHITIN_ARMOR, 3],
  [ResearchType.BIOLOGICAL_WARFARE, 3],
  [ResearchType.SPORAL_PROPULSION, 2],
  [ResearchType.HYPERSPORE_DRIVE, 3],
  [ResearchType.GENETIC_ENGINEERING, 5],
  [ResearchType.ADVANCED_PHOTOSYNTHESIS, 8],
  [ResearchType.BIOENGINEERING, 6],
  [ResearchType.CHITIN_ARMOR, 7],
  [ResearchType.BIOLOGICAL_WARFARE, 7],
  [ResearchType.NUTRIENT_CYCLING, 5],
  [ResearchType.SUBTERRANEAN_ROOTS, 5],
  [ResearchType.SPORAL_PROPULSION, 5],
  [ResearchType.SWARM_TACTICS, 5],
  [ResearchType.ORBITAL_DEFENSE_GRID, 5],
  [ResearchType.SYMBIOSIS, 5],
  [ResearchType.TERRAFORMATION, 3],
  [ResearchType.SPORAL_ECONOMY, 5],
  [ResearchType.WORMHOLE_MYCOLOGY, 3],
  [ResearchType.SPORE_SENSE, 3],
  [ResearchType.DEEP_SCAN, 3],
];

// [shipType, quantity per batch]
const SHIP_PRIORITY: Array<[ShipType, number]> = [
  [ShipType.SPORAL_SWARM, 10],
  [ShipType.SPORAL_DRONE, 20],
  [ShipType.ACID_BOMBER, 5],
  [ShipType.CHITIN_DESTROYER, 3],
];

const ATTACK_THRESHOLD = 30;
const COMBAT_ROLES = new Set([ShipRole.COMBAT]);

@Injectable()
export class MycosynthService {
  private readonly logger = new Logger(MycosynthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly buildings: BuildingsService,
    private readonly research: ResearchService,
    private readonly ships: ShipsService,
    private readonly colonization: ColonizationService,
    private readonly finalization: FinalizationService,
    private readonly world: WorldFactoryService,
    private readonly pvp: PvpService,
  ) {}

  async ensureExists(): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { username: USERNAME } });
    if (existing) return;

    const universeId = await getDefaultUniverseId(this.prisma);
    const user = await this.prisma.user.create({
      data: {
        email: EMAIL,
        username: USERNAME,
        passwordHash: `$npc$${randomUUID()}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: 'NPC' as any,
        race: RACE,
        displayName: 'MYCOSYNTH',
        universeId,
      },
    });

    await this.world.initNewPlayer(user.id, undefined, RACE);
    this.logger.log('MYCOSYNTH initialisée — la faction prend racine.');
  }

  async tick(universeId: string): Promise<void> {
    const npc = await this.prisma.user.findUnique({
      where: { username: USERNAME },
      select: { id: true },
    });
    if (!npc) {
      this.logger.warn('MYCOSYNTH introuvable — tick ignoré.');
      return;
    }

    const userId = npc.id;
    this.logger.debug(`MYCOSYNTH tick — universe ${universeId}`);

    const planets = await this.prisma.planet.findMany({
      where: { ownerId: userId },
      orderBy: [{ isHomeworld: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, isHomeworld: true, galaxy: true, system: true, position: true },
    });
    if (planets.length === 0) return;

    const homeworld = planets[0];
    if (!homeworld) return;

    // Phase 1 : économie
    for (const planet of planets) {
      await this.tryBuild(userId, planet.id).catch((e: unknown) =>
        this.logger.debug({ err: e }, `Construction ignorée sur ${planet.id}`),
      );
    }

    // Phase 2 : recherche (depuis le Noyau-Monde)
    await this.tryResearch(userId, homeworld.id).catch((e: unknown) =>
      this.logger.debug({ err: e }, 'Recherche ignorée'),
    );

    // Phase 3 : expansion
    await this.tryColonize(userId, homeworld.id).catch((e: unknown) =>
      this.logger.debug({ err: e }, 'Colonisation ignorée'),
    );

    // Phase 4 : militaire
    for (const planet of planets) {
      await this.tryProduceShips(userId, planet.id).catch((e: unknown) =>
        this.logger.debug({ err: e }, `Production vaisseaux ignorée sur ${planet.id}`),
      );
    }

    // Phase 5 : attaque
    await this.tryAttack(userId, planets).catch((e: unknown) =>
      this.logger.debug({ err: e }, 'Attaque ignorée'),
    );
  }

  private async tryBuild(userId: string, planetId: string): Promise<void> {
    const pending = await this.prisma.constructionJob.findFirst({
      where: { planetId, status: JobStatus.PENDING },
    });
    if (pending) return;

    await this.finalization.finalizeDueForPlanet(planetId);
    const settled = await this.engine.settlePlanet(planetId);
    const resources = this.engine.buildResourceState(settled);

    for (const [type, targetLevel] of BUILDING_PRIORITY) {
      const current = settled.buildings[type] ?? 0;
      if (current >= targetLevel) continue;

      const nextLevel = current + 1;
      if (unmetBuildingRequirements(type, settled).length > 0) continue;
      if (!canAfford(resources.amounts, buildingCost(type, nextLevel))) continue;

      try {
        await this.buildings.upgrade(userId, planetId, type);
        this.logger.log(`MYCOSYNTH: ${type} → niv.${nextLevel} sur ${planetId}`);
        return;
      } catch {
        // Race condition ou prérequis non satisfaits → essayer la suite
      }
    }
  }

  private async tryResearch(userId: string, planetId: string): Promise<void> {
    const pending = await this.prisma.researchJob.findFirst({
      where: { userId, status: JobStatus.PENDING },
    });
    if (pending) return;

    await this.finalization.finalizeDueResearchForUser(userId);
    const settled = await this.engine.settlePlanet(planetId);
    const resources = this.engine.buildResourceState(settled);

    for (const [type, maxLevel] of RESEARCH_PRIORITY) {
      const current = settled.research[type] ?? 0;
      if (current >= maxLevel) continue;

      if (unmetResearchRequirements(type, settled).length > 0) continue;

      const nextLevel = current + 1;
      if (!canAfford(resources.amounts, researchCost(type, nextLevel, RACE))) continue;

      try {
        await this.research.start(userId, planetId, type);
        this.logger.log(`MYCOSYNTH: Recherche ${type} → niv.${nextLevel}`);
        return;
      } catch {
        // Conflit ou prérequis → essayer la suite
      }
    }
  }

  private async tryColonize(userId: string, homeworldId: string): Promise<void> {
    const sporal = await this.prisma.researchLevel.findUnique({
      where: { userId_type: { userId, type: ResearchType.SPORAL_PROPULSION } },
    });
    if (!sporal || sporal.level < 1) return;

    const [planetCount, pendingCount] = await Promise.all([
      this.prisma.planet.count({ where: { ownerId: userId } }),
      this.prisma.colonizationJob.count({ where: { userId, status: JobStatus.PENDING } }),
    ]);
    if (planetCount - 1 + pendingCount >= maxColonies(sporal.level)) return;

    const coords = await this.findFreeCoords();
    if (!coords) return;

    await this.colonization.colonize(userId, homeworldId, coords);
    this.logger.log(
      `MYCOSYNTH: Essaimage → G${coords.galaxy}:S${coords.system}:P${coords.position}`,
    );
  }

  private async findFreeCoords(): Promise<Coordinates | null> {
    const universeId = await getDefaultUniverseId(this.prisma);
    for (let i = 0; i < 60; i++) {
      const galaxy = Math.ceil(Math.random() * GALAXY_COUNT);
      const system = Math.ceil(Math.random() * SYSTEMS_PER_GALAXY);
      const position = Math.ceil(Math.random() * POSITIONS_PER_SYSTEM);
      const occupied = await this.prisma.planet.findUnique({
        where: {
          universeId_galaxy_system_position: { universeId, galaxy, system, position },
        },
        select: { id: true },
      });
      if (!occupied) return { galaxy, system, position };
    }
    return null;
  }

  private async tryProduceShips(userId: string, planetId: string): Promise<void> {
    const pending = await this.prisma.shipProductionJob.findFirst({
      where: { planetId, status: JobStatus.PENDING },
    });
    if (pending) return;

    await this.finalization.finalizeDueShipProduction(planetId);
    const settled = await this.engine.settlePlanet(planetId);
    const nursery = settled.buildings[BuildingType.ORBITAL_NURSERY] ?? 0;
    if (nursery < 1) return;

    const resources = this.engine.buildResourceState(settled);

    for (const [type, quantity] of SHIP_PRIORITY) {
      const cfg = SHIPS[type];
      if (cfg.restrictedToRaces && !cfg.restrictedToRaces.includes(RACE)) continue;
      if (nursery < cfg.requiresNurseryLevel) continue;

      const cost = { ...cfg.cost };
      for (const [res, base] of Object.entries(cost)) {
        cost[res as keyof typeof cost] = (base ?? 0) * quantity;
      }
      if (!canAfford(resources.amounts, cost as Parameters<typeof canAfford>[1])) continue;

      try {
        await this.ships.produce(userId, { planetId, type, quantity });
        this.logger.log(`MYCOSYNTH: Production ${quantity}× ${type} sur ${planetId}`);
        return;
      } catch {
        // Conflit ou ressources insuffisantes → essayer la suite
      }
    }
  }

  private async tryAttack(
    userId: string,
    planets: Array<{ id: string; galaxy: number; system: number; position: number }>,
  ): Promise<void> {
    const planetIds = planets.map((p) => p.id);

    // Compter les vaisseaux de combat disponibles par planète
    const combatTypes = SHIP_TYPES.filter((t) => COMBAT_ROLES.has(SHIPS[t].role));
    const inventory = await this.prisma.planetShip.findMany({
      where: { planetId: { in: planetIds }, type: { in: combatTypes }, quantity: { gt: 0 } },
    });

    const totalCombat = inventory.reduce((sum, s) => sum + s.quantity, 0);
    if (totalCombat < ATTACK_THRESHOLD) return;

    // Pas de mission sortante en cours
    const activeMission = await this.prisma.pvpMission.findFirst({
      where: { userId, phase: PvpMissionPhase.OUTBOUND },
    });
    if (activeMission) return;

    // Trouver la planète source (le plus de vaisseaux de combat)
    const shipsByPlanet = new Map<string, number>();
    for (const s of inventory) {
      shipsByPlanet.set(s.planetId, (shipsByPlanet.get(s.planetId) ?? 0) + s.quantity);
    }
    const sourcePlanet = planets.reduce((best, p) =>
      (shipsByPlanet.get(p.id) ?? 0) > (shipsByPlanet.get(best.id) ?? 0) ? p : best,
    );
    if ((shipsByPlanet.get(sourcePlanet.id) ?? 0) < ATTACK_THRESHOLD) return;

    // Trouver une cible : joueur réel non-NPC
    const target = await this.findTarget(userId, sourcePlanet);
    if (!target) return;

    // Construire la flotte d'attaque (75% des vaisseaux disponibles)
    const sourceShips = inventory.filter((s) => s.planetId === sourcePlanet.id);
    const fleet: Partial<Record<ShipType, number>> = {};
    for (const s of sourceShips) {
      const qty = Math.max(1, Math.floor(s.quantity * 0.75));
      if (qty > 0) fleet[s.type as ShipType] = qty;
    }

    const hasCombatShip = Object.entries(fleet).some(
      ([type, qty]) => (qty ?? 0) > 0 && COMBAT_ROLES.has(SHIPS[type as ShipType].role),
    );
    if (!hasCombatShip) return;

    await this.pvp.attack(userId, {
      sourcePlanetId: sourcePlanet.id,
      targetPlanetId: target.id,
      ships: fleet as Record<ShipType, number>,
    });
    this.logger.log(`MYCOSYNTH: Attaque lancée sur planète ${target.id} (joueur ${target.ownerId})`);
  }

  private async findTarget(
    npcUserId: string,
    source: { galaxy: number; system: number },
  ): Promise<{ id: string; ownerId: string } | null> {
    // Chercher une planète ennemie dans le même système ou galaxie
    const [sameSystem, sameGalaxy] = await Promise.all([
      this.prisma.planet.findFirst({
        where: {
          galaxy: source.galaxy,
          system: source.system,
          ownerId: { not: npcUserId },
          owner: { role: 'PLAYER' },
        },
        select: { id: true, ownerId: true },
      }),
      this.prisma.planet.findFirst({
        where: {
          galaxy: source.galaxy,
          ownerId: { not: npcUserId },
          owner: { role: 'PLAYER' },
        },
        select: { id: true, ownerId: true },
      }),
    ]);

    return sameSystem ?? sameGalaxy ?? null;
  }
}
