import { Redis } from '@upstash/redis';

function sanitizeEnv(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function isValidRedisUrl(value: string): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;

    // Upstash REST endpoints are hosted on *.upstash.io.
    // Reject generic site URLs like https://upstash.com.
    const hostname = url.hostname.toLowerCase();
    return hostname === 'localhost' || hostname.endsWith('.upstash.io');
  } catch {
    return false;
  }
}

const redisUrl = sanitizeEnv(process.env.UPSTASH_REDIS_REST_URL);
const redisToken = sanitizeEnv(process.env.UPSTASH_REDIS_REST_TOKEN);

export const isRedisEnabled = isValidRedisUrl(redisUrl) && !!redisToken;

if ((redisUrl || redisToken) && !isRedisEnabled) {
  console.warn(
    '[redis] Invalid UPSTASH_REDIS_REST_URL/TOKEN. Like feature disabled.'
  );
}

export const redis = isRedisEnabled
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

export const REDIS_KEYS = {
  likes: (postSlug: string) => `blog:likes:${postSlug}`,
  likeCount: (postSlug: string) => `blog:like_count:${postSlug}`,
  visitorLike: (postSlug: string, fingerprint: string) =>
    `blog:visitor:${postSlug}:${fingerprint}`,
  uvCount: (postSlug: string) => `blog:uv:${postSlug}`,
  rankLikes: () => 'blog:rank:likes',
  rankViews: () => 'blog:rank:views',
  commentCount: (postSlug: string) => `blog:comment_count:${postSlug}`,
  commentRank: () => 'blog:rank:comments',
  commentSyncAt: () => 'blog:comment_sync_at',
} as const;

export async function getLikeCount(postSlug: string): Promise<number> {
  if (!redis) return 0;

  try {
    const count = await redis.get<number>(REDIS_KEYS.likeCount(postSlug));
    return count ?? 0;
  } catch (error) {
    console.error('Failed to get like count:', error);
    return 0;
  }
}

export async function hasVisitorLiked(
  postSlug: string,
  fingerprint: string
): Promise<boolean> {
  if (!redis) return false;

  try {
    const result = await redis.exists(
      REDIS_KEYS.visitorLike(postSlug, fingerprint)
    );
    return result === 1;
  } catch (error) {
    console.error('Failed to check visitor like:', error);
    return false;
  }
}

export async function addLike(
  postSlug: string,
  fingerprint: string
): Promise<{ success: boolean; count: number }> {
  if (!redis) {
    return { success: false, count: 0 };
  }

  try {
    const visitorKey = REDIS_KEYS.visitorLike(postSlug, fingerprint);
    const countKey = REDIS_KEYS.likeCount(postSlug);

    const result = await redis.set(visitorKey, Date.now().toString(), {
      nx: true,
      ex: 60 * 60 * 24 * 7,
    });

    if (result === 'OK') {
      const newCount = await redis.incr(countKey);
      await redis.zincrby(REDIS_KEYS.rankLikes(), 1, postSlug);
      return { success: true, count: newCount };
    }

    const currentCount = await getLikeCount(postSlug);
    return { success: false, count: currentCount };
  } catch (error) {
    console.error('Failed to add like:', error);
    const currentCount = await getLikeCount(postSlug);
    return { success: false, count: currentCount };
  }
}

export async function getLikeCounts(
  postSlugs: string[]
): Promise<Record<string, number>> {
  if (!redis || postSlugs.length === 0) {
    return {};
  }

  try {
    const pipeline = redis.pipeline();
    for (const slug of postSlugs) {
      pipeline.get<number>(REDIS_KEYS.likeCount(slug));
    }

    const results = await pipeline.exec();
    const counts: Record<string, number> = {};

    postSlugs.forEach((slug, index) => {
      counts[slug] = (results[index] as number) ?? 0;
    });

    return counts;
  } catch (error) {
    console.error('Failed to get like counts:', error);
    return {};
  }
}

export async function getViewCount(postSlug: string): Promise<number> {
  if (!redis) return 0;

  try {
    const count = await redis.pfcount(REDIS_KEYS.uvCount(postSlug));
    return Number(count ?? 0);
  } catch (error) {
    console.error('Failed to get view count:', error);
    return 0;
  }
}

export async function addView(
  postSlug: string,
  fingerprint: string
): Promise<{ success: boolean; count: number }> {
  if (!redis) {
    return { success: false, count: 0 };
  }

  try {
    // HLL UV: PFADD returns 1 when cardinality changed, else 0.
    const changed = await redis.pfadd(REDIS_KEYS.uvCount(postSlug), fingerprint);
    if (Number(changed) === 1) {
      await redis.zincrby(REDIS_KEYS.rankViews(), 1, postSlug);
    }
    const currentCount = await getViewCount(postSlug);
    return { success: Number(changed) === 1, count: currentCount };
  } catch (error) {
    console.error('Failed to add view:', error);
    const currentCount = await getViewCount(postSlug);
    return { success: false, count: currentCount };
  }
}

export async function getViewCounts(
  postSlugs: string[]
): Promise<Record<string, number>> {
  if (!redis || postSlugs.length === 0) {
    return {};
  }

  try {
    const pipeline = redis.pipeline();
    for (const slug of postSlugs) {
      pipeline.pfcount(REDIS_KEYS.uvCount(slug));
    }

    const results = await pipeline.exec();
    const counts: Record<string, number> = {};

    postSlugs.forEach((slug, index) => {
      counts[slug] = Number((results[index] as number) ?? 0);
    });

    return counts;
  } catch (error) {
    console.error('Failed to get view counts:', error);
    return {};
  }
}

export async function getCommentCount(postSlug: string): Promise<number> {
  if (!redis) return 0;

  try {
    const count = await redis.get<number>(REDIS_KEYS.commentCount(postSlug));
    return count ?? 0;
  } catch (error) {
    console.error('Failed to get comment count:', error);
    return 0;
  }
}

export async function getCommentCounts(
  postSlugs: string[]
): Promise<Record<string, number>> {
  if (!redis || postSlugs.length === 0) {
    return {};
  }

  try {
    const pipeline = redis.pipeline();
    for (const slug of postSlugs) {
      pipeline.get<number>(REDIS_KEYS.commentCount(slug));
    }

    const results = await pipeline.exec();
    const counts: Record<string, number> = {};

    postSlugs.forEach((slug, index) => {
      counts[slug] = Number((results[index] as number) ?? 0);
    });

    return counts;
  } catch (error) {
    console.error('Failed to get comment counts:', error);
    return {};
  }
}

export async function syncCommentCounts(
  counts: Record<string, number>
): Promise<void> {
  if (!redis) return;

  try {
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      await redis.set(REDIS_KEYS.commentSyncAt(), Date.now().toString());
      return;
    }

    const pipeline = redis.pipeline();
    for (const [postSlug, count] of entries) {
      const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
      pipeline.set(REDIS_KEYS.commentCount(postSlug), normalizedCount);
      pipeline.zadd(REDIS_KEYS.commentRank(), {
        score: normalizedCount,
        member: postSlug,
      });
    }
    pipeline.set(REDIS_KEYS.commentSyncAt(), Date.now().toString());
    await pipeline.exec();
  } catch (error) {
    console.error('Failed to sync comment counts:', error);
  }
}

type RankMetric = 'likes' | 'views' | 'comments';

function getRankKey(metric: RankMetric): string {
  if (metric === 'likes') return REDIS_KEYS.rankLikes();
  if (metric === 'views') return REDIS_KEYS.rankViews();
  return REDIS_KEYS.commentRank();
}

export async function getRankedPostIds(
  metric: RankMetric,
  start: number,
  pageSize: number,
  limit: number
): Promise<{ ids: string[]; total: number }> {
  if (!redis) {
    return { ids: [], total: 0 };
  }

  const rankKey = getRankKey(metric);
  const startIndex = Math.max(0, Math.floor(start));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const safeLimit = Math.max(1, Math.floor(limit));
  const endIndex = Math.min(startIndex + safePageSize - 1, safeLimit - 1);

  if (startIndex > endIndex) {
    return { ids: [], total: 0 };
  }

  try {
    const [idsRaw, totalRaw] = await Promise.all([
      redis.zrange<string[]>(rankKey, startIndex, endIndex, { rev: true }),
      redis.zcard(rankKey),
    ]);
    const ids = (idsRaw || []).filter(Boolean);
    const total = Math.min(Number(totalRaw || 0), safeLimit);
    return { ids, total };
  } catch (error) {
    console.error('Failed to get ranked post ids:', error);
    return { ids: [], total: 0 };
  }
}
