import {
  BuildingType,
  CRAFTING_RECIPES,
  ITEMS,
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

// ───────────────────────── Liquidité « intelligente » du marché ─────────────────────────
//
// Les bots posent des ordres au repos ancrés à la juste valeur de chaque item
// (`ITEMS[item].baseValue`), pour CRÉER de la profondeur et un spread sain plutôt que
// de traverser le carnet. On ne vend que du vrai surplus et on n'achète que les
// ingrédients réellement consommés par les recettes de craft préférées (« pas bêtement »).

export interface MarketBook {
  bestBid: number | null;
  bestAsk: number | null;
  lastPrice: number | null;
}

/** État marché d'un item, pré-agrégé par le service pour rester déterministe et testable. */
export interface MarketLiquidityItemState {
  itemKey: ItemKey;
  /** Quantité totale détenue (toutes planètes confondues). */
  totalQuantity: number;
  /** Planète détenant le plus gros stock vendable, si surplus il y a. */
  bestSurplus: { planetId: string; quantity: number } | null;
  hasOpenSell: boolean;
  hasOpenBuy: boolean;
  book: MarketBook;
}

export interface MarketLiquidityInput {
  /** Bot tenant activement le marché (cotations plus serrées et buffers plus profonds). */
  isMarketMaker: boolean;
  openOrderCount: number;
  /** Biomasse disponible pour l'escrow (déjà nette de la réserve économique). */
  protectedBiomass: number;
  /** Planète qui porte les ordres d'achat (escrow biomasse). */
  buyerPlanetId: string;
  /** Items réellement consommés par le bot (ingrédients de craft). */
  neededItems: Set<ItemKey>;
  items: MarketLiquidityItemState[];
}

export interface MarketOrderIntent {
  planetId: string;
  itemKey: ItemKey;
  side: MarketOrderSide;
  pricePerUnit: number;
  quantity: number;
  reason: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Juste valeur d'un item : ancrée sur sa baseValue, légèrement tirée vers le dernier
 * prix observé, puis bornée dans une bande autour de la baseValue pour ne jamais courir
 * après un prix manipulé.
 */
export function marketFairValue(itemKey: ItemKey, lastPrice: number | null): number {
  const base = ITEMS[itemKey].baseValue;
  const blended = lastPrice != null && lastPrice > 0 ? base * 0.6 + lastPrice * 0.4 : base;
  const min = base * MYCOSYNTH_AI_CONFIG.marketFairValueBandMin;
  const max = base * MYCOSYNTH_AI_CONFIG.marketFairValueBandMax;
  return Math.round(clamp(blended, min, max));
}

/** Plancher de prix d'un item : on ne vend/achète jamais sous baseValue × ratio. */
export function marketItemFloor(itemKey: ItemKey): number {
  return Math.max(
    MYCOSYNTH_AI_CONFIG.marketPriceFloor,
    Math.round(ITEMS[itemKey].baseValue * MYCOSYNTH_AI_CONFIG.marketFloorRatio),
  );
}

/** Items dont le bot a réellement besoin = ingrédients de ses recettes de craft préférées. */
export function marketNeededItems(): Set<ItemKey> {
  const needed = new Set<ItemKey>();
  for (const recipeId of MYCOSYNTH_AI_CONFIG.preferredCraftingRecipes) {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      if (ingredient.itemKey) needed.add(ingredient.itemKey);
    }
  }
  return needed;
}

/**
 * Décide des ordres de liquidité à poser ce tick. Renvoie 0..N intentions, toujours dans
 * la limite de `maxOpenMarketOrders` et de la biomasse protégée disponible.
 */
export function planMarketOrders(input: MarketLiquidityInput): MarketOrderIntent[] {
  const intents: MarketOrderIntent[] = [];
  const maxOrders = MYCOSYNTH_AI_CONFIG.maxOpenMarketOrders;
  const qty = MYCOSYNTH_AI_CONFIG.marketOrderQuantity;
  const margin = input.isMarketMaker
    ? MYCOSYNTH_AI_CONFIG.marketMakerSpreadMargin
    : MYCOSYNTH_AI_CONFIG.marketSpreadMargin;
  // Les market-makers tiennent des buffers plus profonds : ils vendent dès un surplus
  // plus modeste et rachètent jusqu'à un stock cible plus élevé.
  const sellThreshold = input.isMarketMaker
    ? Math.max(1, Math.ceil(MYCOSYNTH_AI_CONFIG.marketSellSurplus / 2))
    : MYCOSYNTH_AI_CONFIG.marketSellSurplus;
  const buyTarget = input.isMarketMaker
    ? MYCOSYNTH_AI_CONFIG.marketBuyTargetStock * 2
    : MYCOSYNTH_AI_CONFIG.marketBuyTargetStock;

  let openCount = input.openOrderCount;
  let biomass = input.protectedBiomass;

  // ── Côté vente : on apporte de la profondeur en posant des asks AU-DESSUS du mid,
  //    uniquement sur du vrai surplus, jamais sous le plancher de l'item.
  for (const item of input.items) {
    if (openCount >= maxOrders) break;
    if (item.hasOpenSell) continue;
    const surplus = item.bestSurplus;
    if (!surplus || surplus.quantity < sellThreshold) continue;

    const fair = marketFairValue(item.itemKey, item.book.lastPrice);
    const floor = marketItemFloor(item.itemKey);
    const price = Math.max(floor, Math.round(fair * (1 + margin)));
    if (price < floor) continue;

    intents.push({
      planetId: surplus.planetId,
      itemKey: item.itemKey,
      side: MarketOrderSide.SELL,
      pricePerUnit: price,
      quantity: Math.min(qty, surplus.quantity),
      reason: input.isMarketMaker ? 'maker_ask' : 'surplus_ask',
    });
    openCount += 1;
  }

  // ── Côté achat : on apporte de la liquidité en posant des bids SOUS le mid, mais
  //    seulement sur les items réellement consommés et sous le stock cible, plafonnés à
  //    la juste valeur (jamais surpayer, jamais traverser le carnet).
  for (const item of input.items) {
    if (openCount >= maxOrders) break;
    if (!input.neededItems.has(item.itemKey)) continue;
    if (item.hasOpenBuy) continue;
    if (item.totalQuantity >= buyTarget) continue;

    const fair = marketFairValue(item.itemKey, item.book.lastPrice);
    let price = Math.round(fair * (1 - margin));
    if (item.book.bestAsk != null) {
      // Rester acheteur passif : ne jamais croiser le meilleur ask.
      price = Math.min(price, item.book.bestAsk - 1);
    }
    price = Math.max(price, MYCOSYNTH_AI_CONFIG.marketPriceFloor);
    if (price < 1) continue;

    const escrow = price * qty;
    if (biomass < escrow) continue;

    intents.push({
      planetId: input.buyerPlanetId,
      itemKey: item.itemKey,
      side: MarketOrderSide.BUY,
      pricePerUnit: price,
      quantity: qty,
      reason: input.isMarketMaker ? 'maker_bid' : 'need_bid',
    });
    openCount += 1;
    biomass -= escrow;
  }

  return intents;
}

function sumSelectedShips(ships: Partial<Record<ShipType, number>>, types: ShipType[]): number {
  return types.reduce((sum, type) => sum + (ships[type] ?? 0), 0);
}
