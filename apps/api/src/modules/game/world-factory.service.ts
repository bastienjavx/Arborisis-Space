import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  BUILDING_TYPES,
  COLONY_STARTING_RESOURCES,
  GALAXY_COUNT,
  PlanetType,
  POSITIONS_PER_SYSTEM,
  RACES,
  RaceType,
  raceStartingResources,
  RESEARCH_TYPES,
  ResourceType,
  STABILITY_DEFAULT,
  SYSTEMS_PER_GALAXY,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';

const COORDINATE_RANDOM_ATTEMPTS = 30;
const COORDINATE_LOAD_OCCUPIED_THRESHOLD = 2_000;

@Injectable()
export class WorldFactoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialise un nouveau joueur : niveaux de recherche à 0 + Noyau-Monde
   * sur un emplacement libre tiré au sort. Idempotent par sécurité.
   */
  async initNewPlayer(
    userId: string,
    transaction?: Prisma.TransactionClient,
    race: RaceType = RaceType.MYCELIANS,
  ): Promise<void> {
    const initialize = async (tx: Prisma.TransactionClient): Promise<void> => {
      const universeId = await getDefaultUniverseId(tx);

      await tx.researchLevel.createMany({
        data: RESEARCH_TYPES.map((type) => ({ userId, type, level: 0 })),
        skipDuplicates: true,
      });

      const existing = await tx.planet.findFirst({ where: { ownerId: userId, isHomeworld: true } });
      if (existing) return;

      const startingResources = raceStartingResources(race);
      const coords = await this.pickFreeCoordinates(tx, universeId);
      const planet = await tx.planet.create({
        data: {
          name: 'Noyau-Monde',
          ownerId: userId,
          universeId,
          isHomeworld: true,
          planetType: PlanetType.VERDANT,
          galaxy: coords.galaxy,
          system: coords.system,
          position: coords.position,
          stability: STABILITY_DEFAULT,
          biomass: startingResources[ResourceType.BIOMASS] ?? 0,
          sap: startingResources[ResourceType.SAP] ?? 0,
          minerals: startingResources[ResourceType.MINERALS] ?? 0,
          spores: startingResources[ResourceType.SPORES] ?? 0,
          lastResourceUpdate: new Date(),
        },
      });
      await tx.planetBuilding.createMany({
        data: BUILDING_TYPES.map((type) => ({ planetId: planet.id, type, level: 0 })),
      });

      const startingShip = RACES[race].startingShip;
      if (startingShip) {
        await tx.planetShip.upsert({
          where: { planetId_type: { planetId: planet.id, type: startingShip } },
          update: { quantity: { increment: 1 } },
          create: { planetId: planet.id, type: startingShip, quantity: 1 },
        });
      }
    };
    if (transaction) await initialize(transaction);
    else await this.prisma.serializable(initialize);
  }

  /**
   * Crée une colonie (planète non-mère) sur des coordonnées données, dans une
   * transaction fournie par l'appelant (finalisation d'essaimage).
   */
  async createColony(
    tx: Prisma.TransactionClient,
    userId: string,
    universeId: string,
    coords: { galaxy: number; system: number; position: number },
    name = 'Colonie sporale',
  ): Promise<string> {
    const planet = await tx.planet.create({
      data: {
        name,
        ownerId: userId,
        universeId,
        isHomeworld: false,
        planetType: this.randomPlanetType(),
        galaxy: coords.galaxy,
        system: coords.system,
        position: coords.position,
        stability: STABILITY_DEFAULT,
        biomass: COLONY_STARTING_RESOURCES[ResourceType.BIOMASS] ?? 0,
        sap: COLONY_STARTING_RESOURCES[ResourceType.SAP] ?? 0,
        minerals: COLONY_STARTING_RESOURCES[ResourceType.MINERALS] ?? 0,
        spores: COLONY_STARTING_RESOURCES[ResourceType.SPORES] ?? 0,
        lastResourceUpdate: new Date(),
      },
    });
    await tx.planetBuilding.createMany({
      data: BUILDING_TYPES.map((type) => ({ planetId: planet.id, type, level: 0 })),
    });
    return planet.id;
  }

  private randomPlanetType(): PlanetType {
    const rand = Math.random();
    if (rand < 0.3) return PlanetType.VERDANT;
    if (rand < 0.55) return PlanetType.MINERAL;
    if (rand < 0.8) return PlanetType.SAP_RICH;
    if (rand < 0.9) return PlanetType.SPORE_NEBULA;
    return PlanetType.BARREN;
  }

  private async pickFreeCoordinates(
    tx: Prisma.TransactionClient,
    universeId: string,
  ): Promise<{ galaxy: number; system: number; position: number }> {
    const totalPlanets = await tx.planet.count({ where: { universeId } });
    const totalSlots = GALAXY_COUNT * SYSTEMS_PER_GALAXY * POSITIONS_PER_SYSTEM;

    // Univers peuplé : charger les coordonnées occupées et trouver un trou (O(planètes)).
    if (totalPlanets > COORDINATE_LOAD_OCCUPIED_THRESHOLD || totalPlanets > totalSlots * 0.3) {
      const occupied = new Set(
        (
          await tx.planet.findMany({
            where: { universeId },
            select: { galaxy: true, system: true, position: true },
          })
        ).map((p) => `${p.galaxy}:${p.system}:${p.position}`),
      );

      // Limite de sécurité : ne pas scanner une grille gigantesque.
      const maxScan = Math.min(totalSlots, 100_000);
      let scanned = 0;
      while (scanned < maxScan) {
        const galaxy = randInt(1, GALAXY_COUNT);
        const system = randInt(1, SYSTEMS_PER_GALAXY);
        const position = randInt(1, POSITIONS_PER_SYSTEM);
        const key = `${galaxy}:${system}:${position}`;
        scanned++;
        if (!occupied.has(key)) return { galaxy, system, position };
      }
      throw new ConflictException('Aucun emplacement libre disponible dans la galaxie.');
    }

    // Univers clairsemé : tirage aléatoire avec peu de collisions.
    for (let attempt = 0; attempt < COORDINATE_RANDOM_ATTEMPTS; attempt++) {
      const galaxy = randInt(1, GALAXY_COUNT);
      const system = randInt(1, SYSTEMS_PER_GALAXY);
      const position = randInt(1, POSITIONS_PER_SYSTEM);
      const taken = await tx.planet.findUnique({
        where: { universeId_galaxy_system_position: { universeId, galaxy, system, position } },
      });
      if (!taken) return { galaxy, system, position };
    }
    throw new ConflictException('Aucun emplacement libre disponible dans la galaxie.');
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
