import { PrismaClient } from '@prisma/client';
import { createUniverseScopeExtension } from './universe-scope.middleware';
import { universeContext } from '../../modules/universe/universe-context';

describe('createUniverseScopeExtension', () => {
  function createOperation() {
    const extension = createUniverseScopeExtension();
    return (
      extension as {
        query: {
          $allModels: { $allOperations: (ctx: Record<string, unknown>) => Promise<unknown> };
        };
      }
    ).query.$allModels.$allOperations;
  }

  it('ne modifie pas les requêtes hors contexte universe', async () => {
    const operation = createOperation();
    const query = jest.fn(async (args) => args);
    const args = { where: { email: 'a' } };

    await operation({ model: 'User', operation: 'findMany', args, query });

    expect(query).toHaveBeenCalledWith({ where: { email: 'a' } });
  });

  it('injecte universeId dans le where quand un contexte est actif', async () => {
    const operation = createOperation();
    const query = jest.fn(async (args) => args);
    const args = { where: { email: 'a' } };

    await universeContext.run({ universeId: 'univ1' }, async () => {
      await operation({ model: 'User', operation: 'findMany', args, query });
    });

    expect(query).toHaveBeenCalledWith({ where: { email: 'a', universeId: 'univ1' } });
  });

  it('ne remplace pas un universeId déjà présent', async () => {
    const operation = createOperation();
    const query = jest.fn(async (args) => args);
    const args = { where: { universeId: 'existing' } };

    await universeContext.run({ universeId: 'univ1' }, async () => {
      await operation({ model: 'User', operation: 'findMany', args, query });
    });

    expect(query).toHaveBeenCalledWith({ where: { universeId: 'existing' } });
  });

  it('ignore les opérations à clé unique', async () => {
    const operation = createOperation();
    const query = jest.fn(async (args) => args);
    const args = { where: { id: 'u1' } };

    await universeContext.run({ universeId: 'univ1' }, async () => {
      await operation({ model: 'User', operation: 'findUnique', args, query });
    });

    expect(query).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('ignore les modèles non scopés', async () => {
    const operation = createOperation();
    const query = jest.fn(async (args) => args);
    const args = { where: { userId: 'u1' } };

    await universeContext.run({ universeId: 'univ1' }, async () => {
      await operation({ model: 'Session', operation: 'findMany', args, query });
    });

    expect(query).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('injecte universeId quand args.where est absent', async () => {
    const operation = createOperation();
    const query = jest.fn(async (args) => args);

    await universeContext.run({ universeId: 'univ1' }, async () => {
      await operation({ model: 'Planet', operation: 'count', args: {}, query });
    });

    expect(query).toHaveBeenCalledWith({ where: { universeId: 'univ1' } });
  });

  it('applique le middleware via applyUniverseScopeMiddleware', () => {
    const prisma = { $extends: jest.fn((ext) => ext) } as unknown as PrismaClient;
    const { applyUniverseScopeMiddleware } = jest.requireActual('./universe-scope.middleware');
    applyUniverseScopeMiddleware(prisma);
    expect(prisma.$extends).toHaveBeenCalledTimes(1);
  });
});
