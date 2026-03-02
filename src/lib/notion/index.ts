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
  RetryExitReason,
} from './errors';

// ============================================================================
// 重试机制
// ============================================================================

export {
  withRetry,
  withFallback,
  calculateBackoffDelay,
  calculateJitteredDelay,
  isRetryableError,
  MAX_RETRY_ATTEMPTS,
  BASE_DELAY_MS,
  MAX_DELAY_MS,
  DEFAULT_MAX_WAIT_MS,
  type RetryConfig,
  type RetryContext,
  type RetryResult,
} from './retry';

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