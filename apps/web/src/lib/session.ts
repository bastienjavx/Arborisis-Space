'use client';

const AUTH_EXPIRES_COOKIE = 'auth_expires_at';
const REFRESH_MARGIN_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 120_000;
const HEARTBEAT_IDLE_INTERVAL_MS = 300_000;
const NETWORK_RETRY_DELAYS = [1_000, 2_000, 4_000];

let proactiveTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivityAt = Date.now();
let isRefreshing = false;

export type SessionListener = (event: 'logout' | 'login' | 'network-down' | 'network-up') => void;
const listeners = new Set<SessionListener>();

function emit(event: Parameters<SessionListener>[0]) {
  listeners.forEach((l) => l(event));
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]!) : null;
}

function readAccessExpiresAt(): number | null {
  const raw = getCookie(AUTH_EXPIRES_COOKIE);
  if (!raw) return null;
  const ts = Number.parseInt(raw, 10);
  return Number.isNaN(ts) ? null : ts;
}

export function onSessionEvent(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markActivity() {
  lastActivityAt = Date.now();
}

export async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) return false;
  isRefreshing = true;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.ok) {
      scheduleProactiveRefresh();
      emit('login');
      return true;
    }
    if (res.status === 401) {
      emit('logout');
    }
    return false;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
}

function scheduleProactiveRefresh() {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  const expiresAt = readAccessExpiresAt();
  if (!expiresAt) return;
  const delay = Math.max(0, expiresAt - Date.now() - REFRESH_MARGIN_MS);
  proactiveTimer = setTimeout(() => {
    refreshAccessToken();
  }, delay);
}

async function sendHeartbeat() {
  try {
    const res = await fetch('/api/engagement/heartbeat', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.status === 401) {
      emit('logout');
      return;
    }
    if (res.ok) {
      emit('network-up');
      scheduleProactiveRefresh();
    }
  } catch {
    // Le heartbeat est best-effort ; l'erreur réseau sera gérée par le wrapper API.
  }
}

function scheduleHeartbeat() {
  if (heartbeatTimer) clearTimeout(heartbeatTimer);
  const idleMs = Date.now() - lastActivityAt;
  const interval =
    idleMs > HEARTBEAT_INTERVAL_MS ? HEARTBEAT_IDLE_INTERVAL_MS : HEARTBEAT_INTERVAL_MS;
  heartbeatTimer = setTimeout(() => {
    void sendHeartbeat();
    scheduleHeartbeat();
  }, interval);
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    markActivity();
    void refreshAccessToken();
  }
}

function onOnline() {
  emit('network-up');
  void refreshAccessToken();
}

function onStorage(event: StorageEvent) {
  if (event.key === 'arborisis:refresh') {
    scheduleProactiveRefresh();
  }
  if (event.key === 'arborisis:logout') {
    emit('logout');
  }
}

export function broadcastRefresh() {
  try {
    localStorage.setItem('arborisis:refresh', String(Date.now()));
    localStorage.removeItem('arborisis:refresh');
  } catch {
    // Certains navigateurs en mode privé lèvent une exception.
  }
}

export function broadcastLogout() {
  try {
    localStorage.setItem('arborisis:logout', String(Date.now()));
    localStorage.removeItem('arborisis:logout');
  } catch {
    /* ignore */
  }
}

export function initSessionManager() {
  if (typeof window === 'undefined') return;

  scheduleProactiveRefresh();
  scheduleHeartbeat();

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', () => emit('network-down'));
  window.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('storage', onStorage);
  window.addEventListener('pointerdown', markActivity, { passive: true });
  window.addEventListener('keydown', markActivity, { passive: true });

  // Si l'onglet reprend la main après une longue inactivité, rafraîchir immédiatement.
  if (document.visibilityState === 'visible') {
    void refreshAccessToken();
  }
}

export function teardownSessionManager() {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  if (heartbeatTimer) clearTimeout(heartbeatTimer);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', () => emit('network-down'));
  window.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('storage', onStorage);
}

export async function fetchWithRetry(
  requestFactory: (attempt: number) => Promise<Response>,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= NETWORK_RETRY_DELAYS.length; attempt++) {
    try {
      return await requestFactory(attempt);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === NETWORK_RETRY_DELAYS.length) break;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Attendre le retour de la connexion avant de réessayer.
        await new Promise<void>((resolve) => {
          const handler = () => {
            window.removeEventListener('online', handler);
            resolve();
          };
          window.addEventListener('online', handler);
        });
      } else {
        await new Promise((r) => setTimeout(r, NETWORK_RETRY_DELAYS[attempt]));
      }
    }
  }
  throw lastError ?? new Error('Network request failed');
}
