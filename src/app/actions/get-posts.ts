'use server';

/**
 * ============================================================================
 * 文章数据获取 Server Actions
 * ============================================================================
 *
 * 使用 unstable_cache 实现 ISR 缓存
 */

import { postService } from '@/lib/content';
import type { ListOptions } from '@/contracts/types';
import { unstable_cache } from 'next/cache';
import { ISR_CONFIG } from '@/lib/constants';
import {
  getCommentCounts,
  getLikeCounts,
  getRankedPostIds,
  getViewCounts,
} from '@/lib/redis/client';

/**
 * 获取已发布文章列表（带缓存）
 */
export const getPublishedPosts = unstable_cache(
  async (options?: ListOptions) => {
    return postService.getPublishedPosts(options);
  },
  ['published-posts'],
  {
    revalidate: ISR_CONFIG.LIST_REVALIDATE,
    tags: ['posts'],
  }
);

/**
 * 获取最新文章
 */
export const getRecentPosts = unstable_cache(
  async (limit: number = 5) => {
    return postService.getRecentPosts(limit);
  },
  ['recent-posts'],
  {
    revalidate: ISR_CONFIG.LIST_REVALIDATE,
    tags: ['posts'],
  }
);

/**
 * 获取所有标签
 */
export const getAllTags = unstable_cache(
  async () => {
    return postService.getAllTags();
  },
  ['all-tags'],
  {
    revalidate: ISR_CONFIG.DETAIL_REVALIDATE,
    tags: ['tags'],
  }
);

/**
 * 获取所有分类
 */
export const getAllCategories = unstable_cache(
  async () => {
    return postService.getAllCategories();
  },
  ['all-categories'],
  {
    revalidate: ISR_CONFIG.DETAIL_REVALIDATE,
    tags: ['categories'],
  }
);

/**
 * 根据标签获取文章
 */
export const getPostsByTag = unstable_cache(
  async (tag: string, options?: ListOptions) => {
    return postService.getPostsByTag(tag, options);
  },
  ['posts-by-tag'],
  {
    revalidate: ISR_CONFIG.LIST_REVALIDATE,
    tags: ['posts', 'tags'],
  }
);

/**
 * 根据分类获取文章
 */
export const getPostsByCategory = unstable_cache(
  async (category: string, options?: ListOptions) => {
    return postService.getPostsByCategory(category, options);
  },
  ['posts-by-category'],
  {
    revalidate: ISR_CONFIG.LIST_REVALIDATE,
    tags: ['posts', 'categories'],
  }
);

/**
 * 根据 slug 获取文章详情
 */
export async function getPostBySlug(slug: string) {
  return postService.getPostBySlug(slug);
}

/**
 * 获取相关文章
 */
export async function getRelatedPosts(slug: string, limit?: number) {
  return postService.getRelatedPosts(slug, limit);
}

/**
 * 获取所有已发布文章（全量，用于 sitemap）
 * 不受分页限制，返回所有文章摘要
 */
export const getAllPublishedPosts = unstable_cache(
  async () => {
    return postService.getAllPublishedPosts();
  },
  ['all-published-posts'],
  {
    revalidate: ISR_CONFIG.DETAIL_REVALIDATE,
    tags: ['posts'],
  }
);

function parseCursorToIndex(startCursor?: string): number {
  const value = Number(startCursor || 0);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function sortByPublishedAtDesc<T extends { publishedAt: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function pickFromRankedIds<T extends { id: string }>(
  allItems: T[],
  ids: string[]
): T[] {
  if (ids.length === 0) return [];
  const byId = new Map(allItems.map((item) => [item.id, item] as const));
  return ids.map((id) => byId.get(id)).filter(Boolean) as T[];
}

export async function getLatestPostsWindow(options?: {
  pageSize?: number;
  startCursor?: string;
  limit?: number;
}) {
  const pageSize = options?.pageSize || 12;
  const limit = Math.min(options?.limit || 100, 100);
  const startIndex = parseCursorToIndex(options?.startCursor);

  const allPosts = await getAllPublishedPosts();
  const ranked = sortByPublishedAtDesc(allPosts).slice(0, limit);

  const pageItems = ranked.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < ranked.length;

  return {
    data: pageItems,
    hasMore,
    nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
    total: ranked.length,
  };
}

export async function getHotPostsWindow(options?: {
  pageSize?: number;
  startCursor?: string;
  limit?: number;
}) {
  const pageSize = options?.pageSize || 12;
  const limit = Math.min(options?.limit || 100, 100);
  const startIndex = parseCursorToIndex(options?.startCursor);

  const allPosts = await getAllPublishedPosts();
  const likeCountsAll = await getLikeCounts(allPosts.map((post) => post.id));
  const rankedByValue = [...allPosts]
    .sort((a, b) => {
      const likeDiff = (likeCountsAll[b.id] || 0) - (likeCountsAll[a.id] || 0);
      if (likeDiff !== 0) return likeDiff;

      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);

  const { ids: rankedIds, total: rankedTotal } = await getRankedPostIds(
    'likes',
    startIndex,
    pageSize,
    limit
  );

  const rankedFromIndex = pickFromRankedIds(allPosts, rankedIds);
  const pageItems =
    rankedFromIndex.length > 0
      ? rankedFromIndex
      : rankedByValue.slice(startIndex, startIndex + pageSize);
  const total = rankedFromIndex.length > 0 ? rankedTotal : rankedByValue.length;
  const hasMore = startIndex + pageSize < total;
  const countsForPage = pageItems.reduce<Record<string, number>>((acc, post) => {
    acc[post.id] = likeCountsAll[post.id] || 0;
    return acc;
  }, {});

  return {
    data: pageItems,
    hasMore,
    nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
    total,
    likeCounts: countsForPage,
  };
}

export async function getMostViewedPostsWindow(options?: {
  pageSize?: number;
  startCursor?: string;
  limit?: number;
}) {
  const pageSize = options?.pageSize || 12;
  const limit = Math.min(options?.limit || 100, 100);
  const startIndex = parseCursorToIndex(options?.startCursor);

  const allPosts = await getAllPublishedPosts();
  const viewCountsAll = await getViewCounts(allPosts.map((post) => post.id));
  const rankedByValue = [...allPosts]
    .sort((a, b) => {
      const viewDiff = (viewCountsAll[b.id] || 0) - (viewCountsAll[a.id] || 0);
      if (viewDiff !== 0) return viewDiff;

      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);

  const { ids: rankedIds, total: rankedTotal } = await getRankedPostIds(
    'views',
    startIndex,
    pageSize,
    limit
  );

  const rankedFromIndex = pickFromRankedIds(allPosts, rankedIds);
  const pageItems =
    rankedFromIndex.length > 0
      ? rankedFromIndex
      : rankedByValue.slice(startIndex, startIndex + pageSize);
  const total = rankedFromIndex.length > 0 ? rankedTotal : rankedByValue.length;
  const hasMore = startIndex + pageSize < total;
  const countsForPage = pageItems.reduce<Record<string, number>>((acc, post) => {
    acc[post.id] = viewCountsAll[post.id] || 0;
    return acc;
  }, {});

  return {
    data: pageItems,
    hasMore,
    nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
    total,
    viewCounts: countsForPage,
  };
}

export async function getMostCommentedPostsWindow(options?: {
  pageSize?: number;
  startCursor?: string;
  limit?: number;
}) {
  const pageSize = options?.pageSize || 12;
  const limit = Math.min(options?.limit || 100, 100);
  const startIndex = parseCursorToIndex(options?.startCursor);

  const allPosts = await getAllPublishedPosts();
  const commentCountsAll = await getCommentCounts(allPosts.map((post) => post.id));
  const rankedByValue = [...allPosts]
    .sort((a, b) => {
      const commentDiff = (commentCountsAll[b.id] || 0) - (commentCountsAll[a.id] || 0);
      if (commentDiff !== 0) return commentDiff;

      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);

  const { ids: rankedIds, total: rankedTotal } = await getRankedPostIds(
    'comments',
    startIndex,
    pageSize,
    limit
  );

  const rankedFromIndex = pickFromRankedIds(allPosts, rankedIds);
  const pageItems =
    rankedFromIndex.length > 0
      ? rankedFromIndex
      : rankedByValue.slice(startIndex, startIndex + pageSize);
  const total = rankedFromIndex.length > 0 ? rankedTotal : rankedByValue.length;
  const hasMore = startIndex + pageSize < total;
  const countsForPage = pageItems.reduce<Record<string, number>>((acc, post) => {
    acc[post.id] = commentCountsAll[post.id] || 0;
    return acc;
  }, {});

  return {
    data: pageItems,
    hasMore,
    nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
    total,
    commentCounts: countsForPage,
  };
}
