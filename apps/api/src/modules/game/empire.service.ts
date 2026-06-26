import { Injectable } from '@nestjs/common';
import {
  computeProduction,
  planetFields,
  PlanetSpecialization,
  PlanetType,
  RaceType,
  ResearchType,
  ResourceType,
  ShipType,
  usedPlanetFields,
  type EmpireOverview,
  type EmpirePlanetStats,
  type ResourceBundle,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from './game-engine.service';
import { planetCoordinates } from './game.mappers';

@Injectable()
export class EmpireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
  ) {}

  async getEmpireOverview(userId: string): Promise<EmpireOverview> {
    const [planets, researchLevels, user] = await Promise.all([
      this.prisma.planet.findMany({
        where: { ownerId: userId },
        include: {
          buildings: true,
          ships: true,
          constructionJobs: { where: { status: 'PENDING' } },
        },
        orderBy: [{ isHomeworld: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.researchLevel.findMany({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { race: true } }),
    ]);

    const research = this.engine.researchLevelsOf(researchLevels);
    const terraform = research[ResearchType.TERRAFORMATION] ?? 0;
    const race = (user?.race as RaceType) ?? RaceType.MYCELIANS;

    const [researchJobs, expeditions, pvpMissions, pveMissions, transfers, colonizations] =
      await Promise.all([
        this.prisma.researchJob.count({ where: { userId, status: 'PENDING' } }),
        this.prisma.expeditionMission.count({
          where: { userId, phase: { not: 'COMPLETED' } },
        }),
        this.prisma.pvpMission.count({ where: { userId, phase: { not: 'COMPLETED' } } }),
        this.prisma.pveMission.count({ where: { userId, phase: { not: 'COMPLETED' } } }),
        this.prisma.resourceTransferMission.count({
          where: { userId, phase: { not: 'COMPLETED' } },
        }),
        this.prisma.colonizationJob.count({ where: { userId, status: 'PENDING' } }),
      ]);

    const totalResources: ResourceBundle = {};
    const totalProduction: ResourceBundle = {};
    const shipBreakdown: Partial<Record<ShipType, number>> = {};
    let totalShips = 0;
    let totalBuildingLevels = 0;
    let constructions = 0;

    const planetStats: EmpirePlanetStats[] = planets.map((p) => {
      const buildingLevels = this.engine.buildingLevelsOf(p.buildings);
      const intensities = this.engine.productionIntensitiesOf(p.buildings);

      const prod = computeProduction({
        buildings: buildingLevels,
        productionIntensities: intensities,
        research,
        race,
        stability: p.stability,
        planetType: p.planetType as PlanetType,
        specialization: (p.specialization as PlanetSpecialization) ?? undefined,
      });

      const resources: ResourceBundle = {
        [ResourceType.BIOMASS]: p.biomass,
        [ResourceType.SAP]: p.sap,
        [ResourceType.MINERALS]: p.minerals,
        [ResourceType.SPORES]: p.spores,
      };

      const production: ResourceBundle = {
        [ResourceType.BIOMASS]: prod.perHour[ResourceType.BIOMASS] ?? 0,
        [ResourceType.SAP]: prod.perHour[ResourceType.SAP] ?? 0,
        [ResourceType.MINERALS]: prod.perHour[ResourceType.MINERALS] ?? 0,
        [ResourceType.SPORES]: prod.perHour[ResourceType.SPORES] ?? 0,
      };

      for (const [res, val] of Object.entries(resources)) {
        const k = res as ResourceType;
        totalResources[k] = (totalResources[k] ?? 0) + (val ?? 0);
      }
      for (const [res, val] of Object.entries(production)) {
        const k = res as ResourceType;
        totalProduction[k] = (totalProduction[k] ?? 0) + (val ?? 0);
      }

      const planetShips: Partial<Record<ShipType, number>> = {};
      let planetTotalShips = 0;
      for (const s of p.ships) {
        if (s.quantity > 0) {
          planetShips[s.type as ShipType] = s.quantity;
          shipBreakdown[s.type as ShipType] = (shipBreakdown[s.type as ShipType] ?? 0) + s.quantity;
          totalShips += s.quantity;
          planetTotalShips += s.quantity;
        }
      }

      const planetBuildingLevels = p.buildings.reduce((sum, b) => sum + b.level, 0);
      totalBuildingLevels += planetBuildingLevels;
      constructions += p.constructionJobs.length;

      return {
        planetId: p.id,
        planetName: p.name,
        isHomeworld: p.isHomeworld,
        coordinates: planetCoordinates(p),
        planetType: p.planetType,
        specialization: p.specialization,
        resources,
        production,
        ships: planetShips,
        totalShips: planetTotalShips,
        buildingLevels,
        stability: p.stability,
        usedFields: usedPlanetFields(p.buildings.map((b) => b.level)),
        maxFields: planetFields(terraform),
      };
    });

    return {
      totalResources,
      totalProduction,
      totalShips,
      shipBreakdown,
      totalBuildingLevels,
      planets: planetStats,
      activeJobs: {
        constructions,
        researches: researchJobs,
        expeditions,
        pvpMissions,
        pveMissions,
        transfers,
        colonizations,
      },
    };
  }
}
