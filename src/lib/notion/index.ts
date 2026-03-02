/**
 * ============================================================================
 * content-source 模块入口
 * ============================================================================
 *
 * Notion API 封装模块，提供：
 * - 客户端配置与管理
 * - 错误处理
 * - 重试机制（后续实现）
 * - 分页处理（后续实现）
 * - 缓存层（后续实现）
 *
 * @module content-source
 */

// ============================================================================
// 客户端
// ============================================================================

export {
  createNotionClient,
  getNotionClient,
  resetNotionClient,
  validateEnvironment,
  NOTION_API_VERSION,
  DEFAULT_TIMEOUT_MS,
  USER_AGENT,
  type NotionClientConfig,
  type NotionClientInstance,
} from './client';

// ============================================================================
// 错误处理
// ============================================================================

export {
  NotionAPIError,
  ConfigurationError,
  MaxRetriesExceededError,
  NotionErrorCode,
} from './errors';

// ============================================================================
// 类型重导出（来自契约）
// ============================================================================

export type {
  NotionSource,
  NotionPageData,
  NotionPageProperties,
} from '@/contracts/service-interface';

export { PostStatus } from '@/contracts/types';
export type {
  Block,
  BlockType,
  TocItem,
} from '@/contracts/types';