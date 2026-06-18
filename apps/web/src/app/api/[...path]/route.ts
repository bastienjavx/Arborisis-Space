import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
  const { path: segments } = await context.params;
  const path = segments.map(encodeURIComponent).join('/');
  const target = new URL(`/api/${path}${request.nextUrl.search}`, apiOrigin);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
    cache: 'no-store',
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
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
