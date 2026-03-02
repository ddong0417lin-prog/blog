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

import { PostStatus } from '@/contracts/types';

import {
  getNotionClient,
  queryDataSource,
  queryDataSourceAll,
  withCache,
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
};

/**
 * PostService 实现
 */
class PostServiceImpl implements ContentService {
  /**
   * 获取所有文章（包括草稿）
   */
  async getAllPosts(options?: ListOptions): Promise<PaginatedResult<PostSummary>> {
    const pageSize = options?.pageSize || 10;
    const startCursor = options?.startCursor;
    const { client, databaseId } = getNotionClient();

    const cacheKey = `posts:all:${startCursor || 'first'}:${pageSize}`;

    const result = await withCache(
      async () => {
        const queryResult = await queryDataSource(client, {
          dataSourceId: databaseId,
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

    const cacheKey = `posts:published:${startCursor || 'first'}:${pageSize}`;

    const result = await withCache(
      async () => {
        const queryResult = await queryDataSource(client, {
          dataSourceId: databaseId,
          pageSize,
          startCursor,
          filter: {
            property: 'Status',
            status: {
              equals: 'Published',
            },
          } as any,
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
    const startCursor = options?.startCursor;
    const { client, databaseId } = getNotionClient();

    const cacheKey = `posts:tag:${tag}:${startCursor || 'first'}:${pageSize}`;

    const result = await withCache(
      async () => {
        const queryResult = await queryDataSource(client, {
          dataSourceId: databaseId,
          pageSize,
          startCursor,
          filter: {
            and: [
              {
                property: 'Status',
                status: {
                  equals: 'Published',
                },
              },
              {
                property: 'Tags',
                multi_select: {
                  contains: tag,
                },
              },
            ],
          } as any,
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
   * 根据分类获取文章
   */
  async getPostsByCategory(
    category: string,
    options?: ListOptions
  ): Promise<PaginatedResult<PostSummary>> {
    const pageSize = options?.pageSize || 10;
    const startCursor = options?.startCursor;
    const { client, databaseId } = getNotionClient();

    const cacheKey = `posts:category:${category}:${startCursor || 'first'}:${pageSize}`;

    const result = await withCache(
      async () => {
        const queryResult = await queryDataSource(client, {
          dataSourceId: databaseId,
          pageSize,
          startCursor,
          filter: {
            and: [
              {
                property: 'Status',
                status: {
                  equals: 'Published',
                },
              },
              {
                property: 'Category',
                select: {
                  equals: category,
                },
              },
            ],
          } as any,
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
   * 根据 slug 获取文章详情
   */
  async getPostBySlug(slug: string): Promise<PostDetail | null> {
    if (!slug) {
      return null;
    }

    const { client, databaseId } = getNotionClient();
    const cacheKey = `posts:slug:${slug}`;

    const post = await withCache(
      async () => {
        const queryResult = await queryDataSource(client, {
          dataSourceId: databaseId,
          pageSize: 1,
          filter: {
            property: 'Slug',
            rich_text: {
              equals: slug,
            },
          } as any,
        });

        if (queryResult.results.length === 0) {
          return null;
        }

        const page = queryResult.results[0] as any;

        // 获取页面内容（blocks）
        // 注意：这里需要调用 content-source 模块来获取 blocks
        // 目前简化处理，假设 blocks 已经在 queryResult 中
        const blocks = (page as any).blocks || [];

        const postDetail = transformToPostDetail(page, blocks);

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
    const cacheKey = 'tags:all';

    const tags = await withCache(
      async () => {
        const allPostsResult = await queryDataSourceAll(client, {
          dataSourceId: databaseId,
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
    const cacheKey = 'categories:all';

    const categories = await withCache(
      async () => {
        const allPostsResult = await queryDataSourceAll(client, {
          dataSourceId: databaseId,
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
   */
  async searchPosts(query: string): Promise<PostSummary[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // 获取所有已发布文章
    const allPostsResult = await this.getPublishedPosts({
      pageSize: 100,
    });

    // 简单的本地搜索
    const matchingPosts = allPostsResult.data.filter((post) => {
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
   */
  async getRelatedPosts(slug: string, limit: number = 3): Promise<PostSummary[]> {
    // 获取当前文章
    const currentPost = await this.getPostBySlug(slug);

    if (!currentPost || currentPost.tags.length === 0) {
      return [];
    }

    // 获取所有已发布文章
    const allPostsResult = await this.getPublishedPosts({
      pageSize: 50,
    });

    // 过滤掉当前文章
    const otherPosts = allPostsResult.data.filter(
      (post) => post.slug !== slug
    );

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

    // 按分数降序排序，取前 limit 个
    const relatedPosts = scoredPosts
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