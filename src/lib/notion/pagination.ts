/**
 * ============================================================================
 * content-source 模块 - 分页处理
 * ============================================================================
 *
 * 实现 Notion API 的分页查询功能
 * - 自动分页获取所有数据
 * - 支持自定义分页参数
 * - 类型安全的查询选项
 *
 * @module content-source/pagination
 */

import type { Client } from '@notionhq/client';
import type {
  QueryDataSourceParameters,
  QueryDataSourceResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { withRetry, type RetryConfig } from './retry';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 数据源 ID */
  dataSourceId: string;
  /** 过滤条件 */
  filter?: QueryDataSourceParameters['filter'];
  /** 排序规则 */
  sorts?: QueryDataSourceParameters['sorts'];
  /** 每页数量（默认 100，最大 100） */
  pageSize?: number;
  /** 分页游标 */
  startCursor?: string;
  /** 是否包含已归档 */
  archived?: boolean;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 结果列表 */
  results: T[];
  /** 是否有更多数据 */
  hasMore: boolean;
  /** 下一页游标 */
  nextCursor: string | null;
}

/**
 * 查询配置
 */
export interface QueryConfig extends RetryConfig {
  /** 是否自动获取所有页（默认 false） */
  fetchAll?: boolean;
  /** 最大获取数量（用于 fetchAll 模式，防止无限获取） */
  maxItems?: number;
}

// ============================================================================
// 分页查询
// ============================================================================

/**
 * 查询数据源（单页）
 *
 * @param client - Notion 客户端
 * @param options - 查询选项
 * @param config - 配置
 * @returns 分页结果
 */
export async function queryDataSource(
  client: Client,
  options: QueryOptions,
  config: QueryConfig = {}
): Promise<PaginatedResult<QueryDataSourceResponse['results'][number]>> {
  const {
    pageSize = 100,
    startCursor,
    filter,
    sorts,
    dataSourceId,
    archived,
  } = options;

  const query: QueryDataSourceParameters = {
    data_source_id: dataSourceId,
    page_size: Math.min(pageSize, 100),
    start_cursor: startCursor,
    filter,
    sorts,
    archived,
  };

  const { result } = await withRetry(
    async () => {
      const response = await client.dataSources.query(query);
      return response as QueryDataSourceResponse;
    },
    'queryDataSource',
    config
  );

  return {
    results: result.results,
    hasMore: result.has_more,
    nextCursor: result.next_cursor,
  };
}

/**
 * 查询数据源（自动获取所有页）
 *
 * 自动处理分页，获取所有符合条件的数据
 *
 * @param client - Notion 客户端
 * @param options - 查询选项
 * @param config - 配置
 * @returns 所有结果
 */
export async function queryDataSourceAll(
  client: Client,
  options: QueryOptions,
  config: QueryConfig = {}
): Promise<QueryDataSourceResponse['results'][number][]> {
  const { maxItems = 1000 } = config;
  const allResults: QueryDataSourceResponse['results'][number][] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore && allResults.length < maxItems) {
    const result = await queryDataSource(
      client,
      { ...options, startCursor: cursor },
      config
    );

    allResults.push(...result.results);
    hasMore = result.hasMore;
    cursor = result.nextCursor ?? undefined;

    // 检查是否达到最大数量
    if (allResults.length >= maxItems) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Pagination] Reached max items limit (${maxItems}), stopping`
        );
      }
      break;
    }
  }

  return allResults;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建数据源查询迭代器
 *
 * 用于大规模数据的流式处理，避免一次性加载所有数据到内存
 *
 * @param client - Notion 客户端
 * @param options - 查询选项
 * @param config - 配置
 * @yields 数据项
 *
 * @example
 * ```typescript
 * for await (const item of queryDataSourceIterator(client, { dataSourceId })) {
 *   // 处理每个 item
 *   console.log(item.id);
 * }
 * ```
 */
export async function* queryDataSourceIterator(
  client: Client,
  options: QueryOptions,
  config: QueryConfig = {}
): AsyncGenerator<QueryDataSourceResponse['results'][number], void, unknown> {
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await queryDataSource(
      client,
      { ...options, startCursor: cursor },
      config
    );

    for (const item of result.results) {
      yield item;
    }

    hasMore = result.hasMore;
    cursor = result.nextCursor ?? undefined;
  }
}

/**
 * 批量查询数据源（并行获取多页）
 *
 * 适用于已知总数据量较大，需要加速获取的场景
 *
 * @param client - Notion 客户端
 * @param options - 查询选项
 * @param config - 配置
 * @param parallelPages - 并行获取的页数（默认 3）
 * @returns 所有结果
 */
export async function queryDataSourceParallel(
  client: Client,
  options: QueryOptions,
  config: QueryConfig = {},
  parallelPages: number = 3
): Promise<QueryDataSourceResponse['results'][number][]> {
  // 先获取第一页
  const firstPage = await queryDataSource(client, options, config);

  if (!firstPage.hasMore) {
    return firstPage.results;
  }

  const allResults = [...firstPage.results];
  const cursors: (string | null)[] = [firstPage.nextCursor];
  let depth = 0;

  // 并行获取后续页面
  while (depth < parallelPages && cursors[cursors.length - 1]) {
    const currentCursor = cursors[cursors.length - 1];

    if (!currentCursor) break;

    const result = await queryDataSource(
      client,
      { ...options, startCursor: currentCursor },
      config
    );

    allResults.push(...result.results);
    cursors.push(result.nextCursor);

    if (!result.hasMore) break;
    depth++;
  }

  return allResults;
}

// ============================================================================
// 向后兼容别名
// ============================================================================

/**
 * @deprecated 使用 queryDataSource 代替
 */
export const queryDatabase = queryDataSource;

/**
 * @deprecated 使用 queryDataSourceAll 代替
 */
export const queryDatabaseAll = queryDataSourceAll;

/**
 * @deprecated 使用 queryDataSourceIterator 代替
 */
export const queryDatabaseIterator = queryDataSourceIterator;

/**
 * @deprecated 使用 queryDataSourceParallel 代替
 */
export const queryDatabaseParallel = queryDataSourceParallel;