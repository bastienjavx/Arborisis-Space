import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { applyUniverseScope } from './universe-scope.middleware';
import { wrapTransactionClient } from './transaction-client.wrapper';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly scopedClient: PrismaClient;

  constructor() {
    super();
    this.scopedClient = this.$extends({
      query: {
        $allModels: {
          $allOperations({ model, operation, args, query }) {
            const scopedArgs = applyUniverseScope(model, operation, args);
            return query(scopedArgs);
          },
        },
      },
    }) as PrismaClient;

    return new Proxy(this, {
      get(target, prop) {
        if (
          typeof prop === 'string' &&
          ['serializable', 'onModuleInit', 'onModuleDestroy'].includes(prop)
        ) {
          return Reflect.get(target, prop);
        }
        return Reflect.get(target.scopedClient, prop);
      },
    }) as PrismaService;
  }

  async serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.scopedClient.$transaction(
          async (rawTx) => work(wrapTransactionClient(rawTx)),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        const retryable =
          typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
        if (!retryable || attempt === 2) throw error;
      }
    }
    throw new Error('Transaction retry exhausted');
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
