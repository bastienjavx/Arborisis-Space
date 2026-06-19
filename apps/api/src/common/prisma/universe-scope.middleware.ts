import { PrismaClient } from '@prisma/client';
import { getCurrentUniverseId } from '../../modules/universe/universe-context';

export const SCOPED_MODELS = new Set<string>([
  'User',
  'Planet',
  'NpcEncounter',
  'GalacticEvent',
  'ChatMessage',
  'ModerationAction',
]);

export const SCOPED_OPERATIONS = new Set<string>([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/**
 * Injecte `universeId` dans les arguments d'une opération Prisma sans écraser
 * une valeur déjà présente.
 */
export function injectUniverseId<T>(args: T, universeId: string): T {
  const typedArgs =
    args === undefined || args === null
      ? ({} as Record<string, unknown>)
      : ({ ...(args as Record<string, unknown>) } as Record<string, unknown>);

  typedArgs.where =
    typedArgs.where !== undefined && typedArgs.where !== null
      ? { ...(typedArgs.where as Record<string, unknown>) }
      : ({} as Record<string, unknown>);

  const where = typedArgs.where as Record<string, unknown>;
  if (where.universeId === undefined) {
    where.universeId = universeId;
  }

  return typedArgs as T;
}

/**
 * Extension Prisma Client qui injecte automatiquement `universeId` dans le
 * `where` des requêtes lorsqu'un contexte d'univers est actif (AsyncLocalStorage).
 *
 * Les opérations à clé unique (`findUnique`, `update`, `delete`, `upsert`)
 * sont intentionnellement exclues car elles peuvent cibler des indexes uniques
 * composites incluant déjà `universeId`.
 */
export function createUniverseScopeExtension(): Parameters<PrismaClient['$extends']>[0] {
  return {
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SCOPED_MODELS.has(model)) {
            return query(args);
          }

          if (!SCOPED_OPERATIONS.has(operation)) {
            return query(args);
          }

          const universeId = getCurrentUniverseId();
          if (universeId === undefined) {
            return query(args);
          }

          const scopedArgs = injectUniverseId(args, universeId);
          return query(scopedArgs);
        },
      },
    },
  };
}

/**
 * Applique l'extension de scoping univers à un client Prisma.
 * Retourne le client étendu.
 */
export function applyUniverseScopeMiddleware<T extends PrismaClient>(prisma: T): T {
  return prisma.$extends(createUniverseScopeExtension()) as T;
}
