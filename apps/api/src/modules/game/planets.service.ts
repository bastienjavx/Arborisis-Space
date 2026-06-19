import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import {
  BUILDINGS,
  BuildingType,
  planetFields,
  PlanetSpecialization,
  PlanetType,
  ResearchType,
  type PlanetDetail,
  type PlanetSummary,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinalizationService } from './finalization.service';
import { GameEngineService } from './game-engine.service';
import { buildBuildingViews, constructionJobView, planetCoordinates } from './game.mappers';

@Injectable()
export class PlanetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly finalization: FinalizationService,
  ) {}

  async assertOwnership(userId: string, planetId: string) {
    const planet = await this.prisma.planet.findUnique({ where: { id: planetId } });
    if (!planet) throw new NotFoundException('Planète introuvable.');
    if (planet.ownerId !== userId)
      throw new ForbiddenException('Cette planète ne vous appartient pas.');
    return planet;
  }

  async listPlanets(userId: string): Promise<PlanetSummary[]> {
    const planets = await this.prisma.planet.findMany({
      where: { ownerId: userId },
      include: { buildings: true },
      orderBy: [{ isHomeworld: 'desc' }, { createdAt: 'asc' }],
    });
    const research = await this.prisma.researchLevel.findMany({ where: { userId } });
    const terraform = research.find((r) => r.type === ResearchType.TERRAFORMATION)?.level ?? 0;

    return planets.map((p) => ({
      id: p.id,
      name: p.name,
      coordinates: planetCoordinates(p),
      isHomeworld: p.isHomeworld,
      planetType: p.planetType as PlanetType,
      usedFields: p.buildings.reduce((sum, b) => sum + b.level, 0),
      maxFields: planetFields(terraform),
      specialization: (p.specialization as PlanetSpecialization) ?? null,
    }));
  }

  async getPlanetDetail(userId: string, planetId: string): Promise<PlanetDetail> {
    await this.assertOwnership(userId, planetId);
    await this.finalization.finalizeDueForPlanet(planetId);
    await this.finalization.finalizeDueTransfersForUser(userId);

    const settled = await this.engine.settlePlanet(planetId);
    const resources = this.engine.buildResourceState(settled);
    const buildings = buildBuildingViews(
      settled.buildings,
      settled.research,
      resources.amounts,
      settled.productionIntensities,
    );

    const activeJob = await this.prisma.constructionJob.findFirst({
      where: { planetId, status: JobStatus.PENDING },
      orderBy: { finishesAt: 'asc' },
    });

    const terraform = settled.research[ResearchType.TERRAFORMATION] ?? 0;
    const usedFields = settled.planet.buildings.reduce((sum, b) => sum + b.level, 0);

    return {
      id: settled.planet.id,
      name: settled.planet.name,
      coordinates: planetCoordinates(settled.planet),
      isHomeworld: settled.planet.isHomeworld,
      planetType: settled.planet.planetType as PlanetType,
      usedFields,
      maxFields: planetFields(terraform),
      specialization: (settled.planet.specialization as PlanetSpecialization) ?? null,
      resources,
      buildings,
      constructionJob: activeJob ? constructionJobView(activeJob) : null,
    };
  }

  async renamePlanet(userId: string, planetId: string, name: string): Promise<PlanetSummary> {
    await this.assertOwnership(userId, planetId);
    const existing = await this.prisma.planet.findFirst({
      where: { ownerId: userId, name, id: { not: planetId } },
    });
    if (existing) throw new ForbiddenException('Vous possédez déjà une planète avec ce nom.');

    const updated = await this.prisma.planet.update({
      where: { id: planetId },
      data: { name },
      include: { buildings: true },
    });

    const research = await this.prisma.researchLevel.findMany({ where: { userId } });
    const terraform = research.find((r) => r.type === ResearchType.TERRAFORMATION)?.level ?? 0;

    return {
      id: updated.id,
      name: updated.name,
      coordinates: planetCoordinates(updated),
      isHomeworld: updated.isHomeworld,
      planetType: updated.planetType as PlanetType,
      usedFields: updated.buildings.reduce((sum, b) => sum + b.level, 0),
      maxFields: planetFields(terraform),
      specialization: (updated.specialization as PlanetSpecialization) ?? null,
    };
  }

  async setSpecialization(
    userId: string,
    planetId: string,
    specialization: PlanetSpecialization | null,
  ): Promise<PlanetSummary> {
    await this.assertOwnership(userId, planetId);

    const updated = await this.prisma.planet.update({
      where: { id: planetId },
      data: { specialization: specialization ?? null },
      include: { buildings: true },
    });

    const research = await this.prisma.researchLevel.findMany({ where: { userId } });
    const terraform = research.find((r) => r.type === ResearchType.TERRAFORMATION)?.level ?? 0;

    return {
      id: updated.id,
      name: updated.name,
      coordinates: planetCoordinates(updated),
      isHomeworld: updated.isHomeworld,
      planetType: updated.planetType as PlanetType,
      usedFields: updated.buildings.reduce((sum, b) => sum + b.level, 0),
      maxFields: planetFields(terraform),
      specialization: (updated.specialization as PlanetSpecialization) ?? null,
    };
  }

  async setProductionIntensities(
    userId: string,
    planetId: string,
    intensities: Partial<Record<BuildingType, number>>,
  ): Promise<PlanetDetail> {
    await this.assertOwnership(userId, planetId);

    const entries = Object.entries(intensities) as [BuildingType, number][];
    if (entries.some(([type]) => !BUILDINGS[type]?.producesResource)) {
      throw new BadRequestException('Seuls les bâtiments producteurs peuvent changer d’intensité.');
    }

    // Comptabilise d’abord la production écoulée avec les anciens réglages.
    await this.engine.settlePlanet(planetId);
    await this.prisma.$transaction(
      entries.map(([type, productionIntensity]) =>
        this.prisma.planetBuilding.update({
          where: { planetId_type: { planetId, type } },
          data: { productionIntensity },
        }),
      ),
    );

    // Le second settle recalcule immédiatement la stabilité énergétique.
    return this.getPlanetDetail(userId, planetId);
  }
}
