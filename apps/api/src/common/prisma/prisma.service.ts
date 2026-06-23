import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { applyUniverseScopeMiddleware } from './universe-scope.middleware';
import { getCurrentUniverseId } from '../../modules/universe/universe-context';
import { wrapTransactionClient } from './transaction-client.wrapper';

type ExtendedPrismaClient = ReturnType<typeof applyUniverseScopeMiddleware>;

const PRISMA_SERVICE_METHODS = new Set<string>(['serializable', 'onModuleInit', 'onModuleDestroy']);
const SERIALIZABLE_MAX_ATTEMPTS = 6;
const SERIALIZABLE_BASE_DELAY_MS = 25;

function appendConnectionLimit(url: string, limit: number): string {
  if (!url || url.includes('connection_limit=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${limit}`;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
}

async function retryDelay(attempt: number): Promise<void> {
  const jitter = Math.floor(Math.random() * SERIALIZABLE_BASE_DELAY_MS);
  const delayMs = SERIALIZABLE_BASE_DELAY_MS * 2 ** attempt + jitter;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly scopedClient: ExtendedPrismaClient;

  constructor() {
    // Runtime traffic goes through PgBouncer in production. Keep each app-side
    // Prisma pool tiny so replica spikes do not fan out into Postgres sessions.
    const pooledUrl = appendConnectionLimit(process.env.DATABASE_URL ?? '', 2);
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
    for (let attempt = 0; attempt < SERIALIZABLE_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.$transaction(
          async (rawTx) => {
            const tx = wrapTransactionClient(rawTx, universeId);
            return await work(tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5_000,
            timeout: 15_000,
          },
        );
      } catch (error) {
        if (!isRetryableTransactionError(error) || attempt === SERIALIZABLE_MAX_ATTEMPTS - 1) {
          throw error;
        }
        await retryDelay(attempt);
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
