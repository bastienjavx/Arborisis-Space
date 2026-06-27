import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { applyUniverseScopeMiddleware } from './universe-scope.middleware';
import { getCurrentUniverseId } from '../../modules/universe/universe-context';
import { wrapTransactionClient } from './transaction-client.wrapper';

type ExtendedPrismaClient = ReturnType<typeof applyUniverseScopeMiddleware>;

const PRISMA_SERVICE_METHODS = new Set<string>([
  'serializable',
  'optimistic',
  'onModuleInit',
  'onModuleDestroy',
]);
const SERIALIZABLE_MAX_ATTEMPTS = 6;
const OPTIMISTIC_MAX_ATTEMPTS = 8;
const SERIALIZABLE_BASE_DELAY_MS = 25;
const OPTIMISTIC_BASE_DELAY_MS = 10;

export class OptimisticLockError extends Error {
  readonly code = 'OPTIMISTIC_LOCK_CONFLICT';
  constructor(message = 'Conflit de verrou optimiste sur Planet.') {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

function appendConnectionLimit(url: string, limit: number): string {
  if (!url || url.includes('connection_limit=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${limit}`;
}

function appendStatementTimeout(url: string, ms: number): string {
  if (!url || url.includes('statement_timeout=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}statement_timeout=${ms}`;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
}

function isOptimisticLockError(error: unknown): boolean {
  if (error instanceof OptimisticLockError) return true;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code?: unknown }).code === 'P2025' ||
      (error as { code?: unknown }).code === 'OPTIMISTIC_LOCK_CONFLICT')
  );
}

async function retryDelay(attempt: number, baseMs: number): Promise<void> {
  const jitter = Math.floor(Math.random() * baseMs);
  const delayMs = baseMs * 2 ** attempt + jitter;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly scopedClient: ExtendedPrismaClient;

  constructor() {
    // Runtime traffic goes through PgBouncer in production. Keep each app-side
    // Prisma pool tiny so replica spikes do not fan out into Postgres sessions.
    // Allow overriding via env for local dev and high-throughput workloads.
    const connectionLimit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? 2);
    const statementTimeoutMs = Number(process.env.PRISMA_STATEMENT_TIMEOUT_MS ?? 30_000);
    let pooledUrl = appendConnectionLimit(process.env.DATABASE_URL ?? '', connectionLimit);
    pooledUrl = appendStatementTimeout(pooledUrl, statementTimeoutMs);
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
        await retryDelay(attempt, SERIALIZABLE_BASE_DELAY_MS);
      }
    }
    throw new Error('Transaction retry exhausted');
  }

  async optimistic<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const universeId = getCurrentUniverseId();
    for (let attempt = 0; attempt < OPTIMISTIC_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.$transaction(
          async (rawTx) => {
            const tx = wrapTransactionClient(rawTx, universeId);
            return await work(tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            maxWait: 5_000,
            timeout: 15_000,
          },
        );
      } catch (error) {
        if (!isOptimisticLockError(error) || attempt === OPTIMISTIC_MAX_ATTEMPTS - 1) {
          throw error;
        }
        await retryDelay(attempt, OPTIMISTIC_BASE_DELAY_MS);
      }
    }
    throw new Error('Optimistic lock retry exhausted');
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
