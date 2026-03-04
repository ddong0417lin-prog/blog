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
