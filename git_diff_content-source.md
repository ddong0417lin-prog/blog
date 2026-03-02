# 代码审阅 - content-source Step 1

## 任务目标
实现 content-source 模块 Step 1：基础客户端配置
- 安装 @notionhq/client
- 创建客户端配置，固定 API 版本 2022-06-28
- 配置 timeout 和 User-Agent
- 环境变量验证

## 变更摘要
- 提交: cfd5dba
- 新增文件: 3 个
- 主要功能: Notion 客户端初始化、错误类型定义

## 变更文件列表

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| src/lib/notion/client.ts | 新增 | Notion 客户端配置与管理 |
| src/lib/notion/errors.ts | 新增 | 错误类型定义 |
| src/lib/notion/index.ts | 新增 | 模块导出入口 |

## 核心代码变更

### src/lib/notion/client.ts（主要功能）

**常量定义**:
- NOTION_API_VERSION = '2022-06-28'
- DEFAULT_TIMEOUT_MS = 10_000
- USER_AGENT = `notion-blog/1.0.0 (Next.js; Node.js/${process.version})`

**环境变量验证**:
```typescript
export function validateEnvironment(): { token: string; databaseId: string }
```
- 验证 NOTION_TOKEN 和 NOTION_DATABASE_ID 是否存在
- 验证 token 格式（secret_ 或 integration_ 前缀）
- 验证 databaseId 格式（UUID 正则）

**客户端创建**:
```typescript
export function createNotionClient(config?: Partial<NotionClientConfig>): NotionClientInstance
```
- 使用 @notionhq/client 创建 Client
- 支持自定义 fetch 注入 User-Agent
- 开发环境请求/响应日志

**单例模式**:
```typescript
export function getNotionClient(): NotionClientInstance
```
- 服务端使用单例避免重复创建

### src/lib/notion/errors.ts

**错误类型枚举**:
```typescript
enum NotionErrorCode {
  INVALID_TOKEN, MISSING_TOKEN, INVALID_DATABASE_ID,
  API_ERROR, RATE_LIMITED, TIMEOUT, NETWORK_ERROR,
  PAGE_NOT_FOUND, INVALID_RESPONSE, MAX_RETRIES_EXCEEDED
}
```

**错误类**:
- `NotionAPIError` - API 错误，支持 retryable 检测、429 Retry-After 解析
- `ConfigurationError` - 配置错误
- `MaxRetriesExceededError` - 重试耗尽错误

### src/lib/notion/index.ts
- 统一导出客户端和错误类型
- 重导出契约类型（NotionSource, Block 等）

## 契约符合性检查

| 契约要求 | 实现状态 |
|----------|----------|
| 固定 API 版本 | ✅ 2022-06-28 |
| 超时配置 | ✅ 10秒 |
| 环境变量验证 | ✅ token 和 databaseId 格式验证 |
| 错误类型 | ✅ NotionAPIError 支持 retryable |
| 429 检测 | ✅ 支持 Retry-After 解析 |

## 审阅要点

请重点检查：
1. 客户端配置是否合理？
2. 环境变量验证是否完整？
3. 错误类型设计是否覆盖所有场景？
4. 单例模式在 Next.js 中是否安全？
5. 代码风格和质量如何？
6. 是否符合契约文件中的 NotionSource 接口？
