/**
 * ============================================================================
 * content-source 模块 - 缓存层
 * ============================================================================
 *
 * 实现三级缓存架构
 * - L1: Next.js Cache (unstable_cache)
 * - L2: 内存缓存 (简单 Map 实现)
 * - L3: 降级快照（可选）
 *
 * @module content-source/cache
 */

import { unstable_cache } from 'next/cache';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 缓存标签 */
  tags?: string[];
  /** 缓存有效期（秒） */
  ttl?: number;
  /** 是否允许返回过期数据（降级策略） */
  allowStale?: boolean;
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// L2: 内存缓存
// ============================================================================

/**
 * 内存缓存存储
 */
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * 内存缓存实现
 */
export const memoryCacheService = {
  /**
   * 获取缓存
   */
  get<T>(key: string, options?: { allowStale?: boolean }): T | null {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl * 1000;

    // 如果允许过期数据（降级策略）或未过期，返回数据
    if (options?.allowStale || !isExpired) {
      return entry.data;
    }

    // 已过期且不允许过期数据，删除并返回 null
    memoryCache.delete(key);
    return null;
  },

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, options?: { ttl?: number }): void {
    const ttl = options?.ttl ?? 60; // 默认 60 秒
    memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });
  },

  /**
   * 删除缓存
   */
  delete(key: string): void {
    memoryCache.delete(key);
  },

  /**
   * 批量删除缓存（支持通配符）
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*') + '$'
    );

    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }
  },

  /**
   * 检查缓存是否存在
   */
  exists(key: string): boolean {
    return memoryCache.has(key);
  },

  /**
   * 获取缓存状态
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: memoryCache.size,
      keys: Array.from(memoryCache.keys()),
    };
  },

  /**
   * 清空所有缓存
   */
  clear(): void {
    memoryCache.clear();
  },
};

// ============================================================================
// L1: Next.js Cache 包装器
// ============================================================================

/**
 * 使用 Next.js Cache 包装函数
 *
 * @param fn - 要缓存的函数
 * @param keys - 缓存键数组
 * @param options - 缓存选项
 * @returns 缓存包装后的函数
 *
 * @example
 * ```typescript
 * const getCachedPosts = withNextCache(
 *   () => fetchPosts(),
 *   ['posts', 'all'],
 *   { tags: ['notion:posts'], ttl: 60 }
 * );
 *
 * const posts = await getCachedPosts();
 * ```
 */
export function withNextCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keys: string[],
  options?: CacheOptions
): T {
  return unstable_cache(fn, keys, {
    tags: options?.tags ?? [],
    revalidate: options?.ttl ?? 60,
  }) as T;
}

// ============================================================================
// 缓存键生成器
// ============================================================================

/**
 * 缓存键生成器
 */
export const cacheKeys = {
  /**
   * 数据库查询缓存键
   */
  databaseQuery: (databaseId: string, hash?: string) =>
    `notion:db:${databaseId}${hash ? `:${hash}` : ''}`,

  /**
   * 页面缓存键
   */
  page: (pageId: string) => `notion:page:${pageId}`,

  /**
   * 页面内容缓存键
   */
  pageContent: (pageId: string) => `notion:page:${pageId}:content`,

  /**
   * 所有文章列表缓存键
   */
  allPosts: () => 'notion:posts:all',

  /**
   * 已发布文章列表缓存键
   */
  publishedPosts: () => 'notion:posts:published',

  /**
   * 标签列表缓存键
   */
  allTags: () => 'notion:tags:all',

  /**
   * 分类列表缓存键
   */
  allCategories: () => 'notion:categories:all',

  // ============================================================================
  // 扩展缓存键（为 content-domain 模块提供）
  // ============================================================================

  /**
   * 文章相关缓存键
   */
  posts: {
    all: (...args: string[]) => `notion:posts:all:${args.join(':')}`,
    published: (...args: string[]) => `notion:posts:published:${args.join(':')}`,
    byTag: (tag: string, ...args: string[]) => `notion:posts:tag:${tag}:${args.join(':')}`,
    byCategory: (category: string, ...args: string[]) => `notion:posts:category:${category}:${args.join(':')}`,
    bySlug: (slug: string) => `notion:posts:slug:${slug}`,
    recent: (limit: number) => `notion:posts:recent:${limit}`,
  },

  /**
   * 标签相关缓存键
   */
  tags: {
    all: () => 'notion:tags:all',
  },

  /**
   * 分类相关缓存键
   */
  categories: {
    all: () => 'notion:categories:all',
  },
};

// ============================================================================
// 缓存标签
// ============================================================================

/**
 * 缓存标签常量
 */
export const cacheTags = {
  NOTION_DATABASE: 'notion:database',
  NOTION_PAGES: 'notion:pages',
  NOTION_PAGE: (id: string) => `notion:page:${id}`,

  // ============================================================================
  // 扩展缓存标签（为 content-domain 模块提供）
  // ============================================================================

  /**
   * 文章相关缓存标签
   */
  posts: {
    all: 'notion:posts:all',
    published: 'notion:posts:published',
    byTag: (tag: string) => `notion:posts:tag:${tag}`,
    byCategory: (category: string) => `notion:posts:category:${category}`,
    bySlug: (slug: string) => `notion:posts:slug:${slug}`,
    recent: 'notion:posts:recent',
  },

  /**
   * 标签相关缓存标签
   */
  tags: {
    all: 'notion:tags:all',
  },

  /**
   * 分类相关缓存标签
   */
  categories: {
    all: 'notion:categories:all',
  },
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成对象哈希（用于缓存键）
 *
 * 简单实现，用于生成查询选项的唯一标识
 */
export function hashObject(obj: unknown): string {
  const str = JSON.stringify(obj, Object.keys(obj as object).sort());
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * 组合缓存策略
 *
 * L1 (Next.js Cache) -> L2 (内存缓存) -> 原始数据
 *
 * @param fetcher - 数据获取函数
 * @param key - 缓存键
 * @param options - 缓存选项
 * @returns 数据
 */
export async function withCache<T>(
  fetcher: () => Promise<T>,
  key: string,
  options?: CacheOptions
): Promise<T> {
  // 尝试 L2 内存缓存
  const cached = memoryCacheService.get<T>(key, { allowStale: options?.allowStale });

  if (cached !== null) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] L2 hit: ${key}`);
    }
    return cached;
  }

  // L1/L2 未命中，获取数据
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] Miss: ${key}, fetching...`);
  }

  const data = await fetcher();

  // 写入 L2 缓存
  memoryCacheService.set(key, data, { ttl: options?.ttl });

  return data;
}