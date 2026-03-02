/**
 * ============================================================================
 * content-source 模块 - Blocks 查询
 * ============================================================================
 *
 * 实现Notion API 的 blocks 查询功能
 * - 获取页面内容块
 * - 自动分页获取所有子块
 *
 * @module content-source/blocks
 */

import type { Client } from '@notionhq/client';
import type {
  ListBlockChildrenResponse,
  BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { withRetry, type RetryConfig } from './retry';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Blocks 查询选项
 */
export interface RetrieveBlockChildrenOptions {
  /** 页面或父块 ID */
  blockId: string;
  /** 每页数量（默认 100，最大 100） */
  pageSize?: number;
  /** 分页游标 */
  startCursor?: string;
}

/**
 * Blocks 查询结果
 */
export interface BlocksResult {
  /** 块列表 */
  blocks: BlockObjectResponse[];
  /** 是否有更多数据 */
  hasMore: boolean;
  /** 下一页游标 */
  nextCursor: string | null;
}

/**
 * Blocks 查询配置
 */
export interface BlocksQueryConfig extends RetryConfig {
  /** 是否自动获取所有页（默认 false） */
  fetchAll?: boolean;
  /** 最大获取数量（防止无限获取） */
  maxBlocks?: number;
}

// ============================================================================
// Blocks 查询
// ============================================================================

/**
 * 获取块的孩子（单页）
 *
 * @param client - Notion 客户端
 * @param options - 查询选项
 * @param config - 配置
 * @returns 块列表结果
 */
export async function retrieveBlockChildren(
  client: Client,
  options: RetrieveBlockChildrenOptions,
  config: BlocksQueryConfig = {}
): Promise<BlocksResult> {
  const { blockId, pageSize = 100, startCursor } = options;

  const { result } = await withRetry(
    async () => {
      const response = await client.blocks.children.list({
        block_id: blockId,
        page_size: Math.min(pageSize, 100),
        start_cursor: startCursor,
      });
      return response as ListBlockChildrenResponse;
    },
    'retrieveBlockChildren',
    config
  );

  return {
    blocks: result.results.filter(
      (block): block is BlockObjectResponse => 'type' in block
    ),
    hasMore: result.has_more,
    nextCursor: result.next_cursor,
  };
}

/**
 * 获取块的所有孩子（自动分页）
 *
 * @param client - Notion 客户端
 * @param blockId - 父块 ID
 * @param config - 配置
 * @returns 所有子块
 */
export async function retrieveBlockChildrenAll(
  client: Client,
  blockId: string,
  config: BlocksQueryConfig = {}
): Promise<BlockObjectResponse[]> {
  const { maxBlocks = 10000 } = config;
  const allBlocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore && allBlocks.length < maxBlocks) {
    const result = await retrieveBlockChildren(
      client,
      { blockId, startCursor: cursor },
      config
    );

    allBlocks.push(...result.blocks);
    hasMore = result.hasMore;
    cursor = result.nextCursor ?? undefined;

    if (allBlocks.length >= maxBlocks) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Blocks] Reached max blocks limit (${maxBlocks}), stopping`
        );
      }
      break;
    }
  }

  return allBlocks;
}

/**
 * 创建 blocks 查询迭代器
 *
 * 用于大规模块的流式处理
 *
 * @param client - Notion 客户端
 * @param blockId - 父块 ID
 * @param config - 配置
 * @yields 块对象
 */
export async function* retrieveBlockChildrenIterator(
  client: Client,
  blockId: string,
  config: BlocksQueryConfig = {}
): AsyncGenerator<BlockObjectResponse, void, unknown> {
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await retrieveBlockChildren(
      client,
      { blockId, startCursor: cursor },
      config
    );

    for (const block of result.blocks) {
      yield block;
    }

    hasMore = result.hasMore;
    cursor = result.nextCursor ?? undefined;
  }
}