import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MOON_BUILDINGS,
  MoonBuildingType,
  moonCreationChance,
  DEBRIS_EXPIRY_HOURS,
  ResourceType,
  type DebrisFieldView,
  type MoonView,
  type MoonBuildingView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';

@Injectable()
export class MoonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
  ) {}

  /** Liste les champs de débris visibles dans un système. */
  async getDebrisFields(galaxy: number, system: number): Promise<DebrisFieldView[]> {
    const now = new Date();
    const fields = await this.prisma.debrisField.findMany({
      where: { galaxy, system, expiresAt: { gt: now } },
    });
    return fields.map((f) => ({
      id: f.id,
      coordinates: { galaxy: f.galaxy, system: f.system, position: f.position },
      biomass: f.biomass,
      minerals: f.minerals,
      totalResources: f.biomass + f.minerals,
      expiresAt: f.expiresAt.toISOString(),
    }));
  }

  /** Renvoie la lune d'une planète, ou null si elle n'existe pas. */
  async getMoon(userId: string, planetId: string): Promise<MoonView | null> {
    const planet = await this.planets.assertOwnership(userId, planetId);
    const moon = await this.prisma.moon.findUnique({
      where: { planetId },
      include: { buildings: true },
    });
    if (!moon) return null;
    return this.toMoonView(moon as any, planet as any);
  }

  /** Tente de créer une lune depuis un champ de débris. */
  async attemptMoonCreation(
    userId: string,
    planetId: string,
    debrisFieldId: string,
  ): Promise<MoonView | null> {
    const planet = await this.planets.assertOwnership(userId, planetId);
    const field = await this.prisma.debrisField.findUnique({ where: { id: debrisFieldId } });
    if (!field) throw new NotFoundException('Champ de débris introuvable.');
    if (field.expiresAt < new Date()) throw new BadRequestException('Ce champ de débris a expiré.');

    const existing = await this.prisma.moon.findUnique({ where: { planetId } });
    if (existing) throw new ConflictException('Cette planète possède déjà une lune.');

    const totalSize = field.biomass + field.minerals;
    const chance = moonCreationChance(totalSize);

    if (Math.random() > chance) return null;

    const moon = await this.prisma.moon.create({
      data: { planetId, name: `Lune de ${(planet as any).name}`, maxFields: 10 },
      include: { buildings: true },
    });

    return this.toMoonView(moon as any, planet as any);
  }

  /** Construit ou améliore un bâtiment lunaire. */
  async buildMoonBuilding(
    userId: string,
    planetId: string,
    buildingType: MoonBuildingType,
  ): Promise<MoonView> {
    const planet = await this.planets.assertOwnership(userId, planetId);
    const moon = await this.prisma.moon.findUnique({
      where: { planetId },
      include: { buildings: true },
    });
    if (!moon) throw new NotFoundException("Cette planète n'a pas de lune.");

    const config = MOON_BUILDINGS[buildingType];
    if (!config) throw new BadRequestException('Type de bâtiment lunaire invalide.');

    const currentLevel = (moon.buildings as any[]).find((b) => b.buildingType === buildingType)?.level ?? 0;
    if (currentLevel >= config.maxLevel) {
      throw new BadRequestException('Ce bâtiment est déjà au niveau maximum.');
    }

    const nextLevel = currentLevel + 1;
    const factor = Math.pow(config.costFactor, nextLevel - 1);
    const cost = {
      BIOMASS: Math.ceil((config.baseCost[ResourceType.BIOMASS] ?? 0) * factor),
      MINERALS: Math.ceil((config.baseCost[ResourceType.MINERALS] ?? 0) * factor),
      SAP: Math.ceil((config.baseCost[ResourceType.SAP] ?? 0) * factor),
      SPORES: Math.ceil((config.baseCost[ResourceType.SPORES] ?? 0) * factor),
    };

    const planetData = planet as any;
    if (
      planetData.biomass < cost.BIOMASS ||
      planetData.minerals < cost.MINERALS ||
      planetData.sap < cost.SAP ||
      planetData.spores < cost.SPORES
    ) {
      throw new BadRequestException('Ressources insuffisantes pour construire ce bâtiment lunaire.');
    }

    await this.prisma.$transaction([
      this.prisma.planet.update({
        where: { id: planetId },
        data: {
          biomass: { decrement: cost.BIOMASS },
          minerals: { decrement: cost.MINERALS },
          sap: { decrement: cost.SAP },
          spores: { decrement: cost.SPORES },
        },
      }),
      this.prisma.moonBuildingLevel.upsert({
        where: { moonId_buildingType: { moonId: moon.id, buildingType: buildingType as any } },
        update: { level: { increment: 1 } },
        create: { moonId: moon.id, buildingType: buildingType as any, level: 1 },
      }),
    ]);

    const updated = await this.prisma.moon.findUniqueOrThrow({
      where: { planetId },
      include: { buildings: true },
    });
    return this.toMoonView(updated as any, planet as any);
  }

  /** Crée ou met à jour un champ de débris suite à un combat. */
  async createOrUpdateDebrisField(
    universeId: string,
    galaxy: number,
    system: number,
    position: number,
    biomass: number,
    minerals: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + DEBRIS_EXPIRY_HOURS * 3_600_000);
    const existing = await this.prisma.debrisField.findFirst({
      where: { universeId, galaxy, system, position },
    });
    if (existing) {
      await this.prisma.debrisField.update({
        where: { id: existing.id },
        data: { biomass: { increment: biomass }, minerals: { increment: minerals }, expiresAt },
      });
    } else {
      await this.prisma.debrisField.create({
        data: { universeId, galaxy, system, position, biomass, minerals, expiresAt },
      });
    }
  }

  private toMoonView(
    moon: { id: string; planetId: string; name: string; maxFields: number; buildings: { buildingType: string; level: number }[] },
    planet: { name: string; galaxy: number; system: number; position: number },
  ): MoonView {
    const phalanxBuilding = moon.buildings.find((b) => b.buildingType === MoonBuildingType.SPORE_PHALANX);
    const jumpGateBuilding = moon.buildings.find((b) => b.buildingType === MoonBuildingType.BIO_JUMP_GATE);

    const buildings: MoonBuildingView[] = Object.values(MoonBuildingType).map((type) => {
      const building = moon.buildings.find((b) => b.buildingType === type);
      const config = MOON_BUILDINGS[type];
      const level = building?.level ?? 0;
      const nextLevel = level + 1;
      const factor = Math.pow(config.costFactor, level);
      const nextLevelCost = {
        [ResourceType.BIOMASS]: Math.ceil((config.baseCost[ResourceType.BIOMASS] ?? 0) * factor),
        [ResourceType.MINERALS]: Math.ceil((config.baseCost[ResourceType.MINERALS] ?? 0) * factor),
        [ResourceType.SAP]: Math.ceil((config.baseCost[ResourceType.SAP] ?? 0) * factor),
        [ResourceType.SPORES]: Math.ceil((config.baseCost[ResourceType.SPORES] ?? 0) * factor),
      };
      return {
        type,
        name: config.name,
        description: config.description,
        level,
        nextLevelCost,
        nextLevelTimeSeconds: nextLevel * 300,
        canAfford: false,
      };
    });

    return {
      id: moon.id,
      planetId: moon.planetId,
      name: moon.name,
      planetName: planet.name,
      coordinates: { galaxy: planet.galaxy, system: planet.system, position: planet.position },
      usedFields: moon.buildings.length,
      maxFields: moon.maxFields,
      buildings,
      hasJumpGate: (jumpGateBuilding?.level ?? 0) > 0,
      phalanxRange: phalanxBuilding?.level ?? 0,
      constructionJob: null,
    };
  }
}
