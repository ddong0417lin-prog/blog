# 模块路径映射与导入规范

## 概述

本文档定义各模块的导出路径和导入方式，确保模块间依赖清晰。

## 模块路径映射

| 模块 | 导出路径 | 实现位置 | 说明 |
|------|----------|----------|------|
| **content-domain** | `@/lib/content` | `src/lib/content/index.ts` | 内容服务统一入口 |
| **interaction** | `@/lib/interaction` | `src/lib/interaction/index.ts` | 互动服务（点赞） |
| **search** | `@/lib/search` | `src/lib/search/index.ts` | 搜索相关 |
| **web-ui** | `@/components/ui` | `src/components/ui/index.ts` | shadcn 组件 |
| **web-ui/layout** | `@/components/layout` | `src/components/layout/index.ts` | 布局组件 |
| **web-ui/theme** | `@/components/theme` | `src/components/theme/index.ts` | 主题相关 |
| **契约类型** | `@/contracts/*` | `src/contracts/*` | 契约文档（开发时） |

## 导出示例

### content-domain 模块

```typescript
// src/lib/content/index.ts
export { ContentServiceImpl as contentService } from './service';
export type {
  ContentService,
  NotionSource,
  NotionPageData,
  NotionPageProperties,
  CacheService,
} from '@/contracts/service-interface';

// 重新导出类型方便使用
export type {
  PostSummary,
  PostDetail,
  Tag,
  Category,
  ListOptions,
  PaginatedResult,
} from '@/contracts/types';
```

### interaction 模块

```typescript
// src/lib/interaction/index.ts
export { interactionService } from './service';
export type { InteractionService } from '@/contracts/service-interface';
export type { LikeResponse, RateLimitInfo } from '@/contracts/types';
```

### web-ui 模块

```typescript
// src/components/ui/index.ts
export { Button } from './button';
export { Card } from './card';
// ... 其他 shadcn 组件

// src/components/layout/index.ts
export { Header } from './Header';
export { Footer } from './Footer';
export { MainLayout } from './MainLayout';

// src/components/theme/index.ts
export { ThemeProvider } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';
```

## 使用示例

### 在 Server Component 中获取文章

```typescript
// app/page.tsx
import { contentService } from '@/lib/content';

export default async function HomePage() {
  const { data: posts, hasMore } = await contentService.getPublishedPosts({
    pageSize: 10,
  });

  return <PostList posts={posts} />;
}
```

### 在 Client Component 中使用 UI 组件

```typescript
'use client';

import { Button } from '@/components/ui';
import { Header, Footer } from '@/components/layout';

export function MyPage() {
  return (
    <>
      <Header />
      <Button>Click me</Button>
      <Footer />
    </>
  );
}
```

### 在 API Route 中使用互动服务

```typescript
// app/api/like/route.ts
import { interactionService } from '@/lib/interaction';

export async function POST(request: Request) {
  const { slug, fingerprint } = await request.json();
  const result = await interactionService.toggleLike(slug, fingerprint);
  return Response.json(result);
}
```

## 契约文件位置

开发阶段契约文件位于项目根目录的 `contracts/` 文件夹：

```
contracts/
├── types.ts              # 核心类型定义
├── service-interface.ts  # Service 接口
├── mock-schema.ts        # Mock 数据
├── cache-strategy.md     # 缓存策略
└── module-structure.md   # 本文件
```

实际开发时，可以通过以下方式引用：

```typescript
// 推荐：从模块入口导入
import type { PostSummary } from '@/lib/content';

// 或直接从契约导入（开发阶段）
import type { PostSummary } from '@/contracts/types';
```

## 依赖关系图

```
                    ┌─────────────┐
                    │  contracts  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│content-source │  │content-domain │  │    web-ui     │
└───────┬───────┘  └───────┬───────┘  └───────────────┘
        │                  │
        └──────────────────┘
                   │
                   ▼
          ┌───────────────┐
          │ features/*    │
          │ (blog/search/ │
          │ interaction)  │
          └───────────────┘
```

## 注意事项

1. **禁止循环依赖**：模块 A 不能导入模块 B，同时模块 B 导入模块 A
2. **契约优先**：开发前先确认契约文件，避免接口不兼容
3. **类型导出**：每个模块需重新导出契约类型，方便使用者
4. **实现隔离**：模块内部实现细节不暴露给其他模块
