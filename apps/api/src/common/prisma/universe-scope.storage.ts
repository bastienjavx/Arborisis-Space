import { AsyncLocalStorage } from 'node:async_hooks';

export interface UniverseScope {
  universeId: string;
}

export const universeScopeStorage = new AsyncLocalStorage<UniverseScope>();

export function getActiveUniverseId(): string | undefined {
  return universeScopeStorage.getStore()?.universeId;
}

export function runWithUniverse<T>(universeId: string, work: () => Promise<T>): Promise<T> {
  return universeScopeStorage.run({ universeId }, work);
}

export function runWithJobUniverse<T>(
  data: { universeId: string },
  work: () => Promise<T>,
): Promise<T> {
  return runWithUniverse(data.universeId, work);
}
