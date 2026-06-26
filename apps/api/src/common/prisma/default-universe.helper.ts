import type { Prisma, Universe } from '@prisma/client';
import { RedisCacheService } from '../redis/redis-cache.service';

const DEFAULT_UNIVERSE_SLUG = 'default';
const DEFAULT_UNIVERSE_CACHE_TTL_SECONDS = 300;

let globalCache: RedisCacheService | null = null;

function getCache(): RedisCacheService | null {
  return globalCache;
}

/** Permet d'injecter le cache après l'instanciation du module Redis. */
export function setDefaultUniverseCache(cache: RedisCacheService): void {
  globalCache = cache;
}

/**
 * Retourne l'univers par défaut complet.
 * Phase 1 du multi-univers : un seul univers existe, celui créé par le seed.
 */
export async function getDefaultUniverse(tx: Prisma.TransactionClient): Promise<Universe> {
  const cache = getCache();
  const cacheKey = `universe:${DEFAULT_UNIVERSE_SLUG}`;
  if (cache) {
    const cached = await cache.get<Universe>('default-universe', cacheKey);
    if (cached) return cached as Universe;
  }

  const universe = await tx.universe.findUnique({ where: { slug: DEFAULT_UNIVERSE_SLUG } });
  if (!universe) {
    throw new Error(`Univers par défaut "${DEFAULT_UNIVERSE_SLUG}" introuvable. Lancez le seed.`);
  }
  await cache?.set('default-universe', cacheKey, universe, DEFAULT_UNIVERSE_CACHE_TTL_SECONDS);
  return universe;
}

/**
 * Retourne l'identifiant de l'univers par défaut.
 */
export async function getDefaultUniverseId(tx: Prisma.TransactionClient): Promise<string> {
  const universe = await getDefaultUniverse(tx);
  return universe.id;
}
