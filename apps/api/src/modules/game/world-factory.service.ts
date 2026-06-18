import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  BUILDING_TYPES,
  COLONY_STARTING_RESOURCES,
  GALAXY_COUNT,
  POSITIONS_PER_SYSTEM,
  RESEARCH_TYPES,
  ResourceType,
  STABILITY_DEFAULT,
  STARTING_RESOURCES,
  SYSTEMS_PER_GALAXY,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WorldFactoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialise un nouveau joueur : niveaux de recherche à 0 + Noyau-Monde
   * sur un emplacement libre tiré au sort. Idempotent par sécurité.
   */
  async initNewPlayer(userId: string, transaction?: Prisma.TransactionClient): Promise<void> {
    const initialize = async (tx: Prisma.TransactionClient): Promise<void> => {
      for (const type of RESEARCH_TYPES) {
        await tx.researchLevel.upsert({
          where: { userId_type: { userId, type } },
          update: {},
          create: { userId, type, level: 0 },
        });
      }

      const existing = await tx.planet.findFirst({ where: { ownerId: userId, isHomeworld: true } });
      if (existing) return;

      const coords = await this.pickFreeCoordinates(tx);
      const planet = await tx.planet.create({
        data: {
          name: 'Noyau-Monde',
          ownerId: userId,
          isHomeworld: true,
          galaxy: coords.galaxy,
          system: coords.system,
          position: coords.position,
          stability: STABILITY_DEFAULT,
          biomass: STARTING_RESOURCES[ResourceType.BIOMASS] ?? 0,
          sap: STARTING_RESOURCES[ResourceType.SAP] ?? 0,
          minerals: STARTING_RESOURCES[ResourceType.MINERALS] ?? 0,
          spores: STARTING_RESOURCES[ResourceType.SPORES] ?? 0,
          lastResourceUpdate: new Date(),
        },
      });
      await tx.planetBuilding.createMany({
        data: BUILDING_TYPES.map((type) => ({ planetId: planet.id, type, level: 0 })),
      });
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
    coords: { galaxy: number; system: number; position: number },
    name = 'Colonie sporale',
  ): Promise<string> {
    const planet = await tx.planet.create({
      data: {
        name,
        ownerId: userId,
        isHomeworld: false,
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

  private async pickFreeCoordinates(
    tx: Prisma.TransactionClient,
  ): Promise<{ galaxy: number; system: number; position: number }> {
    for (let attempt = 0; attempt < 100; attempt++) {
      const galaxy = randInt(1, GALAXY_COUNT);
      const system = randInt(1, SYSTEMS_PER_GALAXY);
      const position = randInt(1, POSITIONS_PER_SYSTEM);
      const taken = await tx.planet.findUnique({
        where: { galaxy_system_position: { galaxy, system, position } },
      });
      if (!taken) return { galaxy, system, position };
    }
    throw new ConflictException('Aucun emplacement libre disponible dans la galaxie.');
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
