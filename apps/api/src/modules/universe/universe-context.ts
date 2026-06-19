import { AsyncLocalStorage } from 'node:async_hooks';

export interface UniverseContext {
  universeId: string;
}

export const universeContext = new AsyncLocalStorage<UniverseContext>();

/** Header transportant l'identifiant de l'univers cible. */
export const UNIVERSE_ID_HEADER = 'x-universe-id';

export function getCurrentUniverseId(): string | undefined {
  return universeContext.getStore()?.universeId;
}
