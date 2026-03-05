import { NextRequest, NextResponse } from 'next/server';
import {
  addLike,
  getLikeCount,
  hasVisitorLiked,
  isRedisEnabled,
} from '@/lib/redis/client';
import {
  createVisitorFingerprint,
  getClientVisitorIdFromRequest,
  normalizeClientVisitorId,
} from '@/lib/visitor-fingerprint';

/**
 * GET /api/like?slug=xxx&visitorId=xxx
 * Get post like count and whether current visitor liked.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing slug parameter' },
      { status: 400 }
    );
  }

  if (!isRedisEnabled) {
    return NextResponse.json({
      count: 0,
      hasLiked: false,
      enabled: false,
    });
  }

  try {
    const clientVisitorId = getClientVisitorIdFromRequest(request);
    const fingerprint = createVisitorFingerprint(request, clientVisitorId);

    const [count, hasLiked] = await Promise.all([
      getLikeCount(slug),
      hasVisitorLiked(slug, fingerprint),
    ]);

    return NextResponse.json({
      count,
      hasLiked,
      enabled: true,
    });
  } catch (error) {
    console.error('Failed to get like count:', error);
    return NextResponse.json(
      { error: 'Failed to get like count' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/like
 * Body: { slug: string, visitorId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body?.slug as string | undefined;

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      );
    }

    if (!isRedisEnabled) {
      return NextResponse.json(
        { error: 'Like feature is not enabled' },
        { status: 503 }
      );
    }

    const clientVisitorId = normalizeClientVisitorId(body?.visitorId);
    const fingerprint = createVisitorFingerprint(request, clientVisitorId);
    const result = await addLike(slug, fingerprint);

    if (result.success) {
      return NextResponse.json({
        success: true,
        count: result.count,
        message: 'Liked successfully',
      });
    }

    return NextResponse.json({
      success: false,
      count: result.count,
      message: 'Already liked',
    });
  } catch (error) {
    console.error('Failed to add like:', error);
    return NextResponse.json({ error: 'Failed to add like' }, { status: 500 });
  }
}