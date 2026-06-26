'use client';

import { createApi, ApiError, buildRequest, parseError, type RequestOptions } from './api-base';
import { onSessionEvent, refreshAccessToken, fetchWithRetry, broadcastRefresh } from './session';

const DEFAULT_TIMEOUT_MS = 25_000;

let refreshInFlight: Promise<boolean> | null = null;

onSessionEvent((event) => {
  if (event === 'logout') refreshInFlight = null;
});

async function fetchWithTimeout(
  input: RequestInfo | URL,
  baseInit: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  return fetchWithRetry((attempt) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...baseInit, signal: controller.signal }).finally(() => {
      clearTimeout(timer);
    });
  });
}

async function requestClient<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { url, init } = buildRequest(path, opts);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, init, timeoutMs);
  } catch (err) {
    // En cas d'erreur réseau ou de timeout sur une requête non-idempotente,
    // on ne peut pas rejouer automatiquement ; on transforme en ApiError 0.
    throw new ApiError(0, err instanceof Error ? err.message : 'Erreur réseau');
  }

  // Access token expiré → tentative de rotation puis nouvel essai (une fois).
  if (res.status === 401 && !opts.noRefresh && !opts._retried) {
    refreshInFlight ??= refreshAccessToken();
    const ok = await refreshInFlight;
    refreshInFlight = null;
    if (ok) {
      broadcastRefresh();
      return requestClient<T>(path, { ...opts, _retried: true });
    }
  }

  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = createApi(requestClient);
export { ApiError };
