import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function backendUrl() {
  return process.env.BACKEND_URL || 'http://localhost:4000';
}

async function proxy(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const base = backendUrl();
  const target = `${base}/v1/${params.path.join('/')}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    init.signal = controller.signal;

    const res = await fetch(target, init);
    clearTimeout(timeout);

    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[API Proxy] Failed to reach backend at ${target}: ${message}`);
    return NextResponse.json(
      {
        error: 'Backend unreachable',
        detail: `Could not connect to ${base}. Is the backend service running?`,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
