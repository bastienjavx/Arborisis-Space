import { Prisma } from '@prisma/client';
import { SCOPED_MODELS, SCOPED_OPERATIONS, injectUniverseId } from './universe-scope.middleware';

/**
 * Encapsule un `Prisma.TransactionClient` pour injecter `universeId` dans les
 * requêtes scopées, de la même manière que le middleware Prisma Client.
 *
 * Les extensions Prisma (`$extends`) ne s'appliquent pas au client de transaction,
 * donc ce wrapper est nécessaire pour conserver le scoping dans `serializable()`.
 */
export function wrapTransactionClient(
  tx: Prisma.TransactionClient,
  universeId: string | undefined,
): Prisma.TransactionClient {
  if (!universeId) {
    return tx;
  }

  return new Proxy(tx, {
    get(target, prop) {
      const propName = typeof prop === 'string' ? prop : undefined;
      const modelName = propName ? propName.charAt(0).toUpperCase() + propName.slice(1) : undefined;
      if (!modelName || !SCOPED_MODELS.has(modelName)) {
        return Reflect.get(target, prop);
      }

      const model = Reflect.get(target, prop) as Record<string, unknown>;

      return new Proxy(model, {
        get(modelTarget, op) {
          const operation = typeof op === 'string' ? op : undefined;
          if (!operation || !SCOPED_OPERATIONS.has(operation)) {
            return Reflect.get(modelTarget, op);
          }

          const fn = Reflect.get(modelTarget, op) as (...args: unknown[]) => unknown;
          if (typeof fn !== 'function') {
            return fn;
          }

          return (...args: unknown[]) => {
            const [firstArg, ...rest] = args;
            const scopedArgs = injectUniverseId(firstArg, universeId);
            return fn(scopedArgs, ...rest);
          };
        },
      });
    },
  }) as Prisma.TransactionClient;
}
