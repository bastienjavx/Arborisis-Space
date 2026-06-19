import { UniverseStatus } from '@prisma/client';
import { ProvisioningService } from './provisioning.service';
import type { Env } from '../../common/config/env';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('ProvisioningService', () => {
  let config: any;
  let prisma: any;
  let universeService: any;
  let service: ProvisioningService;

  beforeEach(() => {
    config = {
      get: jest.fn((key: keyof Env) => {
        const values: Partial<Record<keyof Env, unknown>> = {
          UNIVERSE_PROVISIONING_ENABLED: 'true',
          RAILWAY_API_TOKEN: 'railway-token',
          RAILWAY_PROJECT_ID: 'project-id',
          RAILWAY_SERVICE_TEMPLATE_ID: 'template-id',
          RAILWAY_ENVIRONMENT_ID: 'env-id',
          DATABASE_URL: 'postgresql://db',
          REDIS_URL: 'redis://redis',
          WEB_ORIGIN: 'https://app.arborisis.test',
          UNIVERSE_MAX_PLAYERS: 500,
        };
        return values[key];
      }),
    };

    prisma = {
      universe: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      serializable: jest.fn(async (work: (tx: any) => Promise<any>) => work(prisma)),
    };

    universeService = {
      toView: jest.fn((u: any) => ({
        id: u.id,
        slug: u.slug,
        name: u.name,
        playerCount: u.playerCount,
        maxPlayers: u.maxPlayers,
        status: u.status,
        internalApiUrl: u.internalApiUrl,
        createdAt: u.createdAt,
      })),
    };

    service = new ProvisioningService(config as any, prisma as any, universeService as any);
  });

  describe('provisionUniverse', () => {
    it('retourne null quand le provisioning est désactivé', async () => {
      config.get.mockImplementation((key: keyof Env) => {
        if (key === 'UNIVERSE_PROVISIONING_ENABLED') return 'false';
        return undefined;
      });

      const result = await service.provisionUniverse();

      expect(result).toBeNull();
      expect(prisma.universe.create).not.toHaveBeenCalled();
    });

    it('retourne null quand la configuration Railway est incomplète', async () => {
      config.get.mockImplementation((key: keyof Env) => {
        const values: Partial<Record<keyof Env, unknown>> = {
          UNIVERSE_PROVISIONING_ENABLED: 'true',
          RAILWAY_API_TOKEN: 'token',
        };
        return values[key];
      });

      const result = await service.provisionUniverse();

      expect(result).toBeNull();
      expect(prisma.universe.create).not.toHaveBeenCalled();
    });

    it("retourne l'univers déjà en PROVISIONING sans en créer un nouveau", async () => {
      const existing = {
        id: 'univ-provisioning',
        slug: 'generated-1',
        name: 'Univers en cours',
        internalApiUrl: '',
        maxPlayers: 500,
        playerCount: 0,
        status: UniverseStatus.PROVISIONING,
        createdAt: new Date().toISOString(),
      };
      prisma.universe.findFirst.mockResolvedValue(existing);

      const result = await service.provisionUniverse();

      expect(prisma.universe.create).not.toHaveBeenCalled();
      expect(universeService.toView).toHaveBeenCalledWith(existing);
      expect(result).toMatchObject({ id: 'univ-provisioning' });
    });

    it('crée un univers ACTIVE en cas de provisioning réussi', async () => {
      prisma.universe.findFirst.mockResolvedValue(null);
      prisma.universe.create.mockResolvedValue({
        id: 'univ-1',
        slug: 'generated-123',
        name: 'Univers 2026',
        internalApiUrl: '',
        maxPlayers: 500,
        playerCount: 0,
        status: UniverseStatus.PROVISIONING,
        createdAt: new Date(),
      });
      prisma.universe.update.mockResolvedValue({
        id: 'univ-1',
        slug: 'generated-123',
        name: 'Univers 2026',
        internalApiUrl: 'https://api-generated-123.up.railway.app',
        maxPlayers: 500,
        playerCount: 0,
        status: UniverseStatus.ACTIVE,
        createdAt: new Date(),
      });

      // On remplace le client Railway par un mock complet pour isoler le test.
      const fakeClient = {
        createServiceFromTemplate: jest.fn().mockResolvedValue('service-1'),
        setServiceVariables: jest.fn().mockResolvedValue(undefined),
        triggerDeployment: jest.fn().mockResolvedValue('deploy-1'),
        getServiceUrl: jest.fn().mockResolvedValue('https://api-generated-123.up.railway.app'),
      };
      jest.spyOn(service as any, 'newRailwayClient').mockImplementation(() => fakeClient);

      const result = await service.provisionUniverse();

      expect(prisma.universe.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maxPlayers: 500,
            status: UniverseStatus.PROVISIONING,
          }),
        }),
      );
      expect(fakeClient.createServiceFromTemplate).toHaveBeenCalledWith(
        'project-id',
        'env-id',
        'template-id',
        expect.any(String),
      );
      expect(fakeClient.setServiceVariables).toHaveBeenCalledWith(
        'service-1',
        'env-id',
        expect.objectContaining({
          DATABASE_URL: 'postgresql://db',
          REDIS_URL: 'redis://redis',
          WEB_ORIGIN: 'https://app.arborisis.test',
          NODE_ENV: 'production',
        }),
      );
      expect(fakeClient.triggerDeployment).toHaveBeenCalledWith('service-1', 'env-id');
      expect(fakeClient.getServiceUrl).toHaveBeenCalledWith('service-1');
      expect(prisma.universe.update).toHaveBeenCalledWith({
        where: { id: 'univ-1' },
        data: {
          internalApiUrl: 'https://api-generated-123.up.railway.app',
          status: UniverseStatus.ACTIVE,
        },
      });
      expect(result).toMatchObject({ status: 'ACTIVE' });
    });

    it("retourne null et laisse l'univers en PROVISIONING en cas d'échec Railway", async () => {
      prisma.universe.findFirst.mockResolvedValue(null);
      prisma.universe.create.mockResolvedValue({
        id: 'univ-2',
        slug: 'generated-456',
        name: 'Univers 2026',
        internalApiUrl: '',
        maxPlayers: 500,
        playerCount: 0,
        status: UniverseStatus.PROVISIONING,
        createdAt: new Date(),
      });

      const fakeClient = {
        createServiceFromTemplate: jest.fn().mockRejectedValue(new Error('Railway down')),
        setServiceVariables: jest.fn(),
        triggerDeployment: jest.fn(),
        getServiceUrl: jest.fn(),
      };
      jest.spyOn(service as any, 'newRailwayClient').mockImplementation(() => fakeClient);

      const result = await service.provisionUniverse();

      expect(prisma.universe.create).toHaveBeenCalled();
      expect(fakeClient.createServiceFromTemplate).toHaveBeenCalled();
      expect(fakeClient.setServiceVariables).not.toHaveBeenCalled();
      expect(prisma.universe.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('résout une race condition sur le slug en retournant le univers PROVISIONING existant', async () => {
      const existing = {
        id: 'univ-race',
        slug: 'generated-race',
        name: 'Univers race',
        internalApiUrl: '',
        maxPlayers: 500,
        playerCount: 0,
        status: UniverseStatus.PROVISIONING,
        createdAt: new Date(),
      };
      prisma.serializable.mockRejectedValueOnce({ code: 'P2002' });
      prisma.universe.findFirst.mockResolvedValue(existing);

      const result = await service.provisionUniverse();

      expect(universeService.toView).toHaveBeenCalledWith(existing);
      expect(result).toMatchObject({ id: 'univ-race', status: 'PROVISIONING' });
    });
  });
});
