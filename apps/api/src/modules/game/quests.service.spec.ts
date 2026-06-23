import { BuildingType } from '@arborisis/shared';
import { QuestsService } from './quests.service';

describe('QuestsService', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any;
  let finalization: any;
  let engine: any;
  let service: QuestsService;

  beforeEach(() => {
    prisma = {
      playerQuest: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { questId: 'sap-2', completedAt: new Date(), claimedAt: null },
            { questId: 'mineral-2', completedAt: new Date(), claimedAt: null },
            { questId: 'first-specialization', completedAt: new Date(), claimedAt: null },
          ]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      planet: {
        findMany: jest.fn((args: any) => {
          if (args?.select?.id) return Promise.resolve([{ id: 'planet-1' }]);
          return Promise.resolve([
            {
              id: 'planet-1',
              specialization: 'PRODUCTION',
              buildings: [
                { type: BuildingType.SAP_WELL, level: 2 },
                { type: BuildingType.MINERAL_VEIN, level: 2 },
              ],
              ships: [],
            },
          ]);
        }),
      },
      researchLevel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      expeditionMission: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    finalization = {
      finalizeDueResearchForUser: jest.fn().mockResolvedValue(undefined),
      finalizeDueColonizationForUser: jest.fn().mockResolvedValue(undefined),
      finalizeDueForPlanet: jest.fn().mockResolvedValue(undefined),
      finalizeDueShipProduction: jest.fn().mockResolvedValue(undefined),
    };
    engine = {
      settlePlanet: jest.fn().mockResolvedValue(undefined),
    };
    service = new QuestsService(prisma, finalization, engine);
  });

  it('évalue les objectifs early-game ajoutés depuis l’état réel du joueur', async () => {
    const overview = await service.getQuests('user-1');
    const byId = new Map(overview.quests.map((quest) => [quest.id, quest]));

    expect(byId.get('sap-2')).toMatchObject({
      progress: 2,
      target: 2,
      completed: true,
      ctaHref: '/buildings',
    });
    expect(byId.get('mineral-2')).toMatchObject({
      progress: 2,
      target: 2,
      completed: true,
      ctaHref: '/buildings',
    });
    expect(byId.get('first-specialization')).toMatchObject({
      progress: 1,
      target: 1,
      completed: true,
      ctaHref: '/play',
    });
  });
});
