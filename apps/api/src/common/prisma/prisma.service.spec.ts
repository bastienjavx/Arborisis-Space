import { runWithUniverse } from './universe-scope.storage';

const mockFindMany = jest.fn().mockResolvedValue([]);

jest.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    $extends({ query }: { query: { $allModels: { $allOperations: (p: unknown) => unknown } } }) {
      const allOperations = query.$allModels.$allOperations;
      return {
        user: {
          findMany: (args: unknown) =>
            allOperations({ model: 'User', operation: 'findMany', args, query: mockFindMany }),
        },
        $transaction: jest.fn(),
      };
    }

    $connect = jest.fn();
    $disconnect = jest.fn();
  },
  Prisma: {
    TransactionIsolationLevel: { Serializable: 'Serializable' },
  },
}));

const { PrismaService } = jest.requireActual('./prisma.service');

describe('PrismaService', () => {
  beforeEach(() => {
    mockFindMany.mockClear();
  });

  it('injecte universeId dans les requêtes scopées', async () => {
    const prismaService = new PrismaService();

    await runWithUniverse('universe-1', async () => {
      await prismaService.user.findMany({});
    });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith({ where: { universeId: 'universe-1' } });
  });

  it('ne modifie pas les requêtes hors contexte univers', async () => {
    const prismaService = new PrismaService();

    await prismaService.user.findMany({});

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith({});
  });

  it('passe les méthodes propres du service via le vrai this', async () => {
    const prismaService = new PrismaService();
    expect(typeof prismaService.serializable).toBe('function');
    expect(typeof prismaService.onModuleInit).toBe('function');
    expect(typeof prismaService.onModuleDestroy).toBe('function');
  });
});
