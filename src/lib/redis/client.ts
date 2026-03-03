import { Redis } from '@upstash/redis';

/**
 * Upstash Redis 客户端
 * 用于边缘环境的 Redis 操作
 */

// 检查环境变量是否配置
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// 是否启用 Redis（需要配置环境变量）
export const isRedisEnabled = !!(redisUrl && redisToken);

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
 * 添加点赞
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
    // 检查是否已点赞
    const alreadyLiked = await hasVisitorLiked(postSlug, fingerprint);
    if (alreadyLiked) {
      const currentCount = await getLikeCount(postSlug);
      return { success: false, count: currentCount };
    }

    // 记录访客点赞（7天过期）
    await redis.setex(
      REDIS_KEYS.visitorLike(postSlug, fingerprint),
      60 * 60 * 24 * 7, // 7 天过期
      Date.now().toString()
    );

    // 增加点赞计数
    const newCount = await redis.incr(REDIS_KEYS.likeCount(postSlug));

    return { success: true, count: newCount };
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