import type { Prisma, Universe } from '@prisma/client';

const DEFAULT_UNIVERSE_SLUG = 'default';

/**
 * Retourne l'univers par défaut complet.
 * Phase 1 du multi-univers : un seul univers existe, celui créé par le seed.
 */
export async function getDefaultUniverse(tx: Prisma.TransactionClient): Promise<Universe> {
  const universe = await tx.universe.findUnique({ where: { slug: DEFAULT_UNIVERSE_SLUG } });
  if (!universe) {
    throw new Error(`Univers par défaut "${DEFAULT_UNIVERSE_SLUG}" introuvable. Lancez le seed.`);
  }
  return universe;
}

/**
 * Retourne l'identifiant de l'univers par défaut.
 */
export async function getDefaultUniverseId(tx: Prisma.TransactionClient): Promise<string> {
  const universe = await getDefaultUniverse(tx);
  return universe.id;
}
