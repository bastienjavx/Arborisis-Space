import {
  ITEMS,
  ItemKey,
  MarketOrderSide,
  BuildingType,
  MYCOSYNTH_AI_CONFIG,
  ResourceType,
  ShipType,
} from '@arborisis/shared';
import {
  chooseBuildingUpgrade,
  chooseShipProduction,
  marketFairValue,
  marketItemFloor,
  marketNeededItems,
  planMarketOrders,
  shouldCreateTradeRoute,
  shouldLaunchAttack,
  shouldPlaceMarketOrder,
  type MarketLiquidityItemState,
  type MycosynthPlanetSnapshot,
} from './mycosynth-planner';

function planet(overrides: Partial<MycosynthPlanetSnapshot> = {}): MycosynthPlanetSnapshot {
  return {
    id: 'planet-1',
    isHomeworld: true,
    buildings: {},
    research: {},
    resources: {
      amounts: {
        [ResourceType.BIOMASS]: 1_000,
        [ResourceType.SAP]: 1_000,
        [ResourceType.MINERALS]: 1_000,
        [ResourceType.SPORES]: 100,
      },
      capacity: {
        [ResourceType.BIOMASS]: 10_000,
        [ResourceType.SAP]: 10_000,
        [ResourceType.MINERALS]: 10_000,
        [ResourceType.SPORES]: 10_000,
      },
      perHour: {
        [ResourceType.BIOMASS]: 30,
        [ResourceType.SAP]: 20,
        [ResourceType.MINERALS]: 15,
        [ResourceType.SPORES]: 5,
      },
      energyRatio: 1.2,
    },
    ships: {},
    ...overrides,
  };
}

describe('Mycosynth planner', () => {
  it('prioritizes canopy when energy is low', () => {
    const decisions = chooseBuildingUpgrade(
      planet({ resources: { ...planet().resources, energyRatio: 0.7 } }),
    );

    expect(decisions[0]?.type).toBe(BuildingType.PHOTOSYNTHETIC_CANOPY);
  });

  it('prioritizes storage when resources are close to capacity', () => {
    const base = planet();
    const decisions = chooseBuildingUpgrade(
      planet({
        resources: {
          ...base.resources,
          amounts: { ...base.resources.amounts, [ResourceType.BIOMASS]: 9_200 },
        },
      }),
    );

    expect(decisions[0]?.type).toBe(BuildingType.STORAGE_VACUOLE);
  });

  it('fills spy and transport gaps before generic combat mass', () => {
    const decisions = chooseShipProduction(planet(), [
      ShipType.MYCELIAL_TENDRIL,
      ShipType.SYMBIOTIC_HARVESTER,
      ShipType.SPORAL_DRONE,
    ]);

    expect(decisions[0]?.type).toBe(ShipType.MYCELIAL_TENDRIL);
    expect(decisions.some((decision) => decision.type === ShipType.SYMBIOTIC_HARVESTER)).toBe(true);
  });

  it('requires fresh intelligence and cooldown clearance before attacks', () => {
    expect(
      shouldLaunchAttack({
        attackerPower: 5_000,
        defenderPower: 2_000,
        hasFreshSpy: false,
        recentAttacksAgainstOwner: 0,
        recentAttacksAgainstPlanet: 0,
      }),
    ).toBe(false);

    expect(
      shouldLaunchAttack({
        attackerPower: 5_000,
        defenderPower: 2_000,
        hasFreshSpy: true,
        recentAttacksAgainstOwner: 1,
        recentAttacksAgainstPlanet: 0,
      }),
    ).toBe(false);

    expect(
      shouldLaunchAttack({
        attackerPower: 5_000,
        defenderPower: 2_000,
        hasFreshSpy: true,
        recentAttacksAgainstOwner: 0,
        recentAttacksAgainstPlanet: 0,
      }),
    ).toBe(true);
  });

  it('limits market making by order count, price, and inventory state', () => {
    expect(
      shouldPlaceMarketOrder({
        openOrderCount: MYCOSYNTH_AI_CONFIG.maxOpenMarketOrders,
        side: MarketOrderSide.SELL,
        inventoryQuantity: 99,
        pricePerUnit: 200,
      }),
    ).toBe(false);

    expect(
      shouldPlaceMarketOrder({
        openOrderCount: 0,
        side: MarketOrderSide.SELL,
        inventoryQuantity: MYCOSYNTH_AI_CONFIG.marketSellSurplus,
        pricePerUnit: MYCOSYNTH_AI_CONFIG.marketPriceFloor,
      }),
    ).toBe(true);

    expect(
      shouldPlaceMarketOrder({
        openOrderCount: 0,
        side: MarketOrderSide.BUY,
        inventoryQuantity: MYCOSYNTH_AI_CONFIG.marketBuyShortage,
        pricePerUnit: MYCOSYNTH_AI_CONFIG.marketPriceFloor,
      }),
    ).toBe(true);
  });

  it('creates trade routes only for real imbalances and no duplicates', () => {
    expect(
      shouldCreateTradeRoute({
        activeRouteCount: 0,
        duplicateExists: false,
        sourceRatio: MYCOSYNTH_AI_CONFIG.resourceTransferHighRatio,
        targetRatio: MYCOSYNTH_AI_CONFIG.resourceTransferLowRatio,
      }),
    ).toBe(true);

    expect(
      shouldCreateTradeRoute({
        activeRouteCount: 0,
        duplicateExists: true,
        sourceRatio: 1,
        targetRatio: 0,
      }),
    ).toBe(false);
  });
});

function itemState(
  overrides: Partial<MarketLiquidityItemState> & { itemKey: ItemKey },
): MarketLiquidityItemState {
  return {
    totalQuantity: 0,
    bestSurplus: null,
    hasOpenSell: false,
    hasOpenBuy: false,
    book: { bestBid: null, bestAsk: null, lastPrice: null },
    ...overrides,
  };
}

describe('Mycosynth market liquidity', () => {
  it('anchors fair value to the item base value and clamps manipulated prices', () => {
    const base = ITEMS[ItemKey.VOID_ALLOY].baseValue;
    // Sans dernier prix : juste valeur = baseValue.
    expect(marketFairValue(ItemKey.VOID_ALLOY, null)).toBe(base);
    // Prix aberrant : borné à la bande haute autour de la baseValue.
    expect(marketFairValue(ItemKey.VOID_ALLOY, base * 100)).toBe(
      Math.round(base * MYCOSYNTH_AI_CONFIG.marketFairValueBandMax),
    );
    // Prix dérisoire : borné à la bande basse.
    expect(marketFairValue(ItemKey.VOID_ALLOY, 1)).toBe(
      Math.round(base * MYCOSYNTH_AI_CONFIG.marketFairValueBandMin),
    );
  });

  it('derives per-item floor from base value, never a flat default', () => {
    const base = ITEMS[ItemKey.VOID_ALLOY].baseValue;
    expect(marketItemFloor(ItemKey.VOID_ALLOY)).toBe(
      Math.round(base * MYCOSYNTH_AI_CONFIG.marketFloorRatio),
    );
    // Items de faible valeur : on retombe sur le plancher absolu.
    expect(marketItemFloor(ItemKey.MYCELIAL_FIBER)).toBeGreaterThanOrEqual(
      MYCOSYNTH_AI_CONFIG.marketPriceFloor,
    );
  });

  it('treats only craft ingredients as needs', () => {
    const needed = marketNeededItems();
    expect(needed.has(ItemKey.CHITIN_SHARD)).toBe(true); // ingrédient de reinforced_chitin
    expect(needed.has(ItemKey.MYCELIAL_FIBER)).toBe(true); // ingrédient de neural_matrix
    expect(needed.has(ItemKey.VOID_ALLOY)).toBe(false); // sortie de craft, pas un besoin
  });

  it('sells surplus with a resting ask above fair value (no fire-sale)', () => {
    const intents = planMarketOrders({
      isMarketMaker: false,
      openOrderCount: 0,
      protectedBiomass: 0,
      buyerPlanetId: 'home',
      neededItems: marketNeededItems(),
      items: [
        itemState({
          itemKey: ItemKey.VOID_ALLOY,
          totalQuantity: 10,
          bestSurplus: { planetId: 'p2', quantity: 10 },
        }),
      ],
    });

    expect(intents).toHaveLength(1);
    const ask = intents[0]!;
    expect(ask.side).toBe(MarketOrderSide.SELL);
    expect(ask.planetId).toBe('p2');
    const fair = marketFairValue(ItemKey.VOID_ALLOY, null);
    expect(ask.pricePerUnit).toBeGreaterThan(fair);
    expect(ask.pricePerUnit).toBeGreaterThanOrEqual(marketItemFloor(ItemKey.VOID_ALLOY));
  });

  it('buys only needed items, resting below fair value without crossing the book', () => {
    const intents = planMarketOrders({
      isMarketMaker: false,
      openOrderCount: 0,
      protectedBiomass: 1_000_000,
      buyerPlanetId: 'home',
      neededItems: marketNeededItems(),
      items: [
        // Besoin réel (ingrédient), stock vide → bid attendu.
        itemState({ itemKey: ItemKey.VOID_CRYSTAL, totalQuantity: 0 }),
        // Pénurie mais aucun usage → aucun ordre.
        itemState({ itemKey: ItemKey.VOID_ALLOY, totalQuantity: 0 }),
      ],
    });

    expect(intents).toHaveLength(1);
    const bid = intents[0]!;
    expect(bid.side).toBe(MarketOrderSide.BUY);
    expect(bid.itemKey).toBe(ItemKey.VOID_CRYSTAL);
    expect(bid.pricePerUnit).toBeLessThan(marketFairValue(ItemKey.VOID_CRYSTAL, null));
  });

  it('never crosses the best ask when buying', () => {
    const intents = planMarketOrders({
      isMarketMaker: false,
      openOrderCount: 0,
      protectedBiomass: 1_000_000,
      buyerPlanetId: 'home',
      neededItems: marketNeededItems(),
      items: [
        itemState({
          itemKey: ItemKey.VOID_CRYSTAL,
          totalQuantity: 0,
          book: { bestBid: null, bestAsk: 50, lastPrice: null },
        }),
      ],
    });

    expect(intents[0]?.pricePerUnit).toBeLessThan(50);
  });

  it('respects the open-order cap', () => {
    const intents = planMarketOrders({
      isMarketMaker: false,
      openOrderCount: MYCOSYNTH_AI_CONFIG.maxOpenMarketOrders,
      protectedBiomass: 1_000_000,
      buyerPlanetId: 'home',
      neededItems: marketNeededItems(),
      items: [
        itemState({
          itemKey: ItemKey.VOID_ALLOY,
          totalQuantity: 10,
          bestSurplus: { planetId: 'p2', quantity: 10 },
        }),
      ],
    });

    expect(intents).toHaveLength(0);
  });
});
