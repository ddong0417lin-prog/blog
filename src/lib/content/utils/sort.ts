/**
 * ============================================================================
 * 排序工具函数
 * ============================================================================
 *
 * 提供文章列表的排序功能
 *
 * @version 1.0.0
 * ============================================================================
 */

import type { PostSummary } from '@/contracts/types';

/**
 * 支持的排序字段
 */
export type SortField = 'publishedAt' | 'updatedAt' | 'title';

/**
 * 排序选项
 */
export interface SortOptions {
  field: SortField;
  order: 'asc' | 'desc';
}

/**
 * 默认排序选项
 */
export const DEFAULT_SORT_OPTIONS: SortOptions = {
  field: 'publishedAt',
  order: 'desc',
};

/**
 * 根据字段获取排序值
 *
 * @param post - 文章
 * @param field - 排序字段
 * @returns 排序用的值
 */
function getSortValue(post: PostSummary, field: SortField): string | number | null {
  switch (field) {
    case 'publishedAt':
      return post.publishedAt || '';
    case 'updatedAt':
      return post.updatedAt;
    case 'title':
      return post.title.toLowerCase();
    default:
      return '';
  }
}

/**
 * 比较两个值（用于排序）
 *
 * @param a - 第一个值
 * @param b - 第二个值
 * @param order - 排序方向
 * @returns 比较结果
 */
function compareValues(
  a: string | number | null,
  b: string | number | null,
  order: 'asc' | 'desc'
): number {
  // 处理 null 值
  if (a === null && b === null) return 0;
  if (a === null) return order === 'asc' ? 1 : -1;
  if (b === null) return order === 'asc' ? -1 : 1;

  // 字符串比较
  if (typeof a === 'string' && typeof b === 'string') {
    return order === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  }

  // 数字比较
  if (typeof a === 'number' && typeof b === 'number') {
    return order === 'asc' ? a - b : b - a;
  }

  return 0;
}

/**
 * 排序文章列表
 *
 * @param posts - 文章列表
 * @param sortBy - 排序字段（默认 'publishedAt'）
 * @param sortOrder - 排序方向（默认 'desc'）
 * @returns 排序后的文章列表（不修改原数组）
 */
export function sortPosts(
  posts: PostSummary[],
  sortBy: SortField = 'publishedAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): PostSummary[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  // 复制数组，避免修改原数组
  const sortedPosts = [...posts];

  sortedPosts.sort((a, b) => {
    const aValue = getSortValue(a, sortBy);
    const bValue = getSortValue(b, sortBy);
    return compareValues(aValue, bValue, sortOrder);
  });

  return sortedPosts;
}

/**
 * 按日期排序（最新优先）
 *
 * @param posts - 文章列表
 * @returns 排序后的文章列表
 */
export function sortByNewest(posts: PostSummary[]): PostSummary[] {
  return sortPosts(posts, 'publishedAt', 'desc');
}

/**
 * 按日期排序（最旧优先）
 *
 * @param posts - 文章列表
 * @returns 排序后的文章列表
 */
export function sortByOldest(posts: PostSummary[]): PostSummary[] {
  return sortPosts(posts, 'publishedAt', 'asc');
}

/**
 * 按标题排序（A-Z）
 *
 * @param posts - 文章列表
 * @returns 排序后的文章列表
 */
export function sortByTitleAsc(posts: PostSummary[]): PostSummary[] {
  return sortPosts(posts, 'title', 'asc');
}

/**
 * 按标题排序（Z-A）
 *
 * @param posts - 文章列表
 * @returns 排序后的文章列表
 */
export function sortByTitleDesc(posts: PostSummary[]): PostSummary[] {
  return sortPosts(posts, 'title', 'desc');
}