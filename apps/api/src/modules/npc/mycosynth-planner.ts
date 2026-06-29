import {
  BuildingType,
  ItemKey,
  MarketOrderSide,
  MYCOSYNTH_AI_CONFIG,
  ResearchType,
  ResourceType,
  SHIPS,
  ShipRole,
  ShipType,
  type ResourceBundle,
} from '@arborisis/shared';

export interface MycosynthResourceSnapshot {
  amounts: Record<ResourceType, number>;
  capacity: Record<ResourceType, number>;
  perHour: Record<ResourceType, number>;
  energyRatio: number;
}

export interface MycosynthPlanetSnapshot {
  id: string;
  isHomeworld: boolean;
  buildings: Partial<Record<BuildingType, number>>;
  research: Partial<Record<ResearchType, number>>;
  resources: MycosynthResourceSnapshot;
  ships: Partial<Record<ShipType, number>>;
}

export interface MycosynthBuildingDecision {
  type: BuildingType;
  score: number;
  reason: string;
}

export interface MycosynthShipDecision {
  type: ShipType;
  quantity: number;
  score: number;
  reason: string;
}

export interface MycosynthAttackDecisionInput {
  attackerPower: number;
  defenderPower: number;
  hasFreshSpy: boolean;
  recentAttacksAgainstOwner: number;
  recentAttacksAgainstPlanet: number;
}

export interface MycosynthMarketDecisionInput {
  openOrderCount: number;
  side: MarketOrderSide;
  inventoryQuantity: number;
  pricePerUnit: number;
}

export interface MycosynthTradeRouteDecisionInput {
  activeRouteCount: number;
  duplicateExists: boolean;
  sourceRatio: number;
  targetRatio: number;
}

const PRODUCTION_BUILDINGS: Array<[ResourceType, BuildingType]> = [
  [ResourceType.BIOMASS, BuildingType.BIOMASS_SYNTHESIZER],
  [ResourceType.SAP, BuildingType.SAP_WELL],
  [ResourceType.MINERALS, BuildingType.MINERAL_VEIN],
  [ResourceType.SPORES, BuildingType.SPORANGE],
];

const SPY_SHIPS = [ShipType.MYCELIAL_TENDRIL, ShipType.SHADOW_SPORE];
const TRANSPORT_SHIPS = [
  ShipType.SYMBIOTIC_HARVESTER,
  ShipType.CHITIN_FREIGHTER,
  ShipType.SEED_POD,
];
const EXPEDITION_CORE_SHIPS = [ShipType.SPORAL_SCOUT, ShipType.SYMBIOTIC_HARVESTER];
const COMBAT_SHIPS = [
  ShipType.SPORAL_DRONE,
  ShipType.ACID_BOMBER,
  ShipType.CHITIN_DESTROYER,
  ShipType.BIOMASS_DREADNOUGHT,
  ShipType.BIOLUMINESCENT_CRUISER,
  ShipType.ORBITAL_THORN,
  ShipType.SPORAL_SWARM,
  ShipType.LUMINOUS_WARDEN,
  ShipType.CHITIN_BULWARK,
];

export function chooseBuildingUpgrade(
  planet: MycosynthPlanetSnapshot,
): MycosynthBuildingDecision[] {
  const decisions: MycosynthBuildingDecision[] = [];
  const maxResourceRatio = Math.max(
    ...Object.values(ResourceType).map((resource) => resourceRatio(planet.resources, resource)),
  );
  const totalShips = sumShips(planet.ships);
  const nursery = planet.buildings[BuildingType.ORBITAL_NURSERY] ?? 0;
  const researchNexus = planet.buildings[BuildingType.RESEARCH_NEXUS] ?? 0;

  if (planet.resources.energyRatio < 1.08) {
    decisions.push({
      type: BuildingType.PHOTOSYNTHETIC_CANOPY,
      score: 120 + (1.08 - planet.resources.energyRatio) * 100,
      reason: 'energy_deficit',
    });
  }

  if (maxResourceRatio >= 0.82) {
    decisions.push({
      type: BuildingType.STORAGE_VACUOLE,
      score: 105 + maxResourceRatio * 30,
      reason: 'storage_pressure',
    });
  }

  if ((planet.resources.perHour[ResourceType.SPORES] ?? 0) < 8) {
    decisions.push({
      type: BuildingType.SPORANGE,
      score: 88,
      reason: 'spore_economy',
    });
  }

  if (nursery < 1 || totalShips < MYCOSYNTH_AI_CONFIG.minCombatShipsForPve) {
    decisions.push({
      type: BuildingType.ORBITAL_NURSERY,
      score: nursery < 1 ? 92 : 74,
      reason: 'fleet_capacity',
    });
  }

  if (planet.isHomeworld && researchNexus < 8) {
    decisions.push({
      type: BuildingType.RESEARCH_NEXUS,
      score: 72 + Math.max(0, 5 - researchNexus) * 3,
      reason: 'research_velocity',
    });
  }

  const weakest = [...PRODUCTION_BUILDINGS].sort(
    ([resourceA], [resourceB]) =>
      (planet.resources.perHour[resourceA] ?? 0) - (planet.resources.perHour[resourceB] ?? 0),
  )[0];
  if (weakest) {
    const [resource, type] = weakest;
    decisions.push({
      type,
      score: 65 + Math.max(0, 20 - (planet.resources.perHour[resource] ?? 0)),
      reason: `${resource.toLowerCase()}_income`,
    });
  }

  decisions.push({
    type: BuildingType.SYMBIOTIC_CORE,
    score: 52,
    reason: 'construction_velocity',
  });

  return decisions.sort((a, b) => b.score - a.score);
}

export function chooseShipProduction(
  planet: MycosynthPlanetSnapshot,
  buildableTypes: ShipType[],
): MycosynthShipDecision[] {
  const decisions: MycosynthShipDecision[] = [];
  const spyCount = sumSelectedShips(planet.ships, SPY_SHIPS);
  const transportCount = sumSelectedShips(planet.ships, TRANSPORT_SHIPS);
  const expeditionCount = sumSelectedShips(planet.ships, EXPEDITION_CORE_SHIPS);
  const combatCount = sumCombatShips(planet.ships);

  const firstBuildable = (types: ShipType[]) => types.find((type) => buildableTypes.includes(type));

  const spy = firstBuildable(SPY_SHIPS);
  if (spy && spyCount < MYCOSYNTH_AI_CONFIG.minSpyShips) {
    decisions.push({
      type: spy,
      quantity: MYCOSYNTH_AI_CONFIG.minSpyShips - spyCount,
      score: 112,
      reason: 'missing_spy_network',
    });
  }

  const transport = firstBuildable(TRANSPORT_SHIPS);
  if (transport && transportCount < MYCOSYNTH_AI_CONFIG.minTransportShips) {
    decisions.push({
      type: transport,
      quantity: MYCOSYNTH_AI_CONFIG.minTransportShips - transportCount,
      score: 98,
      reason: 'missing_logistics',
    });
  }

  const scout = firstBuildable(EXPEDITION_CORE_SHIPS);
  if (scout && expeditionCount < 3) {
    decisions.push({
      type: scout,
      quantity: 3 - expeditionCount,
      score: 86,
      reason: 'missing_expedition_core',
    });
  }

  const combat = firstBuildable(COMBAT_SHIPS);
  if (combat && combatCount < MYCOSYNTH_AI_CONFIG.minCombatShipsForAttack) {
    decisions.push({
      type: combat,
      quantity: Math.min(20, MYCOSYNTH_AI_CONFIG.minCombatShipsForAttack - combatCount),
      score: 82 + Math.max(0, MYCOSYNTH_AI_CONFIG.minCombatShipsForAttack - combatCount),
      reason: 'missing_attack_mass',
    });
  }

  for (const type of buildableTypes) {
    const cfg = SHIPS[type];
    if (
      ![ShipRole.COMBAT, ShipRole.SUPPORT, ShipRole.TRANSPORT, ShipRole.ESPIONAGE].includes(
        cfg.role,
      )
    ) {
      continue;
    }
    decisions.push({
      type,
      quantity: cfg.role === ShipRole.COMBAT ? 10 : 2,
      score: cfg.attack + cfg.defense + (cfg.role === ShipRole.COMBAT ? 25 : 0),
      reason: 'fleet_mix',
    });
  }

  return decisions.sort((a, b) => b.score - a.score);
}

export function shouldLaunchAttack(
  input: MycosynthAttackDecisionInput,
  minRatio: number = MYCOSYNTH_AI_CONFIG.minAttackPowerRatio,
): boolean {
  if (!input.hasFreshSpy) return false;
  if (input.recentAttacksAgainstOwner > 0 || input.recentAttacksAgainstPlanet > 0) return false;
  const ratio = input.attackerPower / Math.max(1, input.defenderPower);
  return ratio >= minRatio;
}

export function shouldPlaceMarketOrder(input: MycosynthMarketDecisionInput): boolean {
  if (input.openOrderCount >= MYCOSYNTH_AI_CONFIG.maxOpenMarketOrders) return false;
  if (input.pricePerUnit < MYCOSYNTH_AI_CONFIG.marketPriceFloor) return false;
  if (input.side === MarketOrderSide.SELL) {
    return input.inventoryQuantity >= MYCOSYNTH_AI_CONFIG.marketSellSurplus;
  }
  return input.inventoryQuantity <= MYCOSYNTH_AI_CONFIG.marketBuyShortage;
}

export function shouldCreateTradeRoute(input: MycosynthTradeRouteDecisionInput): boolean {
  if (input.activeRouteCount >= MYCOSYNTH_AI_CONFIG.maxActiveTradeRoutes) return false;
  if (input.duplicateExists) return false;
  return (
    input.sourceRatio >= MYCOSYNTH_AI_CONFIG.resourceTransferHighRatio &&
    input.targetRatio <= MYCOSYNTH_AI_CONFIG.resourceTransferLowRatio
  );
}

export function resourceRatio(snapshot: MycosynthResourceSnapshot, resource: ResourceType): number {
  return (snapshot.amounts[resource] ?? 0) / Math.max(1, snapshot.capacity[resource] ?? 1);
}

export function sumShips(ships: Partial<Record<ShipType, number>>): number {
  return Object.values(ShipType).reduce((sum, type) => sum + (ships[type] ?? 0), 0);
}

export function sumCombatShips(ships: Partial<Record<ShipType, number>>): number {
  return Object.values(ShipType).reduce((sum, type) => {
    const cfg = SHIPS[type];
    if (![ShipRole.COMBAT, ShipRole.DEFENSE, ShipRole.SUPPORT].includes(cfg.role)) return sum;
    return sum + (ships[type] ?? 0);
  }, 0);
}

export function reserveProtectedAmounts(
  amounts: Record<ResourceType, number>,
): Record<ResourceType, number> {
  return Object.fromEntries(
    Object.values(ResourceType).map((resource) => [
      resource,
      Math.max(0, amounts[resource] - (MYCOSYNTH_AI_CONFIG.economyReserve[resource] ?? 0)),
    ]),
  ) as Record<ResourceType, number>;
}

export function totalResourceValue(bundle: ResourceBundle): number {
  return Object.values(ResourceType).reduce((sum, resource) => sum + (bundle[resource] ?? 0), 0);
}

export function preferredMarketItems(): ItemKey[] {
  return [
    ItemKey.MYCOTOXIN_VIAL,
    ItemKey.REINFORCED_CHITIN,
    ItemKey.NEURAL_MATRIX,
    ItemKey.VOID_ALLOY,
    ItemKey.SPORE_ESSENCE,
    ItemKey.CHITIN_SHARD,
    ItemKey.MYCELIAL_FIBER,
    ItemKey.BIOLUMINESCENT_GEL,
  ];
}

function sumSelectedShips(ships: Partial<Record<ShipType, number>>, types: ShipType[]): number {
  return types.reduce((sum, type) => sum + (ships[type] ?? 0), 0);
}
