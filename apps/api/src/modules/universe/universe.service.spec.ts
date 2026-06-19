import { UniverseService } from './universe.service';
import type { Env } from '../../common/config/env';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('UniverseService.onApplicationBootstrap', () => {
  let prisma: any;

  const makeConfig = (apiInternalUrl?: string) => ({
    get: jest.fn((key: keyof Env) => (key === 'API_INTERNAL_URL' ? apiInternalUrl : undefined)),
  });

  beforeEach(() => {
    prisma = {
      universe: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
  });

  it('réaligne internalApiUrl du défaut quand API_INTERNAL_URL diffère', async () => {
    prisma.universe.findUnique.mockResolvedValue({
      slug: 'default',
      internalApiUrl: 'http://localhost:4000',
    });
    const service = new UniverseService(prisma, makeConfig('http://api:4000') as any);

    await service.onApplicationBootstrap();

    expect(prisma.universe.update).toHaveBeenCalledWith({
      where: { slug: 'default' },
      data: { internalApiUrl: 'http://api:4000' },
    });
  });

  it('ne fait rien si API_INTERNAL_URL est absent', async () => {
    const service = new UniverseService(prisma, makeConfig(undefined) as any);

    await service.onApplicationBootstrap();

    expect(prisma.universe.findUnique).not.toHaveBeenCalled();
    expect(prisma.universe.update).not.toHaveBeenCalled();
  });

  it('ne fait rien si la valeur est déjà à jour', async () => {
    prisma.universe.findUnique.mockResolvedValue({
      slug: 'default',
      internalApiUrl: 'http://api:4000',
    });
    const service = new UniverseService(prisma, makeConfig('http://api:4000') as any);

    await service.onApplicationBootstrap();

    expect(prisma.universe.update).not.toHaveBeenCalled();
  });

  it('ne propage pas l’erreur si la mise à jour échoue', async () => {
    prisma.universe.findUnique.mockRejectedValue(new Error('db down'));
    const service = new UniverseService(prisma, makeConfig('http://api:4000') as any);

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
