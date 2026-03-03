/**
 * ============================================================================
 * content-source 模块 - Notion 客户端初始化
 * ============================================================================
 *
 * 负责 Notion SDK 客户端的创建和配置
 * - 固定 API 版本: 2025-09-03
 * - 超时配置: 10 秒
 * - User-Agent: 自定义标识
 *
 * @module content-source/client
 */

import { Client } from '@notionhq/client';
import {
  ConfigurationError,
  NotionAPIError,
  NotionErrorCode,
} from './errors';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * Notion API 版本
 * 固定版本避免破坏性变更
 */
export const NOTION_API_VERSION = '2025-09-03';

/**
 * 默认超时时间（毫秒）
 */
export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * User-Agent 标识
 */
export const USER_AGENT = `notion-blog/1.0.0 (Next.js; Node.js/${process.version})`;

/**
 * 环境变量名称
 */
const ENV_VARS = {
  NOTION_TOKEN: 'NOTION_TOKEN',
  NOTION_DATABASE_ID: 'NOTION_DATABASE_ID',
} as const;

// ============================================================================
// 配置接口
// ============================================================================

/**
 * Notion 客户端配置
 */
export interface NotionClientConfig {
  /** Notion Integration Token */
  token: string;
  /** Notion API 版本 */
  notionVersion?: string;
  /** 请求超时时间（毫秒） */
  timeoutMs?: number;
  /** 自定义 User-Agent */
  userAgent?: string;
}

/**
 * 客户端实例返回值
 */
export interface NotionClientInstance {
  /** Notion SDK 客户端 */
  client: Client;
  /** 数据库 ID */
  databaseId: string;
  /** 配置信息 */
  config: Required<Omit<NotionClientConfig, 'token'>> & { databaseId: string };
}

// ============================================================================
// 配置验证
// ============================================================================

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_PATTERN_NO_DASH = /^[0-9a-f]{32}$/i;

/**
 * 验证 token 格式
 * @throws {ConfigurationError} 当 token 格式无效时
 */
function validateToken(token: string): void {
  // 支持多种 Token 格式：
  // - secret_xxx: 传统的 Integration Token
  // - ntn_xxx: Notion 新的内部集成 Token 格式
  if (!token.startsWith('secret_') && !token.startsWith('ntn_') && !token.startsWith('integration_')) {
    throw new ConfigurationError(
      `Invalid NOTION_TOKEN format. Token should start with 'secret_', 'ntn_', or 'integration_'. ` +
        `Get your token from https://www.notion.so/my-integrations`
    );
  }
}

/**
 * 验证 databaseId 格式
 * @throws {ConfigurationError} 当 databaseId 格式无效时
 */
function validateDatabaseId(databaseId: string): void {
  // 支持两种格式：
  // - 带连字符：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // - 无连字符：32 位十六进制
  if (!UUID_PATTERN.test(databaseId) && !UUID_PATTERN_NO_DASH.test(databaseId)) {
    throw new ConfigurationError(
      `Invalid NOTION_DATABASE_ID format. Expected UUID format like: ` +
        `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or 32 hex characters`
    );
  }
}

/**
 * 验证必需的环境变量
 *
 * @throws {ConfigurationError} 当环境变量缺失或无效时
 */
export function validateEnvironment(): {
  token: string;
  databaseId: string;
} {
  const token = process.env[ENV_VARS.NOTION_TOKEN];
  const databaseId = process.env[ENV_VARS.NOTION_DATABASE_ID];

  const missing: string[] = [];
  if (!token) {
    missing.push(ENV_VARS.NOTION_TOKEN);
  }
  if (!databaseId) {
    missing.push(ENV_VARS.NOTION_DATABASE_ID);
  }

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Please check your .env.local file.`
    );
  }

  // 验证 token 和 databaseId 格式
  validateToken(token!);
  validateDatabaseId(databaseId!);

  return { token: token!, databaseId: databaseId! };
}

// ============================================================================
// 客户端创建
// ============================================================================

/**
 * 将 32 位无连字符的 databaseId 转换为 UUID 格式
 * @param id databaseId
 */
function toUuidFormat(id: string): string {
  if (UUID_PATTERN.test(id)) {
    return id; // 已经是 UUID 格式
  }
  // 转换为 UUID 格式：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

/**
 * 创建 Notion 客户端实例
 *
 * @param config - 客户端配置（可选，默认从环境变量读取）
 * @returns Notion 客户端实例和配置
 * @throws {ConfigurationError} 当配置无效时
 *
 * @example
 * ```typescript
 * // 使用环境变量（推荐）
 * const { client, databaseId } = createNotionClient();
 *
 * // 使用自定义配置
 * const { client, databaseId } = createNotionClient({
 *   token: 'secret_xxx',
 *   timeoutMs: 5000,
 * });
 * ```
 */
export function createNotionClient(
  config?: Partial<NotionClientConfig> & { databaseId?: string }
): NotionClientInstance {
  // 优先使用传入的配置，否则从环境变量读取
  const env = config?.token ? null : validateEnvironment();

  const token = config?.token ?? env?.token;
  // 转换为 UUID 格式（Notion API 需要）
  const databaseId = toUuidFormat(config?.databaseId ?? env?.databaseId!);

  if (!token) {
    throw new ConfigurationError('Notion token is required');
  }

  if (!databaseId) {
    throw new ConfigurationError('Notion database ID is required');
  }

  // 验证 token 和 databaseId 格式（环境变量已通过 validateEnvironment 校验）
  if (config?.token) {
    validateToken(token);
  }
  if (config?.databaseId) {
    validateDatabaseId(databaseId);
  }

  // 合并配置（强制使用固定 API 版本）
  const finalConfig = {
    notionVersion: NOTION_API_VERSION,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    userAgent: config?.userAgent ?? USER_AGENT,
  };

  // 创建客户端
  const client = new Client({
    auth: token,
    notionVersion: finalConfig.notionVersion,
    timeoutMs: finalConfig.timeoutMs,
    fetch: async (url, init) => {
      // 注入自定义 User-Agent
      const headers = new Headers(init?.headers);
      headers.set('User-Agent', finalConfig.userAgent);

      // 添加请求日志（开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Notion API] ${init?.method ?? 'GET'} ${url}`);
      }

      const response = await fetch(url, {
        ...init,
        headers,
      });

      // 添加响应日志（开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Notion API] Response: ${response.status} ${response.statusText}`
        );
      }

      return response;
    },
  });

  return {
    client,
    databaseId,
    config: {
      ...finalConfig,
      databaseId,
    },
  };
}

// ============================================================================
// 单例客户端
// ============================================================================

let _clientInstance: NotionClientInstance | null = null;

/**
 * 获取 Notion 客户端单例
 *
 * 推荐在服务端使用，避免重复创建客户端实例
 *
 * @returns Notion 客户端实例
 * @throws {ConfigurationError} 当环境变量缺失时
 *
 * @example
 * ```typescript
 * // app/page.tsx (Server Component)
 * import { getNotionClient } from '@/lib/notion';
 *
 * export default async function HomePage() {
 *   const { client, databaseId } = getNotionClient();
 *   const response = await client.databases.query({ database_id: databaseId });
 *   // ...
 * }
 * ```
 */
export function getNotionClient(): NotionClientInstance {
  if (!_clientInstance) {
    _clientInstance = createNotionClient();
  }
  return _clientInstance;
}

/**
 * 重置客户端实例（用于测试）
 */
export function resetNotionClient(): void {
  _clientInstance = null;
}
