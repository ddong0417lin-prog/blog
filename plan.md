# 项目实施计划

## 项目概述

基于 Notion 作为 CMS 的博客网站，使用 Next.js 技术栈部署到 Vercel。

## 目录结构

```
my-blog/
├── .env.local              # 本地环境变量
├── .env.production         # 生产环境变量
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CD 配置
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (blog)/         # 博客路由组
│   │   │   ├── page.tsx    # 首页/文章列表
│   │   │   ├── [slug]/     # 文章详情
│   │   │   ├── tag/[tag]/  # 标签页
│   │   │   └── category/[category]/  # 分类页
│   │   ├── api/            # API 路由
│   │   │   ├── revalidate/route.ts   # 缓存刷新
│   │   │   └── like/route.ts         # 点赞 API
│   │   ├── layout.tsx      # 根布局
│   │   └── globals.css     # 全局样式
│   ├── components/         # 组件目录
│   │   ├── ui/             # shadcn/ui 组件
│   │   ├── layout/         # 布局组件
│   │   ├── blog/           # 博客相关组件
│   │   ├── search/         # 搜索组件
│   │   └── interaction/    # 评论/点赞组件
│   ├── lib/                # 工具库
│   │   ├── notion/         # Notion API 封装
│   │   ├── content/        # content-domain 逻辑
│   │   ├── search/         # 搜索索引
│   │   └── redis/          # Redis 客户端
│   ├── hooks/              # React Hooks
│   ├── types/              # TypeScript 类型
│   └── styles/             # 样式文件
├── public/                 # 静态资源
├── scripts/                # 构建脚本
│   └── build-search-index.js
├── tests/                  # 测试文件
├── content/                # 本地内容备份（可选）
├── plan.md                 # 本计划文件
└── Implement.md            # 实施状态跟踪
```

## 优化后的模块划分

根据 Codex 审阅反馈重新设计的模块结构：

| 模块 | 职责 | 依赖 |
|------|------|------|
| **platform** | Vercel 部署配置、环境变量、CI/CD | 无 |
| **content-source** | Notion API 集成、分页、限流重试、错误处理 | 无 |
| **content-domain** | Post/Tag/Category DTO、slug 规则、排序过滤 | content-source |
| **web-ui** | Tailwind 主题、shadcn 组件、暗黑模式 | 无 |
| **features/blog** | 文章列表、详情、分类、标签页面 | content-domain, web-ui |
| **features/search** | 全文搜索索引与查询 | content-domain, web-ui |
| **features/interaction** | 评论(Giscus) + 点赞(Upstash) | content-domain, web-ui |

## 项目目录结构

```
blog/
├── .env.local                    # 本地环境变量
├── .env.example                  # 环境变量模板
├── next.config.js               # Next.js 配置
├── tailwind.config.ts           # Tailwind 配置
├── tsconfig.json                # TypeScript 配置
├── vercel.json                  # Vercel 部署配置
├── package.json
├── README.md
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (blog)/              # 博客路由组
│   │   │   ├── page.tsx         # 首页/文章列表
│   │   │   ├── [slug]/          # 文章详情页
│   │   │   │   └── page.tsx
│   │   │   ├── tag/[tag]/       # 标签页
│   │   │   │   └── page.tsx
│   │   │   └── category/[category]/  # 分类页
│   │   │       └── page.tsx
│   │   ├── api/                 # API 路由
│   │   │   ├── revalidate/      # 手动刷新缓存
│   │   │   │   └── route.ts
│   │   │   └── like/            # 点赞 API
│   │   │       └── route.ts
│   │   ├── layout.tsx           # 根布局
│   │   └── globals.css          # 全局样式
│   │
│   ├── components/              # UI 组件
│   │   ├── ui/                  # shadcn/ui 组件
│   │   ├── layout/              # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── post/                # 文章相关组件
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   └── PostContent.tsx
│   │   ├── search/              # 搜索组件
│   │   │   ├── SearchBox.tsx
│   │   │   └── SearchResults.tsx
│   │   └── theme/               # 主题组件
│   │       └── ThemeToggle.tsx
│   │
│   ├── lib/                     # 工具库
│   │   ├── notion/              # Notion 相关
│   │   │   ├── client.ts        # Notion 客户端
│   │   │   ├── api.ts           # API 封装
│   │   │   ├── transformer.ts   # 数据转换
│   │   │   └── cache.ts         # 缓存策略
│   │   ├── search/              # 搜索相关
│   │   │   ├── index.ts         # FlexSearch 索引
│   │   │   └── builder.ts       # 索引构建器
│   │   └── utils.ts             # 通用工具
│   │
│   ├── types/                   # TypeScript 类型
│   │   ├── post.ts              # 文章类型
│   │   ├── notion.ts            # Notion 相关类型
│   │   └── index.ts             # 类型导出
│   │
│   └── hooks/                   # React Hooks
│       ├── usePosts.ts          # 文章数据获取
│       ├── useSearch.ts         # 搜索 Hook
│       └── useTheme.ts          # 主题 Hook
│
├── scripts/                     # 构建脚本
│   └── build-search-index.ts    # 构建搜索索引
│
└── public/                      # 静态资源
    └── assets/
```

```
                    ┌─────────────┐
                    │   Phase -1  │
                    │ Schema评审  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Phase 0   │
                    │  platform   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│content-source │  │ content-domain│  │    web-ui     │
│   (Phase 1)   │──│   (Phase 1)   │  │   (Phase 1)   │
└───────────────┘  └───────────────┘  └───────────────┘
                           │                  │
                           └────────┬─────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │  features/blog    │
                          │    (Phase 2)      │
                          └─────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               │               ▼
          ┌──────────────────┐      │     ┌──────────────────┐
          │features/search   │      │     │features/interact │
          │   (Phase 3)      │      │     │   (Phase 3)      │
          └──────────────────┘      │     └──────────────────┘
                                    │
                                    ▼
                           ┌───────────────────┐
                           │    Phase 4        │
                           │   优化与发布      │
                           └───────────────────┘
```

## 并行开发策略

### 可并行模块分组

根据依赖关系分析，以下模块组可以并行开发：

#### 第零批：Schema 评审（Phase -1）- 串行

在正式开发前，先冻结接口契约：

| 交付物 | 说明 | 优先级 |
|--------|------|--------|
| **TypeScript 类型定义** | PostSummary / PostDetail / Tag / Category | ⭐⭐⭐ 最高 |
| **Service 接口** | ContentService 完整接口定义 | ⭐⭐⭐ 最高 |
| **Mock Schema** | 测试数据结构和示例 | ⭐⭐ 高 |
| **缓存策略文档** | ISR / 边缘缓存 / 降级策略 | ⭐⭐ 高 |

**目的**：避免并行开发时频繁返工，确保模块间接口稳定

---

#### 第一批：基础架构（Phase 1）- 可并行

| 模块 | 依赖 | 优先级 | 建议分工 |
|------|------|--------|----------|
| **web-ui** | 无 | ⭐ 最高 | UI开发者，可随时开始 |
| **content-source** | 无 | ⭐⭐ 高 | 后端开发者，需Notion Token |
| **content-domain** | content-source | ⭐⭐ 高 | 等content-source完成后开始 |

**并行建议**：
- 开发者 A → `web-ui`（UI组件、主题系统）
- 开发者 B → `content-source`（Notion API封装）
- content-source 完成后 → 开发者 B 继续 `content-domain`

#### 第二批：高级功能（Phase 3）- 可并行

| 模块 | 依赖 | 优先级 | 建议分工 |
|------|------|--------|----------|
| **features/search** | content-domain, web-ui | ⭐⭐ 高 | 搜索功能开发者 |
| **features/interaction** | content-domain, web-ui | ⭐⭐ 高 | 互动功能开发者 |

**并行建议**：
- 开发者 C → `search`（FlexSearch索引、搜索UI）
- 开发者 D → `interaction`（Giscus评论、Redis点赞）
- 两个模块完全独立，可同时进行

### 模块开发顺序

```
Phase 0: platform（串行，1天）
    │
    ▼
Phase 1: web-ui + content-source（并行，2-3天）
    │         │
    │         ▼
    │    content-domain（content-source完成后，1天）
    │         │
    └─────────┴─────────┐
                        ▼
Phase 2: features/blog（串行，2-3天）
    │
    ▼
Phase 3: search + interaction（并行，2-3天）
    │         │
    ▼         ▼
Phase 4: deploy（串行，1-2天）
```

### 模块独立开发指南

每个模块目录结构：
```
modules/
├── [模块名]/
│   ├── plan.md              # 模块详细计划
│   ├── Implement.md         # 模块实施状态
│   ├── src/                 # 模块源码（开发时）
│   └── tests/               # 模块测试
```

### 模块间接口契约

**content-domain → features 接口**：
```typescript
// 所有 features 模块通过以下接口获取数据
interface ContentService {
  getAllPosts(): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | null>;
  getPostsByTag(tag: string): Promise<Post[]>;
  getPostsByCategory(category: string): Promise<Post[]>;
  getAllTags(): Promise<string[]>;
  getAllCategories(): Promise<string[]>;
}

// 通过以下方式导入
import { contentService } from '@/lib/content';
```

**web-ui → features 接口**：
```typescript
// 所有 features 模块使用以下 UI 组件
import { Button, Card, Input } from '@/components/ui';
import { Header, Footer } from '@/components/layout';
import { ThemeProvider, useTheme } from '@/components/theme';
```

### 并行开发注意事项

1. **接口稳定性**：content-domain 和 web-ui 的接口需尽早确定，避免频繁变更
2. **Mock 数据**：features 开发时可使用 Mock 数据，不依赖真实 Notion 数据
3. **独立测试**：每个模块需有独立测试，不依赖其他模块
4. **集成时机**：模块完成后进行集成测试，确保接口兼容

## 技术选型

| 领域 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | Server Components, ISR 支持 |
| 样式 | Tailwind CSS | 原子化CSS，暗黑模式 |
| UI组件 | shadcn/ui | 与Tailwind配合 |
| Notion SDK | @notionhq/client | 官方SDK，固定API版本 |
| 搜索 | FlexSearch | 纯客户端，适合小博客 |
| 评论 | Giscus | 基于GitHub Discussions，免费 |
| 点赞 | Upstash Redis | 边缘函数支持好 |
| 部署 | Vercel | Next.js原生支持 |

## 开发阶段

### Phase 0: 基础部署配置 (1天)
- [ ] Vercel 项目创建
- [ ] 环境变量配置 (NOTION_TOKEN, NOTION_DATABASE_ID)
- [ ] CI/CD 基础配置
- [ ] README 初始化

### Phase 1: 基础架构 (并行，2-3天)

#### content-source 模块
- [ ] 初始化 @notionhq/client
- [ ] 固定 API 版本
- [ ] 实现分页获取
- [ ] 429 退避重试机制
- [ ] 错误处理封装

#### content-domain 模块
- [ ] Post DTO 定义
- [ ] Tag/Category 模型
- [ ] slug 生成规则
- [ ] Notion → DTO 转换层

#### web-ui 模块
- [ ] Tailwind 配置 + 暗黑模式
- [ ] shadcn/ui 初始化
- [ ] 基础布局组件 (Header, Footer, Sidebar)
- [ ] 主题切换组件

### Phase 2: 博客核心功能 (2-3天)
- [ ] 文章列表页 (SSG + ISR)
- [ ] 文章详情页 (SSG + ISR)
- [ ] 分类/标签页面
- [ ] 代码高亮 (Shiki)
- [ ] 响应式设计
- [ ] SEO 优化 (meta tags, sitemap)

### Phase 3: 高级功能 (并行，2-3天)

#### search 模块
- [ ] FlexSearch 集成
- [ ] 搜索索引构建
- [ ] 搜索 UI 组件
- [ ] 搜索结果高亮

#### interaction 模块
- [ ] Giscus 评论集成
- [ ] Upstash Redis 点赞存储
- [ ] 点赞 API (Edge Function)
- [ ] 点赞防刷机制

### Phase 4: 优化与发布 (1-2天)
- [ ] 性能优化 (图片、字体)
- [ ] 监控埋点 (Vercel Analytics)
- [ ] 文档完善
- [ ] 正式发布

## 接口规范

### content-domain 暴露接口
```typescript
// types/post.ts
interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: Block[];
  tags: string[];
  category: string;
  publishedAt: Date;
  updatedAt: Date;
}

// services/post-service.ts
interface PostService {
  getAllPosts(): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | null>;
  getPostsByTag(tag: string): Promise<Post[]>;
  getPostsByCategory(category: string): Promise<Post[]>;
  getAllTags(): Promise<string[]>;
  getAllCategories(): Promise<string[]>;
}
```

### web-ui 组件接口
```typescript
// components/theme-provider.tsx
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
}

// components/post-card.tsx
interface PostCardProps {
  post: Post;
  variant?: 'default' | 'compact';
}
```

## 数据结构

### Notion Database Schema
```
Properties:
- Title (title)
- Slug (rich_text)
- Tags (multi_select)
- Category (select)
- Published (checkbox)
- PublishedAt (date)
- Excerpt (rich_text)
```

### Redis 数据结构 (点赞)
```
Key: blog:likes:{postSlug}
Type: Hash
Field: {visitorFingerprint}
Value: {timestamp}

Key: blog:like_count:{postSlug}
Type: String
Value: {count}
```

## 边界情况与风险

### Notion API 限制
- **速率限制**: 约 3 req/s，需实现退避重试
- **Payload 大小**: 单页面 block 数量上限
- **API 版本**: 固定 Notion-Version，避免破坏性变更

### Vercel 限制
- Hobby 计划函数执行时长限制
- 边缘函数冷启动时间
- 构建时长限制

### 缓存策略
- 使用 `revalidateTag` 按内容失效
- ISR fallback: 'blocking' 避免 404
- 草稿预览使用动态路由 + `no-store`

## 验收标准

- [ ] 所有页面 Lighthouse 评分 > 90
- [ ] Notion 内容更新后 60 秒内自动刷新
- [ ] 搜索响应时间 < 200ms
- [ ] 移动端体验良好
- [ ] 暗黑模式切换无闪烁

## 风险缓解

| 风险 | 缓解措施 |
|------|----------|
| Notion API 不稳定 | 实现多层缓存，降级策略 |
| 搜索性能差 | 客户端索引，预构建 |
| 点赞数据丢失 | Upstash 持久化，定期备份 |
| 构建时间过长 | 增量构建，ISR |
