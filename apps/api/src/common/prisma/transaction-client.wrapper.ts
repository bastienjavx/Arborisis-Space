import type { Prisma } from '@prisma/client';
import { applyUniverseScope, SCOPED_MODELS } from './universe-scope.middleware';

export function wrapTransactionClient(tx: Prisma.TransactionClient): Prisma.TransactionClient {
  return new Proxy(tx, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (
        typeof prop !== 'string' ||
        typeof value !== 'object' ||
        value === null ||
        !SCOPED_MODELS.has(prop)
      ) {
        return value;
      }

      return new Proxy(value, {
        get(modelTarget, op) {
          const method = Reflect.get(modelTarget, op);
          if (typeof method !== 'function') return method;
          return (...args: unknown[]) => {
            if (args.length === 0) return method.apply(modelTarget, args);
            const scopedArgs = applyUniverseScope(prop, String(op), args[0]);
            return method.apply(modelTarget, [scopedArgs, ...args.slice(1)]);
          };
        },
      });
    },
  }) as Prisma.TransactionClient;
}
