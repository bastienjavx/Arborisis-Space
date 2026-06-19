'use server';

import { setUniverseCookie } from '@/lib/universe-cookie';

export async function joinUniverseAction(universeId: string): Promise<void> {
  await setUniverseCookie(universeId);
}

export async function setUniverseCookieAction(universeId: string): Promise<void> {
  await setUniverseCookie(universeId);
}
