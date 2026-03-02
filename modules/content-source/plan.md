# content-source 模块计划

## 模块概述

负责与 Notion API 的所有交互，包括数据获取、分页处理、限流重试和错误处理。作为最底层的数据源模块，为上层提供稳定可靠的 Notion 数据访问能力。

## 契约文档引用

本模块需遵守以下契约文档：

| 契约文件 | 路径 | 说明 |
|----------|------|------|
| Service 接口 | [contracts/service-interface.ts](../../contracts/service-interface.ts) | 实现 `NotionSource` 和 `CacheService` 接口 |
| 类型定义 | [contracts/types.ts](../../contracts/types.ts) | 使用 `PostStatus`, `Block` 等类型 |
| 缓存策略 | [contracts/cache-strategy.md](../../contracts/cache-strategy.md) | 三级缓存架构实现规范 |
| 模块结构 | [contracts/module-structure.md](../../contracts/module-structure.md) | 导出路径规范 |

> ⚠️ **重要**: 契约文件已冻结（Phase -1），如需变更需经过评审流程。

## 模块边界

- ✅ 负责：Notion API 调用、分页、重试、缓存
- ❌ 不负责：数据转换（由 content-domain 处理）、UI 展示

## 技术选型

| 组件 | 选择 | 说明 |
|------|------|------|
| Notion SDK | @notionhq/client | 官方 SDK |
| API 版本 | 2022-06-28 | 固定版本避免破坏性变更 |
| 缓存 | 三级缓存架构 | L1: Next.js Cache, L2: 内存(node-cache), L3: 降级快照 |

## 接口设计

```typescript
// types/notion-client.ts

interface NotionClientConfig {
  token: string;
  notionVersion?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

interface QueryOptions {
  databaseId: string;
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
  pageSize?: number;
  startCursor?: string;
}

interface PaginatedResult<T> {
  results: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

// 核心接口
class NotionContentSource {
  constructor(config: NotionClientConfig);

  // 查询数据库（自动分页）
  async queryDatabase(options: QueryOptions): Promise<PaginatedResult<PageObjectResponse>>;

  // 获取页面详情
  async getPage(pageId: string): Promise<PageObjectResponse>;

  // 获取页面内容（blocks）
  async getPageContent(pageId: string): Promise<ListBlockChildrenResponse['results']>;

  // 获取所有内容（自动递归分页）
  async getAllPageContent(pageId: string): Promise<BlockObjectResponse[]>;
}
```

## 实施步骤

### Step 1: 基础客户端配置 (1h)
- [ ] 安装 @notionhq/client
- [ ] 创建 client.ts，配置固定 API 版本
- [ ] 配置 timeout 和 User-Agent
- [ ] 环境变量验证

### Step 2: 错误处理与重试机制 (2h)
- [ ] 实现 429 状态码检测
- [ ] 实现指数退避策略 (1s → 2s → 4s → 8s)
- [ ] 最大重试次数限制 (5 次)
- [ ] 读取 Retry-After 响应头
- [ ] 重试失败后的降级处理

### Step 3: 分页处理 (2h)
- [ ] 实现 queryDatabase 基础调用
- [ ] 实现自动分页（has_more 循环）
- [ ] 支持分页参数（start_cursor, page_size）
- [ ] 支持可选的并行获取优化

### Step 4: 缓存层 (2h)
- [ ] 集成 Next.js Cache (unstable_cache)
- [ ] 内存缓存层 (node-cache)
- [ ] 缓存标签设计：notion:database:{id}, notion:page:{id}
- [ ] 缓存失效策略

### Step 5: 测试与优化 (2h)
- [ ] 单元测试：模拟 Notion API 响应
- [ ] 集成测试：真实 API 调用
- [ ] 429 重试测试
- [ ] 性能测试：分页性能

## 代码结构

```
lib/notion/
├── client.ts           # Notion 客户端初始化
├── api.ts              # 封装 API 调用
├── retry.ts            # 重试策略
├── cache.ts            # 缓存管理
├── pagination.ts       # 分页处理
├── errors.ts           # 错误类型定义
└── index.ts            # 模块导出
```

## 依赖关系

- **依赖**：无（最底层模块）
- **被依赖**：content-domain

## 边界情况

| 场景 | 处理策略 |
|------|----------|
| Notion API 429 | 指数退避重试，最多5次 |
| Notion API 5xx | 重试3次后抛出错误 |
| 网络超时 | 10秒超时，重试 |
| 分页过大 | 单次最大100条，自动分页 |
| API 变更 | 固定 API 版本 |

## 验收标准

- [ ] 所有 API 调用都有重试机制
- [ ] 429 错误正确退避
- [ ] 分页获取完整数据
- [ ] 缓存命中率 > 80%
- [ ] 单元测试覆盖率 > 80%

## 与其他模块协作

```
┌─────────────────┐
│ content-domain  │
│   (调用方)       │
└────────┬────────┘
         │ 调用接口
         ▼
┌─────────────────┐
│ content-source  │
│  (本模块)        │
└────────┬────────┘
         │ HTTP 请求
         ▼
┌─────────────────┐
│   Notion API    │
└─────────────────┘
```
