# Interaction 模块实施计划

## 模块概述

为博客提供用户互动功能，包括评论系统（Giscus）和文章点赞功能（Upstash Redis）。

## 依赖关系

- **前置依赖**: content-domain (Post slug), web-ui (组件基础)
- **被依赖**: 无
- **并行情况**: 可与 search 模块同时开发

## 技术选型

| 功能 | 选择 | 理由 |
|------|------|------|
| 评论系统 | Giscus | 基于 GitHub Discussions，免费，技术博客受众适用 |
| 点赞存储 | Upstash Redis | 边缘函数支持好，全球低延迟 |
| 防刷机制 | Fingerprint + IP + 时间窗口 + Origin 校验 | 多层防护，减少误判 |
| API 路由 | Next.js Edge Runtime | 低延迟，全球部署 |
| 限流 | @upstash/ratelimit | Upstash 官方限流库，原子操作 |

## 前置准备

### Giscus 配置
1. 确保 GitHub 仓库已开启 Discussions 功能
2. 安装 Giscus App: https://github.com/apps/giscus
3. 在仓库设置中配置 Discussions 分类

### Upstash 配置
1. 注册 Upstash 账号: https://upstash.com
2. 创建 Redis 数据库
3. 获取 REST API URL 和 Token

## 目录结构

```
modules/interaction/
├── plan.md                      # 本计划文件
├── Implement.md                 # 实施状态跟踪
├── src/
│   ├── lib/
│   │   ├── redis.ts            # Upstash Redis 客户端
│   │   ├── fingerprint.ts      # 设备指纹生成
│   │   ├── rate-limit.ts       # 限流逻辑
│   │   └── types.ts            # 类型定义
│   ├── components/
│   │   ├── GiscusComments.tsx  # Giscus 评论组件
│   │   ├── LikeButton.tsx      # 点赞按钮
│   │   └── LikeCount.tsx       # 点赞数显示
│   └── hooks/
│       ├── useLike.ts          # 点赞 Hook
│       └── useLikeCount.ts     # 获取点赞数 Hook
└── src-app/
    └── api/
        └── like/
            └── route.ts        # 点赞 API 路由
```

## 环境变量

```bash
# .env.local
# Giscus 配置
NEXT_PUBLIC_GISCUS_REPO=your-username/your-repo
NEXT_PUBLIC_GISCUS_REPO_ID=your-repo-id
NEXT_PUBLIC_GISCUS_CATEGORY=Announcements
NEXT_PUBLIC_GISCUS_CATEGORY_ID=your-category-id

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

## 实施步骤

### Step 1: 评论系统集成 (Day 1)

**目标**: 集成 Giscus 评论系统

#### 1.1 安装依赖
```bash
npm install @giscus/react
```

#### 1.2 创建 Giscus 组件

**注意**: Giscus 仅支持 GitHub 用户评论，非 GitHub 用户无法参与讨论。

```typescript
// src/components/GiscusComments.tsx
'use client';

import Giscus from '@giscus/react';
import { useTheme } from 'next-themes';

interface GiscusCommentsProps {
  slug: string;
}

export function GiscusComments({ slug }: GiscusCommentsProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="mt-10 border-t pt-10">
      <Giscus
        repo={process.env.NEXT_PUBLIC_GISCUS_REPO!}
        repoId={process.env.NEXT_PUBLIC_GISCUS_REPO_ID!}
        category={process.env.NEXT_PUBLIC_GISCUS_CATEGORY!}
        categoryId={process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID!}
        mapping="specific"
        term={slug}
        strict="1"  // 严格匹配 slug
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        lang="zh-CN"
        loading="lazy"
      />
    </div>
  );
}
```

#### 1.3 在文章详情页使用
```typescript
// 在 PostContent 或文章详情页中
import { GiscusComments } from '@/modules/interaction/src/components/GiscusComments';

export function PostPage({ post }: { post: Post }) {
  return (
    <article>
      <PostContent post={post} />
      <GiscusComments slug={post.slug} />
    </article>
  );
}
```

**验收标准**:
- [ ] 每篇文章底部显示 Giscus 评论区
- [ ] 评论映射到对应文章（通过 slug）
- [ ] 暗黑模式自动切换主题
- [ ] 支持 GitHub 登录评论

### Step 2: Redis 客户端封装 (Day 1)

**目标**: 封装 Upstash Redis 客户端

#### 2.1 安装依赖
```bash
npm install @upstash/redis @upstash/ratelimit
```

#### 2.2 创建 Redis 客户端
```typescript
// src/lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 点赞相关的 Redis Key 生成
export function getLikeKey(slug: string) {
  return `blog:likes:${slug}`;
}

export function getLikeCountKey(slug: string) {
  return `blog:like_count:${slug}`;
}

export function getRateLimitKey(fingerprint: string) {
  return `blog:rate_limit:${fingerprint}`;
}
```

**验收标准**:
- [ ] Redis 连接成功
- [ ] 环境变量正确读取

### Step 3: 设备指纹生成 (Day 2)

**目标**: 生成唯一设备指纹用于防刷

```typescript
// src/lib/fingerprint.ts
import { headers } from 'next/headers';

export async function generateFingerprint(): Promise<string> {
  const headersList = headers();

  // 组合多个特征生成指纹
  const userAgent = headersList.get('user-agent') || '';
  const acceptLanguage = headersList.get('accept-language') || '';
  const ip = headersList.get('x-forwarded-for') ||
             headersList.get('x-real-ip') ||
             'unknown';

  // 使用简单的哈希组合
  const raw = `${ip}:${userAgent}:${acceptLanguage}`;

  // 使用 Web Crypto API 生成哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
```

**验收标准**:
- [ ] 同一设备生成的指纹一致
- [ ] 不同设备指纹不同
- [ ] 指纹长度固定 16 位

### Step 4: 限流逻辑 (Day 2)

**目标**: 实现点赞频率限制

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// 创建限流器实例
export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 每分钟最多 10 次
  analytics: true, // 启用分析
});

export async function checkRateLimit(fingerprint: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(fingerprint);
  return {
    allowed: success,
    remaining,
    resetTime: reset,
  };
}
```

**验收标准**:
- [ ] 1 分钟内超过 10 次点赞被拒绝
- [ ] 正确返回剩余次数和重置时间
- [ ] 过期记录自动清理

### Step 5: 点赞 API (Day 2-3)

**目标**: 创建 Edge Function 处理点赞请求

```typescript
// src-app/api/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis, getLikeKey, getLikeCountKey } from '@/modules/interaction/src/lib/redis';
import { generateFingerprint } from '@/modules/interaction/src/lib/fingerprint';
import { checkRateLimit } from '@/modules/interaction/src/lib/rate-limit';

export const runtime = 'edge';

// GET /api/like?slug=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const count = await redis.get<number>(getLikeCountKey(slug)) || 0;

  return NextResponse.json({ count });
}

// POST /api/like
export async function POST(request: NextRequest) {
  try {
    const { slug, action } = await request.json();

    if (!slug || !['like', 'unlike'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // 生成设备指纹
    const fingerprint = await generateFingerprint();

    // 检查限流
    const rateLimit = await checkRateLimit(fingerprint);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          },
        }
      );
    }

    const likeKey = getLikeKey(slug);
    const countKey = getLikeCountKey(slug);

    if (action === 'like') {
      // 检查是否已点赞
      const hasLiked = await redis.hexists(likeKey, fingerprint);
      if (hasLiked) {
        return NextResponse.json(
          { error: 'Already liked' },
          { status: 409 }
        );
      }

      // 记录点赞
      await redis.hset(likeKey, { [fingerprint]: Date.now() });
      await redis.incr(countKey);

    } else {
      // 取消点赞
      const hasLiked = await redis.hexists(likeKey, fingerprint);
      if (!hasLiked) {
        return NextResponse.json(
          { error: 'Not liked yet' },
          { status: 409 }
        );
      }

      await redis.hdel(likeKey, fingerprint);
      await redis.decr(countKey);
    }

    const count = await redis.get<number>(countKey) || 0;

    return NextResponse.json({
      success: true,
      count,
      liked: action === 'like',
    });

  } catch (error) {
    console.error('Like API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**验收标准**:
- [ ] GET 返回正确的点赞数
- [ ] POST 成功记录/取消点赞
- [ ] 重复点赞返回 409
- [ ] 超限时返回 429 和重置时间
- [ ] Edge Runtime 运行

### Step 6: 点赞 UI 组件 (Day 3)

**目标**: 创建可复用的点赞按钮组件

```typescript
// src/components/LikeButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useLike } from '../hooks/useLike';

interface LikeButtonProps {
  slug: string;
  initialCount?: number;
}

export function LikeButton({ slug, initialCount = 0 }: LikeButtonProps) {
  const { count, liked, isLoading, toggleLike } = useLike(slug, initialCount);

  return (
    <Button
      variant={liked ? 'default' : 'outline'}
      size="sm"
      onClick={toggleLike}
      disabled={isLoading}
      className="gap-2"
    >
      <Heart
        className={`h-4 w-4 ${liked ? 'fill-current' : ''}`}
      />
      <span>{count}</span>
    </Button>
  );
}
```

```typescript
// src/hooks/useLike.ts
'use client';

import { useState, useCallback } from 'react';

export function useLike(slug: string, initialCount: number = 0) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleLike = useCallback(async () => {
    setIsLoading(true);

    try {
      const action = liked ? 'unlike' : 'like';
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action }),
      });

      if (response.ok) {
        const data = await response.json();
        setCount(data.count);
        setLiked(data.liked);
      } else if (response.status === 429) {
        // 显示限流提示
        alert('点赞太频繁了，请稍后再试');
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug, liked]);

  return { count, liked, isLoading, toggleLike };
}
```

**验收标准**:
- [ ] 显示当前点赞数
- [ ] 点击切换点赞状态
- [ ] 已点赞状态显示填充心形
- [ ] 加载状态禁用按钮

## 接口定义

```typescript
// src/lib/types.ts
export interface LikeResponse {
  success: boolean;
  count: number;
  liked: boolean;
}

export interface LikeError {
  error: string;
  resetTime?: number;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}
```

## 性能指标

| 指标 | 目标 | 测试方法 |
|------|------|----------|
| API 响应时间 | < 200ms | Vercel Analytics |
| Redis 操作时间 | < 50ms | Upstash Dashboard |
| 限流准确率 | > 95% | 压力测试 |

## 安全考虑

1. **防刷机制**: 指纹 + IP + 时间窗口三层防护
2. **防止重复点赞**: Redis Hash 确保同一设备只能点赞一次
3. **限流保护**: 每分钟最多 10 次点赞操作
4. **Edge Runtime**: 代码不暴露服务端逻辑

## 边界情况

1. **Redis 不可用**: 降级为仅本地计数，不持久化
2. **API 超时**: 客户端显示错误，允许重试
3. **同一设备多浏览器**: 使用指纹 + IP 组合，减少误判
4. **VPN/代理**: 可能误判为同一用户，但限流保护正常

## 测试策略

- **单元测试**: 限流逻辑、指纹生成
- **集成测试**: 点赞 API 端到端测试
- **压力测试**: 模拟高并发点赞场景
