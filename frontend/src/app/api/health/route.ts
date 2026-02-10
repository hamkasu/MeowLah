import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

  let backendStatus = 'unreachable';
  let backendDetail = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${backendUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    backendStatus = res.ok ? 'ok' : `HTTP ${res.status}`;
    backendDetail = await res.text();
  } catch (err) {
    backendDetail = err instanceof Error ? err.message : 'unknown error';
  }

  return NextResponse.json({
    status: 'ok',
    backend_url: backendUrl,
    backend_status: backendStatus,
    backend_detail: backendDetail,
  });
}
