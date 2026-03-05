/**
 * ============================================================================
 * 统计工具函数
 * ============================================================================
 *
 * 提供文章列表的统计功能，包括标签和分类统计
 *
 * @version 1.0.0
 * ============================================================================
 */

import type { PostSummary, Tag, Category } from '@/contracts/types';
import { filterPublishedPosts } from './filter';
import { resolveSlugConflict } from './slug';

function normalizeDisplaySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function toStableSlugRecords<T extends { name: string; count: number }>(
  items: T[]
): Array<T & { slug: string }> {
  const existing = new Set<string>();
  return items.map((item) => {
    const slug = resolveSlugConflict(normalizeDisplaySlug(item.name), existing);
    existing.add(slug);
    return {
      ...item,
      slug,
    };
  });
}

/**
 * 从文章列表提取所有标签及其出现次数
 *
 * @param posts - 文章列表
 * @returns 标签列表（按数量降序排序）
 */
export function extractTags(posts: PostSummary[]): Tag[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  // 只统计已发布文章的标签
  const publishedPosts = filterPublishedPosts(posts);

  const tagCounts = new Map<string, number>();

  // 统计每个标签的出现次数
  for (const post of publishedPosts) {
    for (const tag of post.tags) {
      const normalizedTag = tag.trim();
      if (normalizedTag) {
        tagCounts.set(
          normalizedTag,
          (tagCounts.get(normalizedTag) || 0) + 1
        );
      }
    }
  }

  // 转换为 Tag 数组并排序
  const tags: Tag[] = toStableSlugRecords(
    Array.from(tagCounts.entries()).map(([name, count]) => ({
      name,
      count,
    }))
  );

  // 按数量降序排序，相同数量则按名称排序
  return tags.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * 从文章列表提取所有分类及其出现次数
 *
 * @param posts - 文章列表
 * @returns 分类列表（按数量降序排序）
 */
export function extractCategories(posts: PostSummary[]): Category[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  // 只统计已发布文章的分类
  const publishedPosts = filterPublishedPosts(posts);

  const categoryCounts = new Map<string, number>();

  // 统计每个分类的出现次数
  for (const post of publishedPosts) {
    const category = post.category || 'Uncategorized';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  // 转换为 Category 数组并排序
  const categories: Category[] = toStableSlugRecords(
    Array.from(categoryCounts.entries()).map(([name, count]) => ({
      name,
      count,
    }))
  );

  // 按数量降序排序，相同数量则按名称排序
  return categories.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * 统计文章总数
 *
 * @param posts - 文章列表
 * @param onlyPublished - 是否只统计已发布文章
 * @returns 文章数量
 */
export function countPosts(posts: PostSummary[], onlyPublished: boolean = true): number {
  if (!posts || posts.length === 0) {
    return 0;
  }

  if (onlyPublished) {
    return filterPublishedPosts(posts).length;
  }

  return posts.length;
}

/**
 * 统计阅读时长总数（分钟）
 *
 * @param posts - 文章列表
 * @param onlyPublished - 是否只统计已发布文章
 * @returns 总阅读时长
 */
export function countTotalReadingTime(
  posts: PostSummary[],
  onlyPublished: boolean = true
): number {
  if (!posts || posts.length === 0) {
    return 0;
  }

  const targetPosts = onlyPublished ? filterPublishedPosts(posts) : posts;

  return targetPosts.reduce((total, post) => total + (post.readingTime || 0), 0);
}

/**
 * 获取文章的标签列表
 *
 * @param post - 文章
 * @returns 标签数组
 */
export function getPostTags(post: PostSummary): Tag[] {
  if (!post || !post.tags || post.tags.length === 0) {
    return [];
  }

  // 统计单个文章的标签（每个标签 count 为 1）
  return toStableSlugRecords(
    post.tags.map((name: string) => ({
      name,
      count: 1,
    }))
  );
}

/**
 * 获取文章的分类
 *
 * @param post - 文章
 * @returns 分类对象
 */
export function getPostCategory(post: PostSummary): Category {
  const name = post.category || 'Uncategorized';
  return {
    name,
    slug: normalizeDisplaySlug(name),
    count: 1,
  };
}

/**
 * 计算标签在文章中的覆盖率
 *
 * @param posts - 文章列表
 * @param tag - 标签名称
 * @returns 覆盖率（0-1）
 */
export function calculateTagCoverage(posts: PostSummary[], tag: string): number {
  if (!posts || posts.length === 0 || !tag) {
    return 0;
  }

  const publishedPosts = filterPublishedPosts(posts);
  const matchingPosts = publishedPosts.filter((post) =>
    post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );

  return matchingPosts.length / publishedPosts.length;
}

/**
 * 计算分类在文章中的覆盖率
 *
 * @param posts - 文章列表
 * @param category - 分类名称
 * @returns 覆盖率（0-1）
 */
export function calculateCategoryCoverage(
  posts: PostSummary[],
  category: string
): number {
  if (!posts || posts.length === 0 || !category) {
    return 0;
  }

  const publishedPosts = filterPublishedPosts(posts);
  const matchingPosts = publishedPosts.filter(
    (post) => post.category.toLowerCase() === category.toLowerCase()
  );

  return matchingPosts.length / publishedPosts.length;
}
