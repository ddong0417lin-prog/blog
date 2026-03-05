import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

function normalize(value?: string | null): string {
  return (value || '').trim();
}

export function normalizeClientVisitorId(value?: string | null): string {
  return normalize(value);
}

export function getClientVisitorIdFromRequest(request: NextRequest): string {
  const fromQuery = normalize(request.nextUrl.searchParams.get('visitorId'));
  if (fromQuery) return fromQuery;

  const fromHeader = normalize(request.headers.get('x-visitor-id'));
  if (fromHeader) return fromHeader;

  return '';
}

export async function getClientVisitorIdFromJsonBody(
  request: NextRequest
): Promise<string> {
  try {
    const body = await request.json();
    return normalize(body?.visitorId);
  } catch {
    return '';
  }
}

export function createVisitorFingerprint(
  request: NextRequest,
  clientVisitorId?: string
): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const stableClientId = normalize(clientVisitorId) || 'anonymous';

  const raw = `${ip}|${userAgent}|${stableClientId}`;
  return createHash('sha256').update(raw).digest('base64url');
}