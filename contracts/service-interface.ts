/**
 * ============================================================================
 * Phase -1: 契约冻结 - Service 接口定义
 * ============================================================================
 *
 * 本文件定义 content-domain 模块对外暴露的所有服务接口
 * 所有 features 模块通过此接口获取数据
 *
 * @version 1.0.0
 * @frozen true
 * ============================================================================
 */

import {
  PostSummary,
  PostDetail,
  Tag,
  Category,
  ListOptions,
  PaginatedResult,
  SearchResult,
  PostStatus,
  Block,
} from './types';

// ============================================================================
// Content Service 接口
// ============================================================================

/**
 * 内容服务接口
 *
 * 实现者：content-domain 模块
 * 使用者：features/blog, features/search, features/interaction
 *
 * 获取方式：
 * ```typescript
 * import { contentService } from '@/lib/content';
 * ```
 */
export interface ContentService {
  // ========================================================================
  // 列表查询 - 返回轻量级摘要
  // ========================================================================

  /**
   * 获取所有文章（包括草稿，管理后台用）
   *
   * @param options - 查询选项
   * @returns 分页的文章摘要列表
   */
  getAllPosts(
    options?: ListOptions
  ): Promise<PaginatedResult<PostSummary>>;

  /**
   * 获取已发布文章（前台展示用）
   *
   * @param options - 查询选项
   * @returns 分页的已发布文章摘要列表
   */
  getPublishedPosts(
    options?: ListOptions
  ): Promise<PaginatedResult<PostSummary>>;

  /**
   * 根据标签筛选文章
   *
   * @param tag - 标签 slug
   * @param options - 查询选项
   * @returns 分页的文章摘要列表
   */
  getPostsByTag(
    tag: string,
    options?: ListOptions
  ): Promise<PaginatedResult<PostSummary>>;

  /**
   * 根据分类筛选文章
   *
   * @param category - 分类 slug
   * @param options - 查询选项
   * @returns 分页的文章摘要列表
   */
  getPostsByCategory(
    category: string,
    options?: ListOptions
  ): Promise<PaginatedResult<PostSummary>>;

  // ========================================================================
  // 详情查询 - 返回完整内容
  // ========================================================================

  /**
   * 根据 slug 获取文章详情
   *
   * @param slug - 文章 slug
   * @returns 文章详情，不存在返回 null
   */
  getPostBySlug(slug: string): Promise<PostDetail | null>;

  // ========================================================================
  // 元数据查询
  // ========================================================================

  /**
   * 获取所有标签及其文章数量
   *
   * @returns 标签列表
   */
  getAllTags(): Promise<Tag[]>;

  /**
   * 获取所有分类及其文章数量
   *
   * @returns 分类列表
   */
  getAllCategories(): Promise<Category[]>;

  // ========================================================================
  // 搜索
   // ========================================================================

  /**
   * 搜索文章
   *
   * 注意：此接口为服务端搜索备用
   * 实际搜索功能由 search 模块的客户端搜索实现
   *
   * @param query - 搜索关键词
   * @returns 匹配的摘要列表
   */
  searchPosts(query: string): Promise<PostSummary[]>;

  // ========================================================================
  // 相关文章推荐
  // ========================================================================

  /**
   * 获取相关文章
   *
   * 基于标签相似度推荐
   *
   * @param slug - 当前文章 slug
   * @param limit - 返回数量限制，默认 3
   * @returns 相关文章摘要列表
   */
  getRelatedPosts(slug: string, limit?: number): Promise<PostSummary[]>;

  /**
   * 获取最新文章
   *
   * @param limit - 返回数量限制，默认 5
   * @returns 最新文章摘要列表
   */
  getRecentPosts(limit?: number): Promise<PostSummary[]>;

  /**
   * 获取所有已发布文章（全量，用于 sitemap）
   * 不受分页限制，返回所有已发布文章摘要
   *
   * @returns 所有已发布文章摘要列表
   */
  getAllPublishedPosts(): Promise<PostSummary[]>;
}

// ============================================================================
// Notion Source 接口（内部使用）
// ============================================================================

/**
 * Notion 页面属性
 */
export interface NotionPageProperties {
  title: string;
  slug?: string;
  status: PostStatus;
  tags?: string[];
  category?: string;
  publishedAt?: string;
  coverImage?: string;
  excerpt?: string;
}

/**
 * Notion 页面原始数据
 */
export interface NotionPageData {
  id: string;
  properties: NotionPageProperties;
  content: Block[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Notion 数据源接口
 *
 * 实现者：content-source 模块
 * 使用者：content-domain 模块
 */
export interface NotionSource {
  /**
   * 获取所有页面原始数据
   */
  fetchAllPages(options?: {
    filter?: Record<string, unknown>;
    sorts?: Array<{
      property: string;
      direction: 'ascending' | 'descending';
    }>;
    pageSize?: number;
    startCursor?: string;
  }): Promise<{
    results: NotionPageData[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  /**
   * 获取单个页面详情
   */
  fetchPage(pageId: string): Promise<NotionPageData>;
}

// ============================================================================
// Cache Service 接口（内部使用）
// ============================================================================

/**
 * 缓存服务接口
 *
 * 实现者：content-source 模块
 * 用于支持降级策略（stale-while-revalidate）
 */
export interface CacheService {
  /**
   * 获取缓存
   * @param options.allowStale - 是否允许返回过期缓存（降级策略用）
   */
  get<T>(key: string, options?: { allowStale?: boolean }): Promise<T | null>;

  /**
   * 获取缓存（包含过期状态）
   * 用于降级策略：返回过期数据并标记 stale
   */
  getStale<T>(key: string): Promise<{ data: T; stale: boolean } | null>;

  /**
   * 设置缓存
   * @param options.ttl - 缓存有效期（秒）
   */
  set<T>(
    key: string,
    value: T,
    options?: { ttl?: number }
  ): Promise<void>;

  /**
   * 删除缓存
   */
  delete(key: string): Promise<void>;

  /**
   * 批量删除缓存（支持通配符）
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * 检查缓存是否存在（无论是否过期）
   */
  exists(key: string): Promise<boolean>;
}

// ============================================================================
// Search Index Builder 接口（内部使用）
// ============================================================================

/**
 * 搜索索引构建器接口
 *
 * 实现者：search 模块
 * 调用者：构建脚本
 */
export interface SearchIndexBuilder {
  /**
   * 构建搜索索引
   *
   * @param posts - 文章摘要列表
   * @returns 序列化的索引数据
   */
  buildIndex(posts: PostSummary[]): Promise<{
    index: string;
    documents: SearchResult[];
  }>;
}

// ============================================================================
// Interaction Service 接口
// ============================================================================

/**
 * 互动服务接口
 *
 * 实现者：interaction 模块
 */
export interface InteractionService {
  /**
   * 获取文章点赞数
   */
  getLikeCount(slug: string): Promise<number>;

  /**
   * 点赞/取消点赞
   *
   * @returns 操作后的点赞数和状态
   */
  toggleLike(
    slug: string,
    fingerprint: string
  ): Promise<{ count: number; liked: boolean }>;

  /**
   * 检查用户是否已点赞
   */
  hasLiked(slug: string, fingerprint: string): Promise<boolean>;
}

// ============================================================================
// 接口使用示例
// ============================================================================

/**
 * 使用示例：获取文章列表并渲染
 *
 * ```typescript
 * // app/page.tsx (Server Component)
 * import { contentService } from '@/lib/content';
 *
 * export default async function HomePage() {
 *   const { data: posts, hasMore } = await contentService.getPublishedPosts({
 *     page: 1,
 *     pageSize: 10,
 *     sortBy: 'publishedAt',
 *     sortOrder: 'desc',
 *   });
 *
 *   return (
 *     <main>
 *       <PostList posts={posts} />
 *       {hasMore && <LoadMore />}
 *     </main>
 *   );
 * }
 * ```
 */

/**
 * 使用示例：获取文章详情
 *
 * ```typescript
 * // app/[slug]/page.tsx (Server Component)
 * import { contentService } from '@/lib/content';
 * import { notFound } from 'next/navigation';
 *
 * export default async function PostPage({
 *   params,
 * }: {
 *   params: { slug: string };
 * }) {
 *   const post = await contentService.getPostBySlug(params.slug);
 *
 *   if (!post) {
 *     notFound();
 *   }
 *
 *   return (
 *     <article>
 *       <PostHeader post={post} />
 *       <PostContent content={post.content} />
 *       <PostToc toc={post.toc} />
 *     </article>
 *   );
 * }
 * ```
 */
