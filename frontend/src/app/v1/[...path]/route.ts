import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function backendUrl() {
  return process.env.BACKEND_URL || 'http://localhost:4000';
}

async function proxy(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const target = `${backendUrl()}/v1/${params.path.join('/')}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(target, init);

  const responseHeaders = new Headers(res.headers);
  responseHeaders.delete('transfer-encoding');
  responseHeaders.delete('connection');

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
