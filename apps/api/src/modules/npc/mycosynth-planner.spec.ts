import {
  BuildingType,
  MarketOrderSide,
  MYCOSYNTH_AI_CONFIG,
  ResourceType,
  ShipType,
} from '@arborisis/shared';
import {
  chooseBuildingUpgrade,
  chooseShipProduction,
  shouldCreateTradeRoute,
  shouldLaunchAttack,
  shouldPlaceMarketOrder,
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
