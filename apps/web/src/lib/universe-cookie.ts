import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'arborisis_universe';
const COOKIE_TTL_DAYS = 30;

interface UniverseCookiePayload {
  universeId: string;
  internalApiUrl: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.UNIVERSE_COOKIE_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('UNIVERSE_COOKIE_SECRET is required in production.');
  }

  console.warn('UNIVERSE_COOKIE_SECRET is not set; using insecure dev fallback.');
  return 'arborisis-universe-cookie-dev-fallback';
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export async function getUniverseCookie(): Promise<{
  universeId: string;
  internalApiUrl: string;
} | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [payloadB64, signature] = raw.split('.');
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64, getSecret());
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8'),
    ) as UniverseCookiePayload;
    if (
      typeof payload.universeId !== 'string' ||
      typeof payload.internalApiUrl !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() >= payload.exp) return null;
    return { universeId: payload.universeId, internalApiUrl: payload.internalApiUrl };
  } catch {
    return null;
  }
}

export async function setUniverseCookie(
  universeId: string,
  internalApiUrl?: string,
): Promise<void> {
  const resolvedInternalApiUrl =
    internalApiUrl ?? (await resolveUniverseInternalApiUrl(universeId));

  const payload: UniverseCookiePayload = {
    universeId,
    internalApiUrl: resolvedInternalApiUrl,
    exp: Date.now() + COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(payloadB64, getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payloadB64}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearUniverseCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

async function resolveUniverseInternalApiUrl(universeId: string): Promise<string> {
  const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  const res = await fetch(`${apiOrigin}/api/universes/${encodeURIComponent(universeId)}/resolve`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve universe: ${res.status}`);
  }
  const data = (await res.json()) as { internalApiUrl: string };
  if (typeof data.internalApiUrl !== 'string') {
    throw new Error('Invalid universe resolve response');
  }
  return data.internalApiUrl;
}
