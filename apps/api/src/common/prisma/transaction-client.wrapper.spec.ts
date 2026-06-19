import { Prisma } from '@prisma/client';
import { wrapTransactionClient } from './transaction-client.wrapper';

describe('wrapTransactionClient', () => {
  it('injects universeId into scoped model operations', async () => {
    const tx = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      planet: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as Prisma.TransactionClient;

    const wrapped = wrapTransactionClient(tx, 'u-1');

    await wrapped.user.findMany({ where: { email: 'a' } });
    expect(tx.user.findMany).toHaveBeenCalledWith({ where: { email: 'a', universeId: 'u-1' } });

    await wrapped.user.update({ where: { id: 'x' }, data: {} });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'x' }, data: {} });

    await wrapped.planet.findFirst({ where: { isHomeworld: true } });
    expect(tx.planet.findFirst).toHaveBeenCalledWith({
      where: { isHomeworld: true, universeId: 'u-1' },
    });

    await wrapped.session.updateMany({ where: { userId: 'x' }, data: {} });
    expect(tx.session.updateMany).toHaveBeenCalledWith({ where: { userId: 'x' }, data: {} });
  });

  it('returns the raw tx when no universeId is provided', async () => {
    const tx = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as Prisma.TransactionClient;

    const wrapped = wrapTransactionClient(tx, undefined);
    expect(wrapped).toBe(tx);
  });
});
