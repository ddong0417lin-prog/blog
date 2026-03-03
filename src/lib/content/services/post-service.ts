/**
 * ============================================================================
 * Post Service 实现
 * ============================================================================
 *
 * 实现 ContentService 接口，提供文章查询功能
 *
 * @version 1.0.0
 * ============================================================================
 */

import type { ContentService } from '@/contracts/service-interface';
import type {
  PostSummary,
  PostDetail,
  Tag,
  Category,
  ListOptions,
  PaginatedResult,
} from '@/contracts/types';
import type { Client } from '@notionhq/client';

import { PostStatus } from '@/contracts/types';

import {
  getNotionClient,
  queryDataSource,
  queryDataSourceAll,
  withCache,
  retrieveBlockChildrenAll,
} from '@/lib/notion';

import {
  transformToPostSummary,
  transformToPostDetail,
  transformToPostSummaries,
} from '../transformers/post-transformer';

import { sortPosts } from '../utils/sort';
import { filterPublishedPosts } from '../utils/filter';
import { extractTags, extractCategories } from '../utils/stats';

/**
 * 缓存 TTL 配置（秒）
 */
const CACHE_TTL = {
  POSTS: 300,        // 5 分钟
  POST_DETAIL: 3600,  // 1 小时
  TAGS: 3600,         // 1 小时
  CATEGORIES: 3600,   // 1 小时
  ALL_PUBLISHED: 300, // 5 分钟 - 用于搜索/推荐的全量缓存
};

/**
 * 全量已发布文章的最大数量上限
 * 注意：超过此上限时搜索/推荐结果可能不完整
 */
const MAX_PUBLISHED_POSTS = 2000;

/**
 * PostService 实现
 */
class PostServiceImpl implements ContentService {
  private dataSourceIdPromise: Promise<string> | null = null;

  /**
   * 兼容 Notion 新版 API：database 与 data source 分离。
   * 允许环境变量填 database_id，并在运行时解析出 data_source_id。
   */
  private async getDataSourceId(client: Client, databaseId: string): Promise<string> {
    if (this.dataSourceIdPromise) {
      return this.dataSourceIdPromise;
    }

    this.dataSourceIdPromise = (async () => {
      // 优先使用显式 data source id 配置
      const explicitDataSourceId = process.env.NOTION_DATA_SOURCE_ID;
      if (explicitDataSourceId) {
        return explicitDataSourceId;
      }

      // 默认把 NOTION_DATABASE_ID 视作 data_source_id（兼容新版 Notion URL）。
      // 如需从 database_id 自动解析 data_source_id，请设置 NOTION_ID_KIND=database。
      if (process.env.NOTION_ID_KIND !== 'database') {
        return databaseId;
      }

      try {
        const database = await client.databases.retrieve({
          database_id: databaseId,
        } as any);

        const dataSourceId = (database as any)?.data_sources?.[0]?.id;
        return dataSourceId || databaseId;
      } catch {
        // 若传入的本身就是 data_source_id，retrieve database 可能失败；回退原值继续查询。
        return databaseId;
      }
    })();

    return this.dataSourceIdPromise;
  }

  /**
   * 获取所有已发布文章（带缓存）
   * 公开方法，用于 sitemap 和其他需要全量文章的场景
   *
   * 注意：默认上限为 MAX_PUBLISHED_POSTS，超过此数量结果可能不完整
   */
  async getAllPublishedPosts(): Promise<PostSummary[]> {
    const { client, databaseId } = getNotionClient();
    const dataSourceId = await this.getDataSourceId(client, databaseId);
    const cacheKey = 'posts:all-published';

    const posts = await withCache(
      async () => {
        const allPages = await queryDataSourceAll(
          client,
          {
            dataSourceId,
          },
          { maxItems: MAX_PUBLISHED_POSTS }
        );

        return filterPublishedPosts(transformToPostSummaries(allPages as any[]));
      },
      cacheKey,
      { ttl: CACHE_TTL.ALL_PUBLISHED }
    );

    return posts;
  }

  /**
   * 获取所有已发布文章（带缓存）
   * 内部方法，用于搜索和相关文章推荐
   *
   * 注意：默认上限为 MAX_PUBLISHED_POSTS，超过此数量结果可能不完整
   */
  private async getAllPublishedPostsCached(): Promise<PostSummary[]> {
    // 复用公开方法
    return this.getAllPublishedPosts();
  }

  /**
   * 获取所有文章（包括草稿）
   */
  async getAllPosts(options?: ListOptions): Promise<PaginatedResult<PostSummary>> {
    const pageSize = options?.pageSize || 10;
    const startCursor = options?.startCursor;
    const { client, databaseId } = getNotionClient();
    const dataSourceId = await this.getDataSourceId(client, databaseId);

    const cacheKey = `posts:all:${startCursor || 'first'}:${pageSize}`;

    const result = await withCache(
      async () => {
        const queryResult = await queryDataSource(client, {
          dataSourceId,
          pageSize,
          startCursor,
        });

        const posts = transformToPostSummaries(queryResult.results as any[]);

        return {
          data: posts,
          hasMore: queryResult.hasMore,
          nextCursor: queryResult.nextCursor || undefined,
        };
      },
      cacheKey,
      { ttl: CACHE_TTL.POSTS }
    );

    // 应用排序
    if (options?.sortBy) {
      result.data = sortPosts(result.data, options.sortBy, options.sortOrder || 'desc');
    }

    return result;
  }

  /**
   * 获取已发布文章
   */
  async getPublishedPosts(options?: ListOptions): Promise<PaginatedResult<PostSummary>> {
    const pageSize = options?.pageSize || 10;
    const startCursor = options?.startCursor;
    const { client, databaseId } = getNotionClient();
    const dataSourceId = await this.getDataSourceId(client, databaseId);

    const cacheKey = `posts:published:${startCursor || 'first'}:${pageSize}`;

    const result = await withCache(
      async () => {
        const queryResult = await queryDataSource(client, {
          dataSourceId,
          pageSize,
          startCursor,
        });

        const posts = transformToPostSummaries(queryResult.results as any[]);

        // 过滤只保留已发布的文章（额外的安全检查）
        const publishedPosts = filterPublishedPosts(posts);

        return {
          data: publishedPosts,
          hasMore: queryResult.hasMore,
          nextCursor: queryResult.nextCursor || undefined,
        };
      },
      cacheKey,
      { ttl: CACHE_TTL.POSTS }
    );

    // 应用排序
    if (options?.sortBy) {
      result.data = sortPosts(result.data, options.sortBy, options.sortOrder || 'desc');
    }

    return result;
  }

  /**
   * 根据标签获取文章
   */
  async getPostsByTag(
    tag: string,
    options?: ListOptions
  ): Promise<PaginatedResult<PostSummary>> {
    const pageSize = options?.pageSize || 10;
    const startIndex = Number(options?.startCursor || 0) || 0;
    const normalizedTag = tag.trim().toLowerCase();

    const cacheKey = `posts:tag:${normalizedTag}:${startIndex}:${pageSize}`;

    const result = await withCache(
      async () => {
        const allPosts = await this.getAllPublishedPostsCached();
        const filtered = allPosts.filter((post) =>
          post.tags.some((item) => item.trim().toLowerCase() === normalizedTag)
        );

        const pagePosts = filtered.slice(startIndex, startIndex + pageSize);
        const hasMore = startIndex + pageSize < filtered.length;

        return {
          data: pagePosts,
          hasMore,
          nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
        };
      },
      cacheKey,
      { ttl: CACHE_TTL.POSTS }
    );

    // 应用排序
    if (options?.sortBy) {
      result.data = sortPosts(result.data, options.sortBy, options.sortOrder || 'desc');
    }

    return result;
  }

  /**
   * 根据分类获取文章
   */
  async getPostsByCategory(
    category: string,
    options?: ListOptions
  ): Promise<PaginatedResult<PostSummary>> {
    const pageSize = options?.pageSize || 10;
    const startIndex = Number(options?.startCursor || 0) || 0;
    const normalizedCategory = category.trim().toLowerCase();

    const cacheKey = `posts:category:${normalizedCategory}:${startIndex}:${pageSize}`;

    const result = await withCache(
      async () => {
        const allPosts = await this.getAllPublishedPostsCached();
        const filtered = allPosts.filter(
          (post) => post.category.trim().toLowerCase() === normalizedCategory
        );

        const pagePosts = filtered.slice(startIndex, startIndex + pageSize);
        const hasMore = startIndex + pageSize < filtered.length;

        return {
          data: pagePosts,
          hasMore,
          nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
        };
      },
      cacheKey,
      { ttl: CACHE_TTL.POSTS }
    );

    // 应用排序
    if (options?.sortBy) {
      result.data = sortPosts(result.data, options.sortBy, options.sortOrder || 'desc');
    }

    return result;
  }

  /**
   * 根据 slug 获取文章详情
   */
  async getPostBySlug(slug: string): Promise<PostDetail | null> {
    if (!slug) {
      return null;
    }

    const { client, databaseId } = getNotionClient();
    const dataSourceId = await this.getDataSourceId(client, databaseId);
    const cacheKey = `posts:slug:${slug}`;

    const post = await withCache(
      async () => {
        // Compatible with schemas without a dedicated Slug property.
        const allPages = await queryDataSourceAll(
          client,
          { dataSourceId },
          { maxItems: MAX_PUBLISHED_POSTS }
        );
        const normalizeSlug = (value: string) =>
          decodeURIComponent(value).trim().toLowerCase().normalize('NFKC');
        const normalizeId = (value: string) => value.trim().toLowerCase().replace(/-/g, '');

        const normalizedInput = normalizeSlug(slug);
        const normalizedInputId = normalizeId(slug);

        const summaries = transformToPostSummaries(allPages as any[]);
        let matchedSummary = summaries.find(
          (item) => normalizeSlug(item.slug) === normalizedInput
        );

        if (!matchedSummary) {
          matchedSummary = summaries.find(
            (item) => normalizeId(item.id) === normalizedInputId
          );
        }

        if (!matchedSummary) {
          for (const page of allPages as any[]) {
            const singleSummary = transformToPostSummary(page);
            if (normalizeSlug(singleSummary.slug) === normalizedInput) {
              matchedSummary = singleSummary;
              break;
            }
          }
        }

        if (!matchedSummary) {
          return null;
        }

        const page = (allPages as any[]).find((item) => item.id === matchedSummary.id);
        if (!page) {
          return null;
        }

        // 获取页面内容（blocks）
        const blocks = await retrieveBlockChildrenAll(client, page.id);

        const postDetail = transformToPostDetail(page, blocks);
        postDetail.slug = matchedSummary.slug;

        return postDetail;
      },
      cacheKey,
      { ttl: CACHE_TTL.POST_DETAIL }
    );

    // 额外检查：确保文章已发布
    if (post && post.status !== PostStatus.PUBLISHED) {
      return null;
    }

    return post;
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<Tag[]> {
    const { client, databaseId } = getNotionClient();
    const dataSourceId = await this.getDataSourceId(client, databaseId);
    const cacheKey = 'tags:all';

    const tags = await withCache(
      async () => {
        const allPostsResult = await queryDataSourceAll(client, {
          dataSourceId,
        });

        const posts = transformToPostSummaries(allPostsResult as any[]);

        return extractTags(posts);
      },
      cacheKey,
      { ttl: CACHE_TTL.TAGS }
    );

    return tags;
  }

  /**
   * 获取所有分类
   */
  async getAllCategories(): Promise<Category[]> {
    const { client, databaseId } = getNotionClient();
    const dataSourceId = await this.getDataSourceId(client, databaseId);
    const cacheKey = 'categories:all';

    const categories = await withCache(
      async () => {
        const allPostsResult = await queryDataSourceAll(client, {
          dataSourceId,
        });

        const posts = transformToPostSummaries(allPostsResult as any[]);

        return extractCategories(posts);
      },
      cacheKey,
      { ttl: CACHE_TTL.CATEGORIES }
    );

    return categories;
  }

  /**
   * 搜索文章（简单的标题/摘要搜索）
   * 搜索所有已发布文章，不受分页限制
   *
   * 注意：结果上限为 MAX_PUBLISHED_POSTS，超过此数量的文章无法被搜索到
   */
  async searchPosts(query: string): Promise<PostSummary[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // 使用带缓存的全量文章获取
    const allPosts = await this.getAllPublishedPostsCached();

    // 简单的本地搜索
    const matchingPosts = allPosts.filter((post) => {
      return (
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery) ||
        post.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });

    return matchingPosts;
  }

  /**
   * 获取相关文章（基于标签相似度）
   * 从所有已发布文章中筛选有共同标签的相关文章
   *
   * 注意：结果上限为 MAX_PUBLISHED_POSTS，超过此数量的文章无法被推荐
   */
  async getRelatedPosts(slug: string, limit: number = 3): Promise<PostSummary[]> {
    // 获取当前文章
    const currentPost = await this.getPostBySlug(slug);

    if (!currentPost || currentPost.tags.length === 0) {
      return [];
    }

    // 使用带缓存的全量文章获取
    const allPosts = await this.getAllPublishedPostsCached();

    // 过滤掉当前文章
    const otherPosts = allPosts.filter((post) => post.slug !== slug);

    // 根据标签相似度排序
    const scoredPosts = otherPosts.map((post) => {
      // 计算标签重叠数量
      const overlap = post.tags.filter((tag) =>
        currentPost.tags.includes(tag)
      ).length;

      return {
        post,
        score: overlap,
      };
    });

    // 过滤掉无共同标签的文章（score === 0），按分数降序排序
    const relatedPosts = scoredPosts
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.post);

    return relatedPosts;
  }

  /**
   * 获取最新文章
   */
  async getRecentPosts(limit: number = 5): Promise<PostSummary[]> {
    const cacheKey = `posts:recent:${limit}`;

    const posts = await withCache(
      async () => {
        const result = await this.getPublishedPosts({
          pageSize: limit,
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        });

        return result.data;
      },
      cacheKey,
      { ttl: CACHE_TTL.POSTS }
    );

    return posts.slice(0, limit);
  }
}

// 导出单例
export const postService = new PostServiceImpl();

// 导出服务类（便于测试）
export { PostServiceImpl };
