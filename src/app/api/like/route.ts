import { NextRequest, NextResponse } from 'next/server';
import {
  isRedisEnabled,
  getLikeCount,
  addLike,
  hasVisitorLiked,
} from '@/lib/redis/client';

/**
 * 生成访客指纹
 * 基于 IP 地址和 User-Agent 生成唯一标识
 */
function generateVisitorFingerprint(request: NextRequest): string {
  // 获取 IP 地址
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // 获取 User-Agent
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // 简单的指纹生成（可以改用更安全的哈希算法）
  const fingerprint = `${ip}:${userAgent}`;

  // 使用 base64 编码作为指纹
  return Buffer.from(fingerprint).toString('base64');
}

/**
 * GET /api/like?slug=xxx
 * 获取文章点赞数
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

  // 如果 Redis 未启用，返回默认值
  if (!isRedisEnabled) {
    return NextResponse.json({
      count: 0,
      enabled: false,
    });
  }

  try {
    const count = await getLikeCount(slug);
    const fingerprint = generateVisitorFingerprint(request);
    // Always use wrapped helper for graceful fallback on Redis errors.
    const hasLiked = await hasVisitorLiked(slug, fingerprint);

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
 * 点赞文章
 * Body: { slug: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      );
    }

    // 如果 Redis 未启用，返回错误
    if (!isRedisEnabled) {
      return NextResponse.json(
        { error: 'Like feature is not enabled' },
        { status: 503 }
      );
    }

    const fingerprint = generateVisitorFingerprint(request);
    const result = await addLike(slug, fingerprint);

    if (result.success) {
      return NextResponse.json({
        success: true,
        count: result.count,
        message: 'Liked successfully',
      });
    } else {
      return NextResponse.json({
        success: false,
        count: result.count,
        message: 'Already liked',
      });
    }
  } catch (error) {
    console.error('Failed to add like:', error);
    return NextResponse.json(
      { error: 'Failed to add like' },
      { status: 500 }
    );
  }
}
