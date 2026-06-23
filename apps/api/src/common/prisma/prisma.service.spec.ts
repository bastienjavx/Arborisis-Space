import { Prisma, PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { universeContext } from '../../modules/universe/universe-context';

describe('PrismaService', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prismaService.$disconnect().catch(() => {
      /* ignore */
    });
  });

  describe('proxy routing', () => {
    it('routes model access to the scoped client', () => {
      // L'accès à un modèle scopé doit retourner le modèle du client étendu,
      // pas celui du PrismaClient natif.
      expect((prismaService as unknown as PrismaClient).user).toBe(
        (prismaService as unknown as { scopedClient: PrismaClient }).scopedClient.user,
      );
    });

    it('routes $transaction to the scoped client', () => {
      expect((prismaService as unknown as PrismaClient).$transaction).toBe(
        (prismaService as unknown as { scopedClient: PrismaClient }).scopedClient.$transaction,
      );
    });
  });

  describe('serializable', () => {
    it('wraps the transaction client with the current universe id', async () => {
      const work = jest.fn().mockResolvedValue('result');
      const rawTx = {
        user: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as unknown as Prisma.TransactionClient;

      jest
        .spyOn(
          (prismaService as unknown as { scopedClient: PrismaClient }).scopedClient,
          '$transaction',
        )
        .mockImplementation(async (fn: unknown) => {
          return (fn as (tx: Prisma.TransactionClient) => Promise<unknown>)(rawTx);
        });

      await universeContext.run({ universeId: 'u-test' }, () => prismaService.serializable(work));

      expect(work).toHaveBeenCalled();
      const passedTx = work.mock.calls[0][0] as Prisma.TransactionClient;
      await passedTx.user.findMany({});
      expect(rawTx.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { universeId: 'u-test' } }),
      );
    });

    it('retries serializable write conflicts with backoff', async () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0);
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: () => void) => {
        if (typeof callback === 'function') callback();
        return 0 as unknown as NodeJS.Timeout;
      });
      const work = jest.fn().mockResolvedValue('ok');
      const rawTx = {} as Prisma.TransactionClient;
      const transaction = jest
        .spyOn(
          (prismaService as unknown as { scopedClient: PrismaClient }).scopedClient,
          '$transaction',
        )
        .mockRejectedValueOnce({ code: 'P2034' })
        .mockRejectedValueOnce({ code: 'P2034' })
        .mockImplementation(async (fn: unknown) => {
          return (fn as (tx: Prisma.TransactionClient) => Promise<unknown>)(rawTx);
        });

      await expect(prismaService.serializable(work)).resolves.toBe('ok');

      expect(transaction).toHaveBeenCalledTimes(3);
      expect(work).toHaveBeenCalledTimes(1);
    });
  });
});
