import { DEFENSES, DefenseType, ResourceType } from '@arborisis/shared';
import { DefensesService } from './defenses.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('DefensesService', () => {
  let prisma: any;
  let engine: any;
  let planets: any;
  let service: DefensesService;

  const settled = {
    buildings: {},
    research: {},
    planet: { id: 'planet-1', buildings: [] },
    production: {},
    productionIntensities: {},
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((ops) => Promise.all(ops)),
      planet: {
        update: jest.fn().mockResolvedValue({}),
      },
      orbitalDefense: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    engine = {
      settlePlanet: jest.fn().mockResolvedValue(settled),
      buildResourceState: jest.fn().mockReturnValue({
        amounts: {
          [ResourceType.BIOMASS]: 1_000,
          [ResourceType.SAP]: 1_000,
          [ResourceType.MINERALS]: 1_000,
          [ResourceType.SPORES]: 1_000,
        },
      }),
    };
    planets = {
      assertOwnership: jest.fn().mockResolvedValue({ id: 'planet-1' }),
    };
    service = new DefensesService(prisma, engine, planets);
  });

  it('calcule canAfford depuis les ressources settlées de la planète', async () => {
    const view = await service.getDefenses('user-1', 'planet-1');

    expect(engine.settlePlanet).toHaveBeenCalledWith('planet-1');
    expect(
      view.defenses.find((defense) => defense.type === DefenseType.ION_CANNON)?.canAfford,
    ).toBe(true);
  });

  it('décrémente les ressources et retourne une vue basée sur le solde restant', async () => {
    engine.buildResourceState
      .mockReturnValueOnce({
        amounts: {
          [ResourceType.BIOMASS]: 400,
          [ResourceType.SAP]: 100,
          [ResourceType.MINERALS]: 400,
          [ResourceType.SPORES]: 0,
        },
      })
      .mockReturnValueOnce({
        amounts: {
          [ResourceType.BIOMASS]: 40,
          [ResourceType.SAP]: 100,
          [ResourceType.MINERALS]: 40,
          [ResourceType.SPORES]: 0,
        },
      });

    const view = await service.build('user-1', 'planet-1', DefenseType.ION_CANNON, 2);

    expect(prisma.planet.update).toHaveBeenCalledWith({
      where: { id: 'planet-1' },
      data: {
        biomass: { decrement: DEFENSES[DefenseType.ION_CANNON].cost[ResourceType.BIOMASS]! * 2 },
        sap: { decrement: 0 },
        minerals: {
          decrement: DEFENSES[DefenseType.ION_CANNON].cost[ResourceType.MINERALS]! * 2,
        },
        spores: { decrement: 0 },
      },
    });
    expect(
      view.defenses.find((defense) => defense.type === DefenseType.ION_CANNON)?.canAfford,
    ).toBe(false);
  });

  it('refuse une défense dont les prérequis ne sont pas satisfaits', async () => {
    await expect(
      service.build('user-1', 'planet-1', DefenseType.SHIELD_MEMBRANE, 1),
    ).rejects.toThrow('Prérequis de défense non satisfaits.');

    expect(prisma.planet.update).not.toHaveBeenCalled();
    expect(prisma.orbitalDefense.upsert).not.toHaveBeenCalled();
  });
});
