import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { applyUniverseScopeMiddleware } from './universe-scope.middleware';
import { getCurrentUniverseId } from '../../modules/universe/universe-context';
import { wrapTransactionClient } from './transaction-client.wrapper';

type ExtendedPrismaClient = ReturnType<typeof applyUniverseScopeMiddleware>;

const PRISMA_SERVICE_METHODS = new Set<string>(['serializable', 'onModuleInit', 'onModuleDestroy']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly scopedClient: ExtendedPrismaClient;

  constructor() {
    // Keep the per-replica pool small so multi-region deployments stay within Postgres limits.
    // Budget: Postgres hard cap ~100. With 3 conn/replica:
    //   • 16 main replicas × 3 = 48
    //   • 1 auto-provisioned universe node (UNIVERSE_PROVISION_REPLICAS=3) × 3 = 9
    //   • Total ≈ 57 — safe headroom for PgBouncer overhead and admin connections.
    const dbUrl = process.env.DATABASE_URL ?? '';
    const pooledUrl = dbUrl.includes('connection_limit')
      ? dbUrl
      : `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=3`;
    super({ datasources: { db: { url: pooledUrl } } });
    this.scopedClient = applyUniverseScopeMiddleware(this);

    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && PRISMA_SERVICE_METHODS.has(prop)) {
          return Reflect.get(target, prop);
        }
        return Reflect.get(target.scopedClient, prop, target.scopedClient);
      },
    }) as PrismaService;
  }

  async serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const universeId = getCurrentUniverseId();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.$transaction(
          async (rawTx) => {
            const tx = wrapTransactionClient(rawTx, universeId);
            return await work(tx);
          },
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
