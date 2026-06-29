import {
  exchangeResourcesSchema,
  NPC_BOND_OFFERINGS,
  placeResourceMarketOrderSchema,
  RESOURCE_MARKET_CONFIG,
  ResourceType,
  subscribeBondSchema,
  MarketOrderSide,
} from './index';

describe('resource market contracts', () => {
  it('keeps Biomass as quote currency only for order books', () => {
    expect(RESOURCE_MARKET_CONFIG.quoteCurrency).toBe(ResourceType.BIOMASS);
    expect(RESOURCE_MARKET_CONFIG.tradableResources).not.toContain(ResourceType.BIOMASS);

    expect(() =>
      placeResourceMarketOrderSchema.parse({
        resource: ResourceType.BIOMASS,
        side: MarketOrderSide.BUY,
        pricePerUnit: 1,
        quantity: 1,
        sourcePlanetId: '00000000-0000-4000-8000-000000000001',
      }),
    ).toThrow();
  });

  it('validates instant exchanges between two different resources', () => {
    expect(
      exchangeResourcesSchema.parse({
        sourcePlanetId: '00000000-0000-4000-8000-000000000001',
        fromResource: ResourceType.BIOMASS,
        toResource: ResourceType.SAP,
        amount: 100,
      }),
    ).toMatchObject({ amount: 100 });

    expect(() =>
      exchangeResourcesSchema.parse({
        sourcePlanetId: '00000000-0000-4000-8000-000000000001',
        fromResource: ResourceType.SAP,
        toResource: ResourceType.SAP,
        amount: 100,
      }),
    ).toThrow();
  });

  it('defines bounded NPC bond offerings', () => {
    expect(NPC_BOND_OFFERINGS.length).toBeGreaterThanOrEqual(4);
    for (const offering of NPC_BOND_OFFERINGS) {
      expect(offering.minPrincipal).toBeGreaterThan(0);
      expect(offering.maxPrincipal).toBeGreaterThan(offering.minPrincipal);
      expect(offering.baseYieldRate).toBeGreaterThan(0);
      expect(offering.durationHours).toBeGreaterThan(0);

      expect(
        subscribeBondSchema.parse({
          offeringId: offering.id,
          sourcePlanetId: '00000000-0000-4000-8000-000000000001',
          principal: offering.minPrincipal,
        }),
      ).toMatchObject({ offeringId: offering.id });
    }
  });
});
