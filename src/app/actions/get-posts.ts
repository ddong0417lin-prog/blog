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
export const getPostBySlug = unstable_cache(
  async (slug: string) => {
    return postService.getPostBySlug(slug);
  },
  ['post-by-slug'],
  {
    revalidate: ISR_CONFIG.DETAIL_REVALIDATE,
    tags: ['posts'],
  }
);

/**
 * 获取相关文章
 */
export const getRelatedPosts = unstable_cache(
  async (slug: string, limit?: number) => {
    return postService.getRelatedPosts(slug, limit);
  },
  ['related-posts'],
  {
    revalidate: ISR_CONFIG.DETAIL_REVALIDATE,
    tags: ['posts'],
  }
);

/**
 * 获取所有已发布文章（全量，用于 sitemap）
 * 不受分页限制，返回所有文章摘要
 */
export const getAllPublishedPosts = unstable_cache(
  async () => {
    // 使用 searchPosts 的内部逻辑获取全量文章
    // searchPosts 内部调用 getAllPublishedPostsCached，已实现全量获取
    const allPosts = await postService.searchPosts('');
    return allPosts;
  },
  ['all-published-posts'],
  {
    revalidate: ISR_CONFIG.DETAIL_REVALIDATE,
    tags: ['posts'],
  }
);