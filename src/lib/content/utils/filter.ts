/**
 * ============================================================================
 * 过滤工具函数
 * ============================================================================
 *
 * 提供文章列表的过滤功能
 *
 * @version 1.0.0
 * ============================================================================
 */

import type { PostSummary } from '@/contracts/types';
import { PostStatus } from '@/contracts/types';

/**
 * 默认分类
 */
export const DEFAULT_CATEGORY = 'Uncategorized';

/**
 * 过滤已发布的文章
 * 只返回 status 为 'published' 且有 publishedAt 日期的文章
 *
 * @param posts - 文章列表
 * @returns 过滤后的已发布文章列表
 */
export function filterPublishedPosts(posts: PostSummary[]): PostSummary[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  return posts.filter((post) => {
    return post.status === PostStatus.PUBLISHED && post.publishedAt !== null;
  });
}

/**
 * 过滤所有文章（包括草稿）
 *
 * @param posts - 文章列表
 * @returns 所有文章（包括草稿）
 */
export function filterAllPosts(posts: PostSummary[]): PostSummary[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  return [...posts];
}

/**
 * 根据标签过滤文章
 * 检查文章的 tags 数组是否包含指定标签
 *
 * @param posts - 文章列表
 * @param tag - 标签 slug 或名称
 * @returns 匹配的文章列表
 */
export function filterPostsByTag(posts: PostSummary[], tag: string): PostSummary[] {
  if (!posts || posts.length === 0 || !tag) {
    return [];
  }

  const normalizedTag = tag.toLowerCase();

  return posts.filter((post) => {
    // 检查 tags 数组
    return post.tags.some((t: string) => t.toLowerCase() === normalizedTag);
  });
}

/**
 * 根据分类过滤文章
 * 检查文章的 category 是否匹配
 *
 * @param posts - 文章列表
 * @param category - 分类 slug 或名称
 * @returns 匹配的文章列表
 */
export function filterPostsByCategory(posts: PostSummary[], category: string): PostSummary[] {
  if (!posts || posts.length === 0 || !category) {
    return [];
  }

  const normalizedCategory = category.toLowerCase();

  return posts.filter((post) => {
    return post.category.toLowerCase() === normalizedCategory;
  });
}

/**
 * 根据状态过滤文章
 *
 * @param posts - 文章列表
 * @param status - 文章状态
 * @returns 匹配的文章列表
 */
export function filterPostsByStatus(posts: PostSummary[], status: PostStatus): PostSummary[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  return posts.filter((post) => post.status === status);
}

/**
 * 组合过滤多个条件的通用过滤函数
 *
 * @param posts - 文章列表
 * @param conditions - 过滤条件
 * @returns 过滤后的文章列表
 */
export interface FilterConditions {
  /** 过滤已发布 */
  published?: boolean;

  /** 标签 */
  tag?: string;

  /** 分类 */
  category?: string;

  /** 状态 */
  status?: PostStatus;
}

export function filterPosts(posts: PostSummary[], conditions: FilterConditions): PostSummary[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  let filtered = posts;

  // 过滤已发布
  if (conditions.published !== undefined) {
    if (conditions.published) {
      filtered = filterPublishedPosts(filtered);
    }
  }

  // 过滤标签
  if (conditions.tag) {
    filtered = filterPostsByTag(filtered, conditions.tag);
  }

  // 过滤分类
  if (conditions.category) {
    filtered = filterPostsByCategory(filtered, conditions.category);
  }

  // 过滤状态
  if (conditions.status) {
    filtered = filterPostsByStatus(filtered, conditions.status);
  }

  return filtered;
}

/**
 * 获取有封面的文章
 *
 * @param posts - 文章列表
 * @returns 有封面的文章列表
 */
export function filterPostsWithCover(posts: PostSummary[]): PostSummary[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  return posts.filter((post) => !!post.coverImage);
}

/**
 * 获取指定数量的最新文章
 *
 * @param posts - 文章列表
 * @param limit - 限制数量
 * @returns 最新文章列表
 */
export function getRecentPosts(posts: PostSummary[], limit: number = 5): PostSummary[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  // 先过滤已发布的文章
  const published = filterPublishedPosts(posts);

  // 按发布时间排序（最新优先）
  const sorted = [...published].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  return sorted.slice(0, limit);
}