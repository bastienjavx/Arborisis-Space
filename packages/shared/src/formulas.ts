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
  BIOLOGICAL_WARFARE_BONUS,
  BUILDINGS,
  BUILD_TIME_DIVISOR,
  BUILD_TIME_MIN_SECONDS,
  CHITIN_ARMOR_BONUS,
  COLONIES_PER_PROPULSION_LEVEL,
  COLONIZATION_BASE_COST,
  COLONIZATION_BASE_TIME_SECONDS,
  COLONIZATION_COST_FACTOR,
  EXPEDITION_MIN_TRAVEL_SECONDS,
  EXPEDITION_OUTCOME_TABLE,
  EXPEDITION_SECONDS_PER_DISTANCE,
  FIELDS_PER_TERRAFORMATION,
  GENETIC_ENGINEERING_BONUS,
  NUTRIENT_CYCLING_BONUS,
  ORBITAL_DEFENSE_GRID_BONUS,
  PLANET_TYPES_CONFIG,
  RACES,
  racePassiveProduction,
  RESEARCHES,
  RESEARCH_NEXUS_SPEEDUP,
  ResourceBundle,
  SHIPS,
  SPORE_SENSE_BONUS,
  SPORAL_ECONOMY_BONUS,
  STABILITY_DECAY_RATE,
  STABILITY_DECAY_THRESHOLD,
  STABILITY_MAX,
  STABILITY_PRODUCTION_FLOOR,
  STABILITY_SPORANGE_REGEN,
  STORAGE_FACTOR,
  SUBTERRANEAN_ROOTS_BONUS,
  SYSTEMS_PER_GALAXY,
  UNIVERSE_SPEED,
} from './constants';
import {
  BuildingType,
  ExpeditionOutcome,
  PlanetType,
  PveOutcome,
  PvpOutcome,
  RaceType,
  ResearchType,
  ResourceType,
  RESOURCE_TYPES,
  ShipRole,
  ShipType,
} from './enums';

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
  planetType?: PlanetType;
  race?: RaceType;
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
 * Modificateurs : énergie (ratio), stabilité écologique, Génie génétique, type de planète.
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
  const planetBonus = input.planetType ? PLANET_TYPES_CONFIG[input.planetType].productionBonus : {};
  const race = input.race ?? RaceType.MYCELIANS;
  const raceBonus = RACES[race].productionBonus;

  const researchProductionBonus: Partial<Record<ResourceType, number>> = {
    [ResourceType.BIOMASS]:
      1 + NUTRIENT_CYCLING_BONUS * (input.research[ResearchType.NUTRIENT_CYCLING] ?? 0),
    [ResourceType.SAP]:
      1 + SUBTERRANEAN_ROOTS_BONUS * (input.research[ResearchType.SUBTERRANEAN_ROOTS] ?? 0),
    [ResourceType.SPORES]:
      1 + SPORAL_ECONOMY_BONUS * (input.research[ResearchType.SPORAL_ECONOMY] ?? 0),
  };

  const perHour = {} as Record<ResourceType, number>;
  const passive = racePassiveProduction(race);
  for (const r of RESOURCE_TYPES) {
    perHour[r] = (passive[r] ?? 0) * UNIVERSE_SPEED;
  }
  for (const type of Object.values(BuildingType)) {
    const cfg = BUILDINGS[type];
    if (!cfg.producesResource) continue;
    const raw = buildingBaseProduction(type, buildingLevel(input, type));
    perHour[cfg.producesResource] += raw * geneticBonus * stab * energyRatio * UNIVERSE_SPEED;
  }
  for (const r of RESOURCE_TYPES) {
    perHour[r] =
      Math.round(
        perHour[r] *
          (planetBonus[r] ?? 1) *
          (raceBonus[r] ?? 1) *
          (researchProductionBonus[r] ?? 1) *
          100,
      ) / 100;
  }

  return { perHour, energyProduced, energyConsumed, energyRatio };
}

/** Décroissance nette de stabilité par heure (0 si pas de pression écologique). */
export function computeStabilityDecay(
  usedFields: number,
  maxFields: number,
  sporrangeLevel: number,
): number {
  const occupancyRatio = maxFields > 0 ? usedFields / maxFields : 0;
  const decay = Math.max(0, (occupancyRatio - STABILITY_DECAY_THRESHOLD) * STABILITY_DECAY_RATE);
  const regen = sporrangeLevel * STABILITY_SPORANGE_REGEN;
  return Math.max(0, decay - regen);
}

/** Réduit le temps de recherche selon le nombre d'artefacts arborisiens (max 3, -5% chacun). */
export function computeResearchTimeWithArtifacts(
  baseSeconds: number,
  artifactCount: number,
): number {
  const reduction = Math.min(3, Math.max(0, artifactCount)) * 0.05;
  return Math.max(BUILD_TIME_MIN_SECONDS, Math.round(baseSeconds * (1 - reduction)));
}

// ──────────────────────────── Stockage ───────────────────────────────────────

/** Capacité de stockage par ressource selon le niveau de Vacuole de Stockage. */
export function storageCap(vacuoleLevel: number): number {
  return Math.floor(BASE_STORAGE * Math.pow(STORAGE_FACTOR, Math.max(0, vacuoleLevel)));
}

// ──────────────────────────── Recherches ─────────────────────────────────────

export function researchCost(
  type: ResearchType,
  targetLevel: number,
  race: RaceType = RaceType.MYCELIANS,
): ResourceBundle {
  if (targetLevel < 1) return {};
  const cfg = RESEARCHES[type];
  const cost = bundleScale(cfg.baseCost, Math.pow(cfg.costFactor, targetLevel - 1));
  const factor = RACES[race].researchCostFactor;
  if (factor === 1) return cost;
  return bundleScale(cost, factor);
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
  const seconds =
    COLONIZATION_BASE_TIME_SECONDS / (1 + 0.1 * sporalPropulsionLevel) / UNIVERSE_SPEED;
  return Math.max(BUILD_TIME_MIN_SECONDS, Math.round(seconds));
}

// ──────────────────────────── Flottes / expéditions ─────────────────────────

export type ShipCounts = Record<ShipType, number>;

export function shipCost(type: ShipType, quantity: number): ResourceBundle {
  return bundleScale(SHIPS[type].cost, Math.max(0, Math.floor(quantity)));
}

export function shipProductionTimeSeconds(
  type: ShipType,
  quantity: number,
  nurseryLevel: number,
): number {
  if (quantity <= 0 || nurseryLevel <= 0) return 0;
  return Math.max(
    BUILD_TIME_MIN_SECONDS,
    Math.round(
      (SHIPS[type].baseTimeSeconds * quantity) / (1 + nurseryLevel * 0.5) / UNIVERSE_SPEED,
    ),
  );
}

/** Vitesse effective d'un vaisseau selon la race. */
export function shipSpeed(type: ShipType, race: RaceType = RaceType.MYCELIANS): number {
  return Math.round(SHIPS[type].speed * RACES[race].shipSpeedFactor * 100) / 100;
}

export function fleetCargo(ships: Partial<ShipCounts>): number {
  return Object.values(ShipType).reduce(
    (sum, type) => sum + Math.max(0, ships[type] ?? 0) * SHIPS[type].cargo,
    0,
  );
}

export function expeditionDistance(
  from: { galaxy: number; system: number },
  to: { galaxy: number; system: number },
): number {
  return Math.max(
    1,
    Math.abs(from.galaxy - to.galaxy) * SYSTEMS_PER_GALAXY + Math.abs(from.system - to.system),
  );
}

export function expeditionTravelTimeSeconds(
  from: { galaxy: number; system: number },
  to: { galaxy: number; system: number },
  ships: Partial<ShipCounts>,
  race: RaceType = RaceType.MYCELIANS,
): number {
  const present = Object.values(ShipType).filter((type) => (ships[type] ?? 0) > 0);
  if (present.length === 0) return 0;
  const slowest = Math.min(...present.map((type) => shipSpeed(type, race)));
  return Math.max(
    EXPEDITION_MIN_TRAVEL_SECONDS,
    Math.round(
      (expeditionDistance(from, to) * EXPEDITION_SECONDS_PER_DISTANCE) / slowest / UNIVERSE_SPEED,
    ),
  );
}

/** Table v2 : 8 résultats possibles. VOID_RIFT triple la zone ANOMALY. */
export function expeditionOutcomeFromRoll(roll: number, voidRiftActive = false): ExpeditionOutcome {
  const normalized = Math.max(0, Math.min(9_999, Math.floor(roll)));
  if (voidRiftActive) {
    if (normalized < 5_000) return ExpeditionOutcome.RESOURCE_CACHE;
    if (normalized < 6_500) return ExpeditionOutcome.RARE_SPORES;
    if (normalized < 7_500) return ExpeditionOutcome.DERELICT_SHIP;
    if (normalized < 8_000) return ExpeditionOutcome.INCIDENT;
    if (normalized < 9_800) return ExpeditionOutcome.ANOMALY;
    return ExpeditionOutcome.CONVERGENCE_BLOOM;
  }
  for (const entry of EXPEDITION_OUTCOME_TABLE) {
    if (normalized >= entry.minRoll && normalized <= entry.maxRoll) return entry.outcome;
  }
  return ExpeditionOutcome.CONVERGENCE_BLOOM;
}

export function expeditionIncidentLossPercent(roll: number): number {
  return 10 + (Math.max(0, Math.floor(roll)) % 21);
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
  requires:
    | {
        research?: Partial<Record<ResearchType, number>>;
        buildings?: Partial<Record<BuildingType, number>>;
      }
    | undefined,
  ctx: RequirementContext,
): UnmetRequirement[] {
  const unmet: UnmetRequirement[] = [];
  if (!requires) return unmet;
  for (const [type, required] of Object.entries(requires.buildings ?? {})) {
    const current = ctx.buildings[type as BuildingType] ?? 0;
    if (current < required) {
      unmet.push({
        kind: 'building',
        type: type as BuildingType,
        requiredLevel: required,
        currentLevel: current,
      });
    }
  }
  for (const [type, required] of Object.entries(requires.research ?? {})) {
    const current = ctx.research[type as ResearchType] ?? 0;
    if (current < required) {
      unmet.push({
        kind: 'research',
        type: type as ResearchType,
        requiredLevel: required,
        currentLevel: current,
      });
    }
  }
  return unmet;
}

// ──────────────────────────── PvE ────────────────────────────────────────────

export interface PveResolveInput {
  fleetPower: number;
  npcPower: number;
  ships: Partial<ShipCounts>;
  race: RaceType;
  difficulty: number;
}

export interface PveResolveResult {
  outcome: PveOutcome;
  lostShips: Partial<ShipCounts>;
  rewards: ResourceBundle;
  damageDealt: number;
}

/** Puissance de combat d'une flotte (attaque + défense/2 + coque/4) × race.attackFactor. */
export function fleetCombatPower(ships: Partial<ShipCounts>, race: RaceType): number {
  let power = 0;
  for (const type of Object.values(ShipType)) {
    const quantity = ships[type] ?? 0;
    if (quantity <= 0) continue;
    const cfg = SHIPS[type];
    power +=
      (cfg.attack + cfg.defense * 0.5 + cfg.hull * 0.25) * quantity * RACES[race].attackFactor;
  }
  return Math.round(power);
}

/** Puissance de combat d'une anomalie hostile. */
export function npcCombatPower(difficulty: number): number {
  return difficulty * 150;
}

/** Temps de trajet pour un raid PvE (même formule qu'une expédition). */
export function pveTravelTimeSeconds(
  from: { galaxy: number; system: number },
  to: { galaxy: number; system: number; position?: number },
  ships: Partial<ShipCounts>,
  race: RaceType = RaceType.MYCELIANS,
): number {
  return expeditionTravelTimeSeconds(from, to, ships, race);
}

/** Durée du combat en secondes : 60s + 30s par tranche de 500 de puissance ennemie. */
export function pveCombatDurationSeconds(fleetPower: number, npcPower: number): number {
  const maxPower = Math.max(fleetPower, npcPower);
  return 60 + Math.floor(maxPower / 500) * 30;
}

/** Résout un combat PvE : issue, pertes et récompenses. */
export function pveResolve(input: PveResolveInput): PveResolveResult {
  const { fleetPower, npcPower, ships, difficulty } = input;
  const ratio = fleetPower / Math.max(1, npcPower);

  let outcome: PveOutcome;
  if (ratio >= 1.5) outcome = PveOutcome.VICTORY;
  else if (ratio >= 0.8) outcome = PveOutcome.RETREAT;
  else outcome = PveOutcome.DEFEAT;

  const lostShips: Partial<ShipCounts> = {};
  const totalShips = Object.values(ShipType).reduce((sum, type) => sum + (ships[type] ?? 0), 0);

  if (outcome === PveOutcome.VICTORY) {
    const lossRate = Math.max(0, 0.05 + (1 - ratio) * 0.15);
    for (const type of Object.values(ShipType)) {
      const qty = ships[type] ?? 0;
      if (qty > 0) {
        lostShips[type] = Math.min(qty, Math.max(0, Math.floor(qty * lossRate)));
      }
    }
  } else if (outcome === PveOutcome.RETREAT) {
    const lossRate = 0.25;
    for (const type of Object.values(ShipType)) {
      const qty = ships[type] ?? 0;
      if (qty > 0) {
        lostShips[type] = Math.min(qty, Math.max(0, Math.floor(qty * lossRate)));
      }
    }
  } else {
    // Défaite : pertes massives, les survivants fuient (déterministe).
    const lossRate = 0.85;
    for (const type of Object.values(ShipType)) {
      const qty = ships[type] ?? 0;
      if (qty > 0) {
        lostShips[type] = Math.min(qty, Math.max(0, Math.floor(qty * lossRate)));
      }
    }
  }

  const rewards: ResourceBundle = {};
  if (outcome === PveOutcome.VICTORY || outcome === PveOutcome.RETREAT) {
    const baseReward = difficulty * 500;
    rewards[ResourceType.BIOMASS] = Math.floor(baseReward * 0.4);
    rewards[ResourceType.SAP] = Math.floor(baseReward * 0.25);
    rewards[ResourceType.MINERALS] = Math.floor(baseReward * 0.25);
    rewards[ResourceType.SPORES] = Math.floor(baseReward * 0.1);
  }

  const damageDealt =
    outcome === PveOutcome.DEFEAT
      ? Math.floor(fleetPower * 0.3)
      : Math.floor(fleetPower * (outcome === PveOutcome.VICTORY ? 1.2 : 0.7));

  // Normalise les pertes pour ne jamais dépasser les effectifs.
  const normalizedLost: Partial<ShipCounts> = {};
  for (const type of Object.values(ShipType)) {
    const qty = ships[type] ?? 0;
    const lost = lostShips[type] ?? 0;
    normalizedLost[type] = Math.min(qty, Math.max(0, lost));
  }

  // En cas de défaite totale (tous vaisseaux perdus), on borne à totalShips - 1 pour garder l'issue dramatique.
  if (outcome === PveOutcome.DEFEAT && totalShips > 0) {
    const lostTotal = Object.values(normalizedLost).reduce((sum, v) => sum + (v ?? 0), 0);
    if (lostTotal >= totalShips) {
      const firstType = Object.values(ShipType).find((type) => (ships[type] ?? 0) > 0);
      if (firstType) {
        normalizedLost[firstType] = Math.max(0, (ships[firstType] ?? 0) - 1);
      }
    }
  }

  return { outcome, lostShips: normalizedLost, rewards, damageDealt };
}

// ──────────────────────────── PvP ────────────────────────────────────────────

/** Temps de trajet pour une mission PvP (même formule qu'une expédition). */
export function pvpTravelTimeSeconds(
  from: { galaxy: number; system: number; position?: number },
  to: { galaxy: number; system: number; position?: number },
  ships: Partial<ShipCounts>,
  race: RaceType = RaceType.MYCELIANS,
): number {
  return expeditionTravelTimeSeconds(from, to, ships, race);
}

export interface DefensePowerInput {
  ships: Partial<ShipCounts>;
  race: RaceType;
  orbitalDefenseGridLevel?: number;
}

/** Puissance défensive d'une planète : flotte en orbite + défenses. */
export function computeDefensePower(input: DefensePowerInput): number {
  const { ships, race, orbitalDefenseGridLevel = 0 } = input;
  let power = 0;
  for (const type of Object.values(ShipType)) {
    const quantity = ships[type] ?? 0;
    if (quantity <= 0) continue;
    const cfg = SHIPS[type];
    let value = cfg.defense + cfg.hull * 0.5;
    if (type === ShipType.ORBITAL_THORN) {
      value *= 1.5;
    }
    power += value * quantity;
  }
  const gridBonus = 1 + ORBITAL_DEFENSE_GRID_BONUS * orbitalDefenseGridLevel;
  return Math.round(power * RACES[race].defenseFactor * gridBonus);
}

export interface PvpAttackInput {
  attackerShips: Partial<ShipCounts>;
  defenderShips: Partial<ShipCounts>;
  attackerRace: RaceType;
  defenderRace: RaceType;
  attackerResearch?: Partial<Record<ResearchType, number>>;
  defenderResearch?: Partial<Record<ResearchType, number>>;
  targetResources?: ResourceBundle;
}

export interface PvpAttackResult {
  outcome: PvpOutcome;
  lostShips: Partial<ShipCounts>;
  defenderLosses: Partial<ShipCounts>;
  loot: ResourceBundle;
}

/** Résout un combat PvP : issue, pertes des deux côtés et butin maximal. */
export function resolvePvpAttack(input: PvpAttackInput): PvpAttackResult {
  const {
    attackerShips,
    defenderShips,
    attackerRace,
    defenderRace,
    attackerResearch = {},
    defenderResearch = {},
    targetResources = {},
  } = input;

  const biologicalWarfare = attackerResearch[ResearchType.BIOLOGICAL_WARFARE] ?? 0;
  const chitinArmor = defenderResearch[ResearchType.CHITIN_ARMOR] ?? 0;

  const attackerPower =
    fleetCombatPower(attackerShips, attackerRace) *
    (1 + BIOLOGICAL_WARFARE_BONUS * biologicalWarfare);
  const defenderPower =
    computeDefensePower({
      ships: defenderShips,
      race: defenderRace,
      orbitalDefenseGridLevel: defenderResearch[ResearchType.ORBITAL_DEFENSE_GRID] ?? 0,
    }) *
    (1 + CHITIN_ARMOR_BONUS * chitinArmor);

  const ratio = attackerPower / Math.max(1, defenderPower);

  let outcome: PvpOutcome;
  if (ratio >= 1.5) outcome = PvpOutcome.SUCCESS;
  else if (ratio >= 0.8) outcome = PvpOutcome.DRAW;
  else outcome = PvpOutcome.FAILURE;

  const lostShips: Partial<ShipCounts> = {};
  const defenderLosses: Partial<ShipCounts> = {};

  if (outcome === PvpOutcome.SUCCESS) {
    const attackerLossRate = Math.max(0, 0.05 + (1 - Math.min(ratio, 1.5)) * 0.15);
    const defenderLossRate = Math.min(0.75, 0.25 + Math.max(0, ratio - 1) * 0.2);
    for (const type of Object.values(ShipType)) {
      const atkQty = attackerShips[type] ?? 0;
      if (atkQty > 0) lostShips[type] = Math.min(atkQty, Math.floor(atkQty * attackerLossRate));
      const defQty = defenderShips[type] ?? 0;
      if (defQty > 0)
        defenderLosses[type] = Math.min(defQty, Math.floor(defQty * defenderLossRate));
    }
  } else if (outcome === PvpOutcome.DRAW) {
    const lossRate = 0.25;
    for (const type of Object.values(ShipType)) {
      const atkQty = attackerShips[type] ?? 0;
      if (atkQty > 0) lostShips[type] = Math.min(atkQty, Math.floor(atkQty * lossRate));
      const defQty = defenderShips[type] ?? 0;
      if (defQty > 0) defenderLosses[type] = Math.min(defQty, Math.floor(defQty * lossRate));
    }
  } else {
    const attackerLossRate = 0.75;
    const defenderLossRate = 0.15;
    for (const type of Object.values(ShipType)) {
      const atkQty = attackerShips[type] ?? 0;
      if (atkQty > 0) lostShips[type] = Math.min(atkQty, Math.floor(atkQty * attackerLossRate));
      const defQty = defenderShips[type] ?? 0;
      if (defQty > 0)
        defenderLosses[type] = Math.min(defQty, Math.floor(defQty * defenderLossRate));
    }
  }

  const survivingShips: Partial<ShipCounts> = {};
  for (const type of Object.values(ShipType)) {
    survivingShips[type] = Math.max(0, (attackerShips[type] ?? 0) - (lostShips[type] ?? 0));
  }
  const cargoCapacity = fleetCargo(survivingShips);

  const loot: ResourceBundle = {};
  if (outcome === PvpOutcome.SUCCESS || outcome === PvpOutcome.DRAW) {
    const lootFactor = outcome === PvpOutcome.SUCCESS ? 0.5 : 0.25;
    let totalLoot = 0;
    for (const resource of Object.values(ResourceType)) {
      const available = targetResources[resource] ?? 0;
      loot[resource] = Math.floor(available * lootFactor);
      totalLoot += loot[resource] ?? 0;
    }
    if (totalLoot > cargoCapacity) {
      const scale = cargoCapacity / totalLoot;
      for (const resource of Object.values(ResourceType)) {
        loot[resource] = Math.floor((loot[resource] ?? 0) * scale);
      }
    }
  }

  return { outcome, lostShips, defenderLosses, loot };
}

export interface SpyInput {
  ships: Partial<ShipCounts>;
  defensePower: number;
  sporeSenseLevel?: number;
}

export interface SpyResult {
  success: boolean;
  detectionChance: number;
}

/** Résout une tentative d'espionnage. */
export function resolveSpy(input: SpyInput): SpyResult {
  const { ships, defensePower, sporeSenseLevel = 0 } = input;
  let spyPower = 0;
  for (const type of Object.values(ShipType)) {
    const quantity = ships[type] ?? 0;
    if (quantity <= 0) continue;
    const cfg = SHIPS[type];
    if (cfg.role !== ShipRole.ESPIONAGE) continue;
    spyPower += (cfg.speed * 4 + cfg.attack + cfg.defense) * quantity;
  }
  const bonus = 1 + SPORE_SENSE_BONUS * sporeSenseLevel;
  const detectionChance = (spyPower * bonus) / (spyPower * bonus + defensePower + 1);
  const success = detectionChance >= 0.5;
  return { success, detectionChance: Math.round(detectionChance * 100) / 100 };
}
