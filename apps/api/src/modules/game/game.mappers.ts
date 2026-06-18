import {
  BUILDINGS,
  BuildingType,
  BUILDING_TYPES,
  buildingBaseProduction,
  buildingCost,
  buildTimeSeconds,
  canAfford,
  RESEARCHES,
  ResearchType,
  RESEARCH_TYPES,
  researchCost,
  researchTimeSeconds,
  ResourceType,
  unmetBuildingRequirements,
  unmetResearchRequirements,
  type BuildingView,
  type Coordinates,
  type JobView,
  type ResearchView,
} from '@arborisis/shared';
import type {
  ColonizationJob,
  ConstructionJob,
  Planet,
  ResearchJob,
} from '@prisma/client';

type Levels = Partial<Record<BuildingType, number>>;
type ResearchLevels = Partial<Record<ResearchType, number>>;
type Amounts = Record<ResourceType, number>;

export function buildBuildingViews(
  buildings: Levels,
  research: ResearchLevels,
  amounts: Amounts,
): BuildingView[] {
  const coreLevel = buildings[BuildingType.SYMBIOTIC_CORE] ?? 0;
  return BUILDING_TYPES.map((type) => {
    const cfg = BUILDINGS[type];
    const level = buildings[type] ?? 0;
    const nextLevelCost = buildingCost(type, level + 1);
    return {
      type,
      name: cfg.name,
      description: cfg.description,
      level,
      nextLevelCost,
      nextLevelTimeSeconds: buildTimeSeconds(type, level + 1, coreLevel),
      currentProduction: Math.round(buildingBaseProduction(type, level)),
      canAfford: canAfford(amounts, nextLevelCost),
      unmet: unmetBuildingRequirements(type, { buildings, research }),
    };
  });
}

export function buildResearchViews(
  buildings: Levels,
  research: ResearchLevels,
  amounts: Amounts,
): ResearchView[] {
  const nexusLevel = buildings[BuildingType.RESEARCH_NEXUS] ?? 0;
  return RESEARCH_TYPES.map((type) => {
    const cfg = RESEARCHES[type];
    const level = research[type] ?? 0;
    const nextLevelCost = researchCost(type, level + 1);
    return {
      type,
      name: cfg.name,
      description: cfg.description,
      level,
      nextLevelCost,
      nextLevelTimeSeconds: researchTimeSeconds(type, level + 1, nexusLevel),
      canAfford: canAfford(amounts, nextLevelCost),
      unmet: unmetResearchRequirements(type, { buildings, research }),
    };
  });
}

export function constructionJobView(job: ConstructionJob): JobView {
  return {
    id: job.id,
    kind: 'CONSTRUCTION' as JobView['kind'],
    targetType: job.buildingType,
    targetLevel: job.targetLevel,
    startedAt: job.startedAt.toISOString(),
    finishesAt: job.finishesAt.toISOString(),
  };
}

export function researchJobView(job: ResearchJob): JobView {
  return {
    id: job.id,
    kind: 'RESEARCH' as JobView['kind'],
    targetType: job.researchType,
    targetLevel: job.targetLevel,
    startedAt: job.startedAt.toISOString(),
    finishesAt: job.finishesAt.toISOString(),
  };
}

export function colonizationJobView(job: ColonizationJob): JobView {
  return {
    id: job.id,
    kind: 'COLONIZATION' as JobView['kind'],
    targetType: null,
    targetLevel: null,
    startedAt: job.startedAt.toISOString(),
    finishesAt: job.finishesAt.toISOString(),
  };
}

export function planetCoordinates(planet: Planet): Coordinates {
  return { galaxy: planet.galaxy, system: planet.system, position: planet.position };
}
