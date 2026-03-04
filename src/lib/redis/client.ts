import { Redis } from '@upstash/redis';

/**
 * Upstash Redis 客户端
 * 用于边缘环境的 Redis 操作
 */

function sanitizeEnv(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  // Handle copied values wrapped by quotes.
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function isValidRedisUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// 检查环境变量是否配置
const redisUrl = sanitizeEnv(process.env.UPSTASH_REDIS_REST_URL);
const redisToken = sanitizeEnv(process.env.UPSTASH_REDIS_REST_TOKEN);

// 是否启用 Redis（需要配置环境变量）
export const isRedisEnabled = isValidRedisUrl(redisUrl) && !!redisToken;

// Redis 客户端实例
export const redis = isRedisEnabled
  ? new Redis({
      url: redisUrl!,
      token: redisToken!,
    })
  : null;

/**
 * Redis 键前缀
 */
export const REDIS_KEYS = {
  // 点赞相关
  likes: (postSlug: string) => `blog:likes:${postSlug}`,
  likeCount: (postSlug: string) => `blog:like_count:${postSlug}`,
  // 访客指纹
  visitorLike: (postSlug: string, fingerprint: string) =>
    `blog:visitor:${postSlug}:${fingerprint}`,
} as const;

/**
 * 获取文章点赞数
 */
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

/**
 * 检查访客是否已点赞
 */
export async function hasVisitorLiked(
  postSlug: string,
  fingerprint: string
): Promise<boolean> {
  if (!redis) return false;

  try {
    const result = await redis.exists(REDIS_KEYS.visitorLike(postSlug, fingerprint));
    return result === 1;
  } catch (error) {
    console.error('Failed to check visitor like:', error);
    return false;
  }
}

/**
 * 添加点赞（原子操作，避免竞态条件）
 * 返回是否成功（如果已点赞则返回 false）
 */
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

    // 使用 SET NX EX 实现原子性点赞
    // NX: 只在 key 不存在时设置
    // EX: 设置过期时间（7天）
    const result = await redis.set(
      visitorKey,
      Date.now().toString(),
      {
        nx: true, // 只在 key 不存在时设置
        ex: 60 * 60 * 24 * 7, // 7 天过期
      }
    );

    // 如果设置成功（即之前未点赞）
    if (result === 'OK') {
      // 原子性增加计数
      const newCount = await redis.incr(countKey);
      return { success: true, count: newCount };
    }

    // 已经点赞过，返回当前计数
    const currentCount = await getLikeCount(postSlug);
    return { success: false, count: currentCount };
  } catch (error) {
    console.error('Failed to add like:', error);
    const currentCount = await getLikeCount(postSlug);
    return { success: false, count: currentCount };
  }
}

/**
 * 批量获取多篇文章的点赞数
 */
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
