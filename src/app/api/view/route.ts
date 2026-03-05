import { NextRequest, NextResponse } from 'next/server';
import { addView, getViewCount, isRedisEnabled } from '@/lib/redis/client';
import {
  createVisitorFingerprint,
  getClientVisitorIdFromRequest,
} from '@/lib/visitor-fingerprint';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  if (!isRedisEnabled) {
    return NextResponse.json({ count: 0, enabled: false, tracked: false });
  }

  try {
    const clientVisitorId = getClientVisitorIdFromRequest(request);
    const fingerprint = createVisitorFingerprint(request, clientVisitorId);
    const result = await addView(slug, fingerprint);

    return NextResponse.json({
      count: result.count,
      enabled: true,
      tracked: result.success,
    });
  } catch (error) {
    console.error('Failed to track view:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug || !isRedisEnabled) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const count = await getViewCount(slug);
    return new NextResponse(null, {
      status: 204,
      headers: {
        'x-view-count': String(count),
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}