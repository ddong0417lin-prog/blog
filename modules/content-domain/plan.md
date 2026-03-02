# content-domain 模块计划

## 模块概述

定义博客领域的核心数据模型和业务逻辑，负责将 Notion 原始数据转换为应用内统一的 DTO。作为数据转换层，屏蔽底层 Notion API 的差异，为上层提供类型安全的领域模型。

## 契约文档引用

本模块需遵守以下契约文档：

| 契约文件 | 路径 | 说明 |
|----------|------|------|
| Service 接口 | [contracts/service-interface.ts](../../contracts/service-interface.ts) | 实现 `ContentService` 接口 |
| 类型定义 | [contracts/types.ts](../../contracts/types.ts) | 使用 `PostSummary`, `PostDetail`, `Tag`, `Category` 等类型 |
| Mock 数据 | [contracts/mock-schema.ts](../../contracts/mock-schema.ts) | 开发阶段使用 Mock 数据 |
| 缓存策略 | [contracts/cache-strategy.md](../../contracts/cache-strategy.md) | 缓存使用规范 |
| 模块结构 | [contracts/module-structure.md](../../contracts/module-structure.md) | 导出路径规范 `@/lib/content` |

> ⚠️ **重要**: 契约文件已冻结（Phase -1），如需变更需经过评审流程。

## 模块边界

- ✅ 负责：DTO 定义、数据转换、业务规则（slug 生成、排序过滤）
- ❌ 不负责：直接调用 Notion API（由 content-source 处理）、UI 渲染

## 技术选型

| 组件 | 选择 | 说明 |
|------|------|------|
| 类型系统 | TypeScript | 严格类型定义 |
| slug 生成 | github-slugger | 处理中文 slug，避免重复 |
| 日期处理 | date-fns | 轻量级日期处理 |

## 接口设计

```typescript
// types/post.ts

/**
 * 文章摘要 - 用于列表页、搜索页
 * 轻量级，不包含完整内容
 */
interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;      // 摘要或前200字
  coverImage?: string;
  tags: string[];
  category: string;
  publishedAt: Date;
  updatedAt: Date;
  readingTime: number;  // 阅读时长（分钟）
}

/**
 * 文章详情 - 用于详情页
 * 继承摘要，包含完整内容
 */
interface PostDetail extends PostSummary {
  content: Block[];     // 结构化内容块
  rawContent: string;   // Markdown/HTML 原文（用于 SEO/导出）
  toc: TocItem[];       // 文章目录
}

interface Tag {
  name: string;
  slug: string;
  count: number;
}

interface Category {
  name: string;
  slug: string;
  count: number;
}

/**
 * 文章状态 - 明确区分发布状态
 */
enum PostStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',  // 未来发布
}

// 服务接口
interface PostService {
  // 列表查询 - 返回轻量级摘要
  getAllPosts(options?: ListOptions): Promise<PaginatedResult<PostSummary>>;
  getPublishedPosts(options?: ListOptions): Promise<PaginatedResult<PostSummary>>;
  getPostsByTag(tag: string, options?: ListOptions): Promise<PaginatedResult<PostSummary>>;
  getPostsByCategory(category: string, options?: ListOptions): Promise<PaginatedResult<PostSummary>>;

  // 详情查询 - 返回完整内容
  getPostBySlug(slug: string): Promise<PostDetail | null>;

  // 元数据查询
  getAllTags(): Promise<Tag[]>;
  getAllCategories(): Promise<Category[]>;

  // 搜索 - 返回摘要
  searchPosts(query: string): Promise<PostSummary[]>;

  // 相关文章推荐
  getRelatedPosts(slug: string, limit?: number): Promise<PostSummary[]>;
  getRecentPosts(limit?: number): Promise<PostSummary[]>;
}

interface ListOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'publishedAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

## 实施步骤

### Step 1: DTO 类型定义 (1h)
- [ ] Post 类型定义
- [ ] Tag 类型定义
- [ ] Category 类型定义
- [ ] Notion Block 到内部 Block 的映射类型

### Step 2: slug 生成规则 (2h)
- [ ] 集成 github-slugger
- [ ] 中文标题转拼音/英文 slug
- [ ] 处理 slug 冲突（添加序号）
- [ ] slug 验证规则

### Step 3: Notion 数据转换器 (4h)
- [ ] Page 对象 → Post 转换
- [ ] Block 对象 → Content 转换
- [ ] 富文本 → HTML/Markdown 转换
- [ ] 日期格式统一处理
- [ ] 阅读时长计算（基于字数）

### Step 4: 业务规则实现 (2h)
- [ ] 文章排序规则（发布日期降序）
- [ ] 标签提取和统计
- [ ] 分类提取和统计
- [ ] 草稿/已发布过滤

### Step 5: PostService 实现 (3h)
- [ ] 集成 content-source 模块
- [ ] 实现所有查询方法
- [ ] 结果缓存策略
- [ ] 错误处理和降级

### Step 6: 测试 (2h)
- [ ] 转换器单元测试
- [ ] 服务方法单元测试
- [ ] Mock Notion 数据测试

## 代码结构

```
lib/content/
├── types/
│   ├── post.ts           # Post 相关类型
│   ├── tag.ts            # Tag 类型
│   ├── category.ts       # Category 类型
│   └── block.ts          # Block 内容类型
├── transformers/
│   ├── post-transformer.ts    # Post 转换
│   ├── block-transformer.ts   # Block 转换
│   └── rich-text-transformer.ts
├── services/
│   └── post-service.ts   # Post 服务实现
├── utils/
│   ├── slug.ts           # slug 生成
│   ├── reading-time.ts   # 阅读时长计算
│   └── sort.ts           # 排序工具
└── index.ts              # 模块导出
```

## 依赖关系

- **依赖**：content-source
- **被依赖**：features/blog, features/search, features/interaction

## 边界情况

| 场景 | 处理策略 |
|------|----------|
| 标题为空 | 使用 "Untitled" 默认值 |
| slug 重复 | 自动添加序号：slug-1, slug-2 |
| 日期缺失 | 使用 updatedAt 或当前时间 |
| 分类缺失 | 使用 "Uncategorized" 默认分类 |
| 内容解析失败 | 记录错误，返回空内容 |

## Notion Schema 映射

| Notion Property | Post Field | 转换说明 |
|-----------------|------------|----------|
| Title (title) | title | 直接映射 |
| Slug (rich_text) | slug | 优先使用，否则生成 |
| Excerpt (rich_text) | excerpt | 直接映射 |
| Tags (multi_select) | tags | 数组映射 |
| Category (select) | category | 直接映射 |
| Published (checkbox) | published | 布尔值 |
| PublishedAt (date) | publishedAt | Date 对象 |
| UpdatedAt (last_edited_time) | updatedAt | Date 对象 |
| Cover (files) | coverImage | 第一张图片 URL |

## 验收标准

- [ ] 所有 Notion 数据正确转换
- [ ] slug 生成无冲突
- [ ] 类型定义覆盖所有字段
- [ ] 服务方法返回正确数据
- [ ] 单元测试覆盖率 > 80%

## 与其他模块协作

```
┌─────────────────────────────────────────┐
│           features/*                    │
│  (blog, search, interaction)            │
└─────────────────┬───────────────────────┘
                  │ 使用 PostService
                  ▼
┌─────────────────────────────────────────┐
│          content-domain                 │
│  (本模块：数据转换、业务规则)             │
└─────────────────┬───────────────────────┘
                  │ 调用
                  ▼
┌─────────────────────────────────────────┐
│          content-source                 │
│  (Notion API 封装)                      │
└─────────────────────────────────────────┘
```
