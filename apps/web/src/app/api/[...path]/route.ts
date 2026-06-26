import type { NextRequest } from 'next/server';
import { getUniverseCookie } from '@/lib/universe-cookie';

export const dynamic = 'force-dynamic';

const META_SEGMENTS = new Set(['auth', 'universes', 'health']);

function isMetaRoute(segments: string[]): boolean {
  return segments.length > 0 && META_SEGMENTS.has(segments[0]!);
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const meta = isMetaRoute(segments);

  let universe: { universeId: string; internalApiUrl: string } | null = null;
  let apiOrigin: string;

  if (meta) {
    apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  } else {
    universe = await getUniverseCookie();
    if (!universe) {
      return new Response(JSON.stringify({ message: 'Aucun univers sélectionné.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    apiOrigin = universe.internalApiUrl;
  }

  const path = segments.map(encodeURIComponent).join('/');
  const target = new URL(`/api/${path}${request.nextUrl.search}`, apiOrigin);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('transfer-encoding');
  if (universe) {
    headers.set('X-Universe-Id', universe.universeId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('proxy-timeout'), 30_000);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
      // Requis par Node/undici pour relayer un ReadableStream.
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const responseHeaders = new Headers(upstream.headers);
    const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie;
    if (getSetCookie) {
      responseHeaders.delete('set-cookie');
      for (const cookie of getSetCookie.call(upstream.headers)) {
        responseHeaders.append('set-cookie', cookie);
      }
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message =
      err === 'proxy-timeout' || (err instanceof Error && err.name === 'AbortError')
        ? 'Le serveur a mis trop de temps à répondre.'
        : 'Service indisponible.';
    return new Response(JSON.stringify({ message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
