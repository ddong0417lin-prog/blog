# Search 模块实施计划

## 模块概述

为博客提供全文搜索功能，基于 FlexSearch 实现客户端搜索，支持文章标题、摘要、标签和分类的搜索。

## 依赖关系

- **前置依赖**: content-domain (Post DTO), web-ui (组件基础)
- **被依赖**: 无
- **并行情况**: 可与 interaction 模块同时开发

## 契约引用

本模块需遵守以下契约文件：

| 契约文件 | 路径 | 说明 |
|----------|------|------|
| 核心类型 | [contracts/types.ts](../../contracts/types.ts) | SearchDocument, PostSummary |
| Service 接口 | [contracts/service-interface.ts](../../contracts/service-interface.ts) | SearchIndexBuilder |
| 模块路径 | [contracts/module-structure.md](../../contracts/module-structure.md) | 导出路径规范 |

**依赖接口**（来自契约）：
```typescript
// 构建索引时使用的数据
import type { PostSummary } from '@/contracts/types';
import type { SearchIndexBuilder } from '@/contracts/service-interface';

// SearchDocument 类型定义
interface SearchDocument {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
}
```

**注意**：索引构建脚本通过 content-domain 的 ContentService 获取数据，不直接访问 Notion API。

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 搜索引擎 | FlexSearch | 纯客户端，无需服务端，适合 <500 篇文章 |
| 索引格式 | JSON | 构建时生成，客户端加载 |
| 高亮 | 自定义 | 基于 FlexSearch 匹配结果 |
| UI | shadcn Command + Dialog | 类似 Spotlight 的搜索体验 |

## 目录结构

```
modules/search/
├── plan.md                      # 本计划文件
├── Implement.md                 # 实施状态跟踪
├── src/
│   ├── lib/
│   │   ├── index.ts            # FlexSearch 实例导出
│   │   ├── builder.ts          # 索引构建逻辑
│   │   └── types.ts            # 搜索相关类型
│   ├── components/
│   │   ├── SearchDialog.tsx    # 搜索弹窗
│   │   ├── SearchInput.tsx     # 搜索输入框
│   │   └── SearchResults.tsx   # 搜索结果列表
│   └── hooks/
│       └── useSearch.ts        # 搜索 Hook
└── scripts/
    └── build-index.ts          # 构建时生成索引
```

## 实施步骤

### Step 1: 索引构建 (Day 1)

**目标**: 构建时生成搜索索引 JSON 文件

#### 1.1 安装依赖
```bash
npm install flexsearch
npm install -D @types/flexsearch
```

#### 1.2 创建索引构建器
```typescript
// src/lib/builder.ts
import { Index } from 'flexsearch';
import { Post } from '@/modules/content-domain/src/types/post';

export interface SearchDocument {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
}

export function buildSearchIndex(posts: Post[]) {
  // 使用多字段索引，标题权重更高
  const index = new Index({
    tokenize: 'full', // 对中文更友好
    cache: true,
    resolution: 9, // 提高匹配精度
  });

  const documents: SearchDocument[] = posts.map(post => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    tags: post.tags,
    category: post.category,
  }));

  documents.forEach(doc => {
    // 标题权重 3 倍，标签 2 倍，摘要和分类 1 倍
    const searchableText = [
      doc.title, doc.title, doc.title, // 权重 3
      ...doc.tags.flatMap(tag => [tag, tag]), // 权重 2
      doc.excerpt, // 权重 1
      doc.category, // 权重 1
    ].join(' ');

    index.add(doc.id, searchableText);
  });

  return { index, documents };
}

// 使用 FlexSearch 官方推荐的序列化方式
export async function exportIndexToJSON(index: Index) {
  return new Promise<string>((resolve) => {
    const chunks: string[] = [];
    index.export((key, data) => {
      if (key && data) {
        chunks.push(JSON.stringify({ key, data }));
      }
    });
    resolve('[' + chunks.join(',') + ']');
  });
}
```
```

#### 1.3 创建构建脚本
```typescript
// scripts/build-index.ts
import { getAllPosts } from '@/modules/content-domain/src/services/post-service';
import { buildSearchIndex, exportIndexToJSON } from '../src/lib/builder';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const posts = await getAllPosts();
  const { index, documents } = buildSearchIndex(posts);
  const exported = exportIndexToJSON(index, documents);

  const outputPath = join(process.cwd(), 'public', 'search-index.json');
  writeFileSync(outputPath, JSON.stringify(exported));

  console.log(`✓ Search index built with ${documents.length} posts`);
  console.log(`✓ Output: ${outputPath}`);
}

main().catch(console.error);
```

**验收标准**:
- [ ] 构建时正确生成 `public/search-index.json`
- [ ] 索引包含所有已发布文章
- [ ] 文件大小 < 100KB（约 200 篇文章）

### Step 2: 客户端搜索 (Day 1)

**目标**: 实现客户端搜索功能

#### 2.1 创建搜索 Hook
```typescript
// src/hooks/useSearch.ts
import { useEffect, useState, useCallback } from 'react';
import { Index } from 'flexsearch';
import { SearchDocument } from '../lib/types';

interface UseSearchOptions {
  limit?: number;
  minQueryLength?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const { limit = 10, minQueryLength = 2 } = options;
  const [index, setIndex] = useState<Index | null>(null);
  const [documents, setDocuments] = useState<Record<string, SearchDocument>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载索引
  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then(data => {
        const idx = new Index();
        idx.import(data.index);
        setIndex(idx);

        const docsMap: Record<string, SearchDocument> = {};
        data.documents.forEach((doc: SearchDocument) => {
          docsMap[doc.id] = doc;
        });
        setDocuments(docsMap);
        setIsLoading(false);
      });
  }, []);

  // 执行搜索
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);

    if (!index || searchQuery.length < minQueryLength) {
      setResults([]);
      return;
    }

    const ids = index.search(searchQuery, { limit });
    const matched = ids
      .map(id => documents[id as string])
      .filter(Boolean);

    setResults(matched);
  }, [index, documents, limit, minQueryLength]);

  return {
    query,
    results,
    isLoading,
    search,
  };
}
```

#### 2.2 创建搜索组件
```typescript
// src/components/SearchDialog.tsx
'use client';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useSearch } from '../hooks/useSearch';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const { query, results, isLoading, search } = useSearch({ limit: 10 });

  // 快捷键支持 (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (slug: string) => {
    onOpenChange(false);
    router.push(`/${slug}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="搜索文章..."
        value={query}
        onValueChange={search}
      />
      <CommandList>
        {isLoading ? (
          <CommandEmpty>加载中...</CommandEmpty>
        ) : query.length < 2 ? (
          <CommandEmpty>输入至少 2 个字符开始搜索</CommandEmpty>
        ) : results.length === 0 ? (
          <CommandEmpty>未找到相关文章</CommandEmpty>
        ) : (
          <CommandGroup heading="文章">
            {results.map(doc => (
              <CommandItem
                key={doc.id}
                onSelect={() => handleSelect(doc.slug)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{doc.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {doc.category} · {doc.excerpt.slice(0, 50)}...
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```

**验收标准**:
- [ ] 搜索响应时间 < 100ms
- [ ] 支持 Cmd+K 快捷键
- [ ] 搜索结果包含标题、分类、摘要
- [ ] 点击结果跳转到对应文章

### Step 3: 搜索按钮集成 (Day 2)

**目标**: 在 Header 中添加搜索入口

```typescript
// src/components/SearchButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { SearchDialog } from './SearchDialog';

export function SearchButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">搜索文章...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
```

**验收标准**:
- [ ] Header 显示搜索按钮
- [ ] 桌面端显示快捷键提示 (⌘K)
- [ ] 移动端显示图标按钮

### Step 4: 高亮匹配文本 (Day 2)

**目标**: 搜索结果中高亮匹配的文本

```typescript
// src/components/HighlightedText.tsx
interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightedText({ text, query, className }: HighlightedTextProps) {
  if (!query) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
```

**验收标准**:
- [ ] 匹配的文本在标题中高亮显示
- [ ] 高亮样式适配暗黑模式

### Step 5: 索引增量更新 (Day 3)

**目标**: 支持 ISR 时增量更新搜索索引

```typescript
// src/lib/updater.ts
export async function updateSearchIndex(newPost: Post) {
  // 在 revalidate 时调用，更新索引
  // 可通过 API 路由触发重建
}
```

**验收标准**:
- [ ] 新文章发布后 60 秒内索引自动更新
- [ ] 使用 revalidateTag 触发索引重建

## 接口定义

```typescript
// src/lib/types.ts
export interface SearchDocument {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
}

export interface SearchResult extends SearchDocument {
  score?: number;
}

// src/hooks/useSearch.ts
export interface UseSearchReturn {
  query: string;
  results: SearchDocument[];
  isLoading: boolean;
  search: (query: string) => void;
}
```

## 性能指标

| 指标 | 目标 | 测试方法 |
|------|------|----------|
| 索引加载时间 | < 200ms | Lighthouse |
| 搜索响应时间 | < 100ms | 性能面板 |
| 索引文件大小 | < 100KB | 文件系统 |
| 内存占用 | < 5MB | 浏览器 DevTools |

## 边界情况

1. **索引文件 404**: 显示友好提示，引导用户刷新页面
2. **搜索无结果**: 显示"未找到相关文章"，建议检查关键词
3. **索引过大**: 考虑分页加载或服务端搜索方案
4. **特殊字符**: 处理正则特殊字符，避免搜索报错

## 依赖接口

```typescript
// 来自 content-domain
interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
}

function getAllPosts(): Promise<Post[]>;
```

## 测试策略

- **单元测试**: 索引构建逻辑、搜索匹配算法
- **集成测试**: 搜索流程端到端测试
- **性能测试**: 大量文章时的搜索性能
