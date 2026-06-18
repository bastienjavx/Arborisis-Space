/**
 * Formules de gameplay pures et déterministes d'Arborisis.
 *
 * Aucune fonction ici n'a d'effet de bord : mêmes entrées → mêmes sorties.
 * Le serveur les utilise comme autorité de calcul ; le client les réutilise
 * pour prévisualiser coûts, productions et minuteries.
 */
import {
  ADVANCED_PHOTOSYNTHESIS_BONUS,
  BASE_PLANET_FIELDS,
  BASE_STORAGE,
  BUILDINGS,
  BUILD_TIME_DIVISOR,
  BUILD_TIME_MIN_SECONDS,
  COLONIES_PER_PROPULSION_LEVEL,
  COLONIZATION_BASE_COST,
  COLONIZATION_BASE_TIME_SECONDS,
  COLONIZATION_COST_FACTOR,
  FIELDS_PER_TERRAFORMATION,
  GENETIC_ENGINEERING_BONUS,
  PASSIVE_PRODUCTION,
  RESEARCHES,
  RESEARCH_NEXUS_SPEEDUP,
  ResourceBundle,
  STABILITY_MAX,
  STABILITY_PRODUCTION_FLOOR,
  STORAGE_FACTOR,
  UNIVERSE_SPEED,
} from './constants';
import { BuildingType, ResearchType, ResourceType, RESOURCE_TYPES } from './enums';

// ──────────────────────────── Helpers ResourceBundle ────────────────────────

/** Valeur d'une ressource dans un bundle (0 si absente). */
export function bundleGet(bundle: ResourceBundle, resource: ResourceType): number {
  return bundle[resource] ?? 0;
}

/** Somme de deux bundles. */
export function bundleAdd(a: ResourceBundle, b: ResourceBundle): ResourceBundle {
  const out: ResourceBundle = {};
  for (const r of RESOURCE_TYPES) {
    const v = bundleGet(a, r) + bundleGet(b, r);
    if (v !== 0) out[r] = v;
  }
  return out;
}

/** Multiplie un bundle par un scalaire (résultat arrondi à l'entier inférieur). */
export function bundleScale(a: ResourceBundle, k: number): ResourceBundle {
  const out: ResourceBundle = {};
  for (const r of RESOURCE_TYPES) {
    const v = Math.floor(bundleGet(a, r) * k);
    if (v !== 0) out[r] = v;
  }
  return out;
}

/** `have` couvre-t-il `cost` pour toutes les ressources ? */
export function canAfford(have: ResourceBundle, cost: ResourceBundle): boolean {
  return RESOURCE_TYPES.every((r) => bundleGet(have, r) >= bundleGet(cost, r));
}

/** `have` - `cost`, borné à 0. */
export function bundleSubtract(have: ResourceBundle, cost: ResourceBundle): ResourceBundle {
  const out: ResourceBundle = {};
  for (const r of RESOURCE_TYPES) {
    out[r] = Math.max(0, bundleGet(have, r) - bundleGet(cost, r));
  }
  return out;
}

// ──────────────────────────── Coûts & temps : bâtiments ──────────────────────

/** Coût pour faire passer un bâtiment au niveau `targetLevel` (>= 1). */
export function buildingCost(type: BuildingType, targetLevel: number): ResourceBundle {
  if (targetLevel < 1) return {};
  const cfg = BUILDINGS[type];
  return bundleScale(cfg.baseCost, Math.pow(cfg.costFactor, targetLevel - 1));
}

/** Coût structurel (biomasse + minéraux) servant au calcul du temps de build. */
function structuralCost(cost: ResourceBundle): number {
  return bundleGet(cost, ResourceType.BIOMASS) + bundleGet(cost, ResourceType.MINERALS);
}

/** Temps de construction (secondes) d'un palier, réduit par le Cœur Symbiotique. */
export function buildTimeSeconds(
  type: BuildingType,
  targetLevel: number,
  symbioticCoreLevel = 0,
): number {
  const cost = buildingCost(type, targetLevel);
  const seconds =
    structuralCost(cost) / BUILD_TIME_DIVISOR / (1 + symbioticCoreLevel) / UNIVERSE_SPEED;
  return Math.max(BUILD_TIME_MIN_SECONDS, Math.round(seconds));
}

// ──────────────────────────── Production ─────────────────────────────────────

/** Facteur de stabilité écologique appliqué à la production (borné à un plancher). */
export function stabilityFactor(stability: number): number {
  const ratio = Math.max(0, Math.min(STABILITY_MAX, stability)) / STABILITY_MAX;
  return STABILITY_PRODUCTION_FLOOR + (1 - STABILITY_PRODUCTION_FLOOR) * ratio;
}

/** Production brute/heure d'un bâtiment producteur (avant modificateurs globaux). */
export function buildingBaseProduction(type: BuildingType, level: number): number {
  const cfg = BUILDINGS[type];
  if (!cfg.producesResource || !cfg.baseProduction || level <= 0) return 0;
  const factor = cfg.productionFactor ?? 1;
  return cfg.baseProduction * level * Math.pow(factor, level);
}

/** Consommation d'énergie d'un bâtiment à un niveau donné. */
export function buildingEnergyConsumption(type: BuildingType, level: number): number {
  const cfg = BUILDINGS[type];
  if (!cfg.baseEnergyConsumption || level <= 0) return 0;
  const factor = cfg.energyFactor ?? 1;
  return cfg.baseEnergyConsumption * level * Math.pow(factor, level);
}

/** Production d'énergie d'un bâtiment (canopée), bonifiée par Photosynthèse avancée. */
export function buildingEnergyProduction(
  type: BuildingType,
  level: number,
  advancedPhotosynthesisLevel = 0,
): number {
  const cfg = BUILDINGS[type];
  if (!cfg.baseEnergyProduction || level <= 0) return 0;
  const factor = cfg.energyFactor ?? 1;
  const bonus = 1 + ADVANCED_PHOTOSYNTHESIS_BONUS * advancedPhotosynthesisLevel;
  return cfg.baseEnergyProduction * level * Math.pow(factor, level) * bonus;
}

export interface ProductionInput {
  buildings: Partial<Record<BuildingType, number>>;
  research: Partial<Record<ResearchType, number>>;
  stability: number;
}

export interface ProductionResult {
  /** Production NETTE par heure et par ressource (après tous modificateurs). */
  perHour: Record<ResourceType, number>;
  energyProduced: number;
  energyConsumed: number;
  /** Ratio d'énergie disponible [0..1] appliqué à la production. */
  energyRatio: number;
}

function buildingLevel(input: ProductionInput, type: BuildingType): number {
  return input.buildings[type] ?? 0;
}

/**
 * Calcule la production horaire d'une planète.
 * Modificateurs : énergie (ratio), stabilité écologique, Génie génétique.
 */
export function computeProduction(input: ProductionInput): ProductionResult {
  const advPhoto = input.research[ResearchType.ADVANCED_PHOTOSYNTHESIS] ?? 0;
  const genetic = input.research[ResearchType.GENETIC_ENGINEERING] ?? 0;

  let energyProduced = 0;
  let energyConsumed = 0;
  for (const type of Object.values(BuildingType)) {
    const level = buildingLevel(input, type);
    energyProduced += buildingEnergyProduction(type, level, advPhoto);
    energyConsumed += buildingEnergyConsumption(type, level);
  }
  const energyRatio = energyConsumed > 0 ? Math.min(1, energyProduced / energyConsumed) : 1;

  const stab = stabilityFactor(input.stability);
  const geneticBonus = 1 + GENETIC_ENGINEERING_BONUS * genetic;

  const perHour = {} as Record<ResourceType, number>;
  for (const r of RESOURCE_TYPES) {
    perHour[r] = (PASSIVE_PRODUCTION[r] ?? 0) * UNIVERSE_SPEED;
  }
  for (const type of Object.values(BuildingType)) {
    const cfg = BUILDINGS[type];
    if (!cfg.producesResource) continue;
    const raw = buildingBaseProduction(type, buildingLevel(input, type));
    perHour[cfg.producesResource] += raw * geneticBonus * stab * energyRatio * UNIVERSE_SPEED;
  }
  for (const r of RESOURCE_TYPES) perHour[r] = Math.round(perHour[r] * 100) / 100;

  return { perHour, energyProduced, energyConsumed, energyRatio };
}

// ──────────────────────────── Stockage ───────────────────────────────────────

/** Capacité de stockage par ressource selon le niveau de Vacuole de Stockage. */
export function storageCap(vacuoleLevel: number): number {
  return Math.floor(BASE_STORAGE * Math.pow(STORAGE_FACTOR, Math.max(0, vacuoleLevel)));
}

// ──────────────────────────── Recherches ─────────────────────────────────────

export function researchCost(type: ResearchType, targetLevel: number): ResourceBundle {
  if (targetLevel < 1) return {};
  const cfg = RESEARCHES[type];
  return bundleScale(cfg.baseCost, Math.pow(cfg.costFactor, targetLevel - 1));
}

export function researchTimeSeconds(
  type: ResearchType,
  targetLevel: number,
  researchNexusLevel = 0,
): number {
  if (targetLevel < 1) return 0;
  const cfg = RESEARCHES[type];
  const base = cfg.baseTimeSeconds * Math.pow(cfg.timeFactor, targetLevel - 1);
  const seconds = base / (1 + researchNexusLevel * RESEARCH_NEXUS_SPEEDUP) / UNIVERSE_SPEED;
  return Math.max(BUILD_TIME_MIN_SECONDS, Math.round(seconds));
}

// ──────────────────────────── Planète / colonisation ─────────────────────────

/** Nombre d'emplacements (champs) d'une planète selon la Terraformation. */
export function planetFields(terraformationLevel: number): number {
  return BASE_PLANET_FIELDS + terraformationLevel * FIELDS_PER_TERRAFORMATION;
}

/** Nombre maximum de colonies (hors Noyau-Monde) selon la Propulsion sporale. */
export function maxColonies(sporalPropulsionLevel: number): number {
  return sporalPropulsionLevel * COLONIES_PER_PROPULSION_LEVEL;
}

/** Coût d'un essaimage selon le nombre de planètes déjà possédées (>= 1). */
export function colonizationCost(ownedPlanetCount: number): ResourceBundle {
  const n = Math.max(1, ownedPlanetCount);
  return bundleScale(COLONIZATION_BASE_COST, Math.pow(COLONIZATION_COST_FACTOR, n - 1));
}

/** Durée d'un essaimage (secondes), réduite par la Propulsion sporale. */
export function colonizationTimeSeconds(sporalPropulsionLevel: number): number {
  const seconds = COLONIZATION_BASE_TIME_SECONDS / (1 + 0.1 * sporalPropulsionLevel) / UNIVERSE_SPEED;
  return Math.max(BUILD_TIME_MIN_SECONDS, Math.round(seconds));
}

// ──────────────────────────── Prérequis ──────────────────────────────────────

export interface RequirementContext {
  buildings: Partial<Record<BuildingType, number>>;
  research: Partial<Record<ResearchType, number>>;
}

export interface UnmetRequirement {
  kind: 'building' | 'research';
  type: BuildingType | ResearchType;
  requiredLevel: number;
  currentLevel: number;
}

/** Liste les prérequis non satisfaits pour un bâtiment. Vide = constructible. */
export function unmetBuildingRequirements(
  type: BuildingType,
  ctx: RequirementContext,
): UnmetRequirement[] {
  return checkRequirements(BUILDINGS[type].requires, ctx);
}

/** Liste les prérequis non satisfaits pour une recherche. Vide = recherchable. */
export function unmetResearchRequirements(
  type: ResearchType,
  ctx: RequirementContext,
): UnmetRequirement[] {
  return checkRequirements(RESEARCHES[type].requires, ctx);
}

function checkRequirements(
  requires: { research?: Partial<Record<ResearchType, number>>; buildings?: Partial<Record<BuildingType, number>> } | undefined,
  ctx: RequirementContext,
): UnmetRequirement[] {
  const unmet: UnmetRequirement[] = [];
  if (!requires) return unmet;
  for (const [type, required] of Object.entries(requires.buildings ?? {})) {
    const current = ctx.buildings[type as BuildingType] ?? 0;
    if (current < required) {
      unmet.push({ kind: 'building', type: type as BuildingType, requiredLevel: required, currentLevel: current });
    }
  }
  for (const [type, required] of Object.entries(requires.research ?? {})) {
    const current = ctx.research[type as ResearchType] ?? 0;
    if (current < required) {
      unmet.push({ kind: 'research', type: type as ResearchType, requiredLevel: required, currentLevel: current });
    }
  }
  return unmet;
}
