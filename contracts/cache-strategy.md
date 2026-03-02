# 缓存策略文档

> **Phase -1 契约文档**
> **版本**: 1.0.0
> **状态**: 已冻结
> **最后更新**: 2026-03-02

---

## 1. 缓存架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户请求                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Level 1: 内存缓存 (Memory Cache)                                │
│  ├─ 位置: 应用进程内                                              │
│  ├─ TTL: 60 秒 (开发) / 5 分钟 (生产)                             │
│  ├─ 容量: 100 条 (LRU 淘汰)                                       │
│  └─ 用途: 高频访问的文章列表、配置                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ miss
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Level 2: 边缘缓存 (Edge Cache)                                  │
│  ├─ 位置: Vercel Edge / Cloudflare                               │
│  ├─ TTL: 5 分钟                                                  │
│  ├─ 容量: 无限制 (按请求计费)                                     │
│  └─ 用途: ISR 页面、API 响应                                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │ miss
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Level 3: 源站缓存 (Origin Cache)                                │
│  ├─ 位置: Next.js Data Cache / Upstash Redis                    │
│  ├─ TTL: 1 小时                                                  │
│  ├─ 容量: 取决于存储                                              │
│  └─ 用途: Notion API 响应、构建时数据                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ miss
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Source: Notion API                                              │
│  └─ 降级: 使用 stale cache / 返回空集合 / 抛错                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 缓存 Key 规范

### 2.1 Key 命名规则

```
[namespace]:[resource]:[identifier]:[variant]:[hash]
```

| 组件 | 说明 | 示例 |
|------|------|------|
| `namespace` | 命名空间 | `blog`, `search`, `interaction` |
| `resource` | 资源类型 | `posts`, `post`, `tags`, `likes` |
| `identifier` | 资源标识 | `all`, `slug-value`, `tag-name` |
| `variant` | 查询变体 | `page-1`, `sort-desc`, `filter-tag` |
| `hash` | 参数哈希 | 前 8 位 SHA256 |

### 2.2 具体 Key 示例

```typescript
// 文章列表（含查询参数）
`blog:posts:all:page-${page}:sort-${sortBy}-${sortOrder}:${paramHash}`

// 单篇文章
`blog:post:${slug}:detail`

// 标签列表
`blog:tags:all:v1`

// 点赞数
`blog:likes:${slug}:count`

// 用户点赞状态
`blog:likes:${slug}:user:${fingerprint}`

// 搜索索引
`search:index:v${indexVersion}`
```

### 2.3 参数哈希计算

```typescript
function generateParamHash(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}=${JSON.stringify(params[k])}`)
    .join('&');

  // 简单的 djb2 哈希
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) + hash) + sorted.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).slice(0, 8);
}
```

---

## 3. 分层缓存策略

### 3.1 内存缓存 (Memory)

```typescript
interface MemoryCacheConfig {
  maxSize: 100;           // 最大条目数
  ttl: 60 * 1000;         // 60 秒
  updateAgeOnGet: true;   // 访问时刷新 TTL
  allowStale: false;      // 不允许返回过期数据
}

// 使用 LRU 策略淘汰
const memoryCache = new LRUCache<string, CacheEntry>({
  max: 100,
  ttl: 60 * 1000,
});
```

**适用数据**:
- 文章列表（首页第一页）
- 标签/分类元数据
- 配置信息

### 3.2 边缘缓存 (Edge)

```typescript
// Next.js fetch 自动缓存
fetch(url, {
  next: {
    revalidate: 300,        // 5 分钟
    tags: ['posts', `post-${slug}`],
  },
});
```

**适用数据**:
- ISR 页面
- API 路由响应
- 静态资源

### 3.3 源站缓存 (Origin)

```typescript
// Next.js Data Cache
import { unstable_cache } from 'next/cache';

const getCachedPosts = unstable_cache(
  async () => fetchPosts(),
  ['posts', 'all'],
  { revalidate: 3600, tags: ['posts'] }
);
```

**适用数据**:
- Notion API 原始响应
- 搜索索引数据
- 计算密集型结果

---

## 4. 缓存失效策略

### 4.1 主动失效（推荐）

```typescript
// 使用 Next.js revalidateTag
import { revalidateTag } from 'next/cache';

// 发布新文章时
revalidateTag('posts');
revalidateTag('tags');

// 更新文章时
revalidateTag(`post-${slug}`);
revalidateTag('search-index');
```

### 4.2 被动失效（TTL）

| 数据类型 | TTL | 说明 |
|----------|-----|------|
| 文章列表 | 5 分钟 | 更新不频繁 |
| 单篇文章 | 1 小时 | 发布后基本不变 |
| 标签/分类 | 1 小时 | 元数据稳定 |
| 点赞数 | 实时 | 直接查 Redis |

### 4.3 按需失效（Webhook）

```typescript
// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { type, slug } = await request.json();

  switch (type) {
    case 'post.updated':
      await revalidateTag(`post-${slug}`);
      await revalidateTag('posts');
      break;
    case 'post.created':
      await revalidateTag('posts');
      await revalidateTag('search-index');
      break;
  }

  return Response.json({ revalidated: true });
}
```

---

## 5. 降级策略

### 5.1 降级优先级

```
正常:    Memory → Edge → Origin → Notion API
降级 1:  Stale Cache → Origin → Notion API
降级 2:  Stale Cache → 空集合 / 默认值
降级 3:  返回 503 + 友好提示
```

### 5.2 具体场景处理

| 场景 | 策略 | 实现 |
|------|------|------|
| Notion API 超时 | 返回 stale cache | 缓存时带 `stale-while-revalidate` |
| Notion API 报错 | 返回空集合 | 返回 `[]` 或 `null` |
| Redis 不可用 | 禁用点赞功能 | 前端隐藏点赞按钮 |
| Edge 限流 | 直接回源 | 降级到 Origin Cache |

### 5.3 代码示例

```typescript
async function getPostsWithFallback(): Promise<PostSummary[]> {
  try {
    // 尝试正常获取
    return await fetchPosts();
  } catch (error) {
    // 尝试 stale cache
    const stale = await cache.get('posts:all', { allowStale: true });
    if (stale) {
      console.warn('Using stale cache for posts');
      return stale;
    }

    // 返回空集合
    return [];
  }
}
```

---

## 6. 一致性保证

### 6.1 写入一致性

```typescript
// 点赞操作的原子性
async function likePost(slug: string, fingerprint: string) {
  // 使用 Redis 事务
  const multi = redis.multi();

  multi.hset(`blog:likes:${slug}:users`, { [fingerprint]: Date.now() });
  multi.incr(`blog:likes:${slug}:count`);

  const results = await multi.exec();

  // 检查事务结果
  if (results.some(r => r.error)) {
    throw new Error('Transaction failed');
  }

  // 刷新相关缓存
  await cache.del(`blog:likes:${slug}:count`);
}
```

### 6.2 读取一致性

```typescript
// 缓存穿透保护（Cache Aside 模式）
async function getPost(slug: string): Promise<PostDetail | null> {
  const cacheKey = `blog:post:${slug}:detail`;

  // 1. 读缓存
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // 2. 读数据库
  const post = await notionClient.getPage(slug);
  if (!post) {
    // 缓存空值，防止穿透
    await cache.set(cacheKey, null, { ttl: 60 });
    return null;
  }

  // 3. 写缓存
  await cache.set(cacheKey, post, { ttl: 3600 });

  return post;
}
```

---

## 7. 监控指标

### 7.1 需要监控的指标

| 指标 | 目标值 | 告警阈值 |
|------|--------|----------|
| 缓存命中率 | > 80% | < 60% |
| 缓存响应时间 | < 10ms | > 50ms |
| Notion API 调用 | - | > 100/min |
| 缓存失效延迟 | < 5s | > 30s |

### 7.2 埋点代码

```typescript
// 统一缓存操作封装
async function cacheGet<T>(key: string): Promise<T | null> {
  const start = performance.now();
  const result = await redis.get(key);
  const duration = performance.now() - start;

  // 上报指标
  metrics.record('cache_get', {
    key,
    hit: result !== null,
    duration,
  });

  return result;
}
```

---

## 8. 环境差异

| 环境 | 内存 TTL | Edge TTL | Origin TTL | 备注 |
|------|----------|----------|------------|------|
| 开发 | 10 秒 | 禁用 | 60 秒 | 快速迭代 |
| 测试 | 60 秒 | 60 秒 | 5 分钟 | 接近生产 |
| 生产 | 5 分钟 | 5 分钟 | 1 小时 | 高性能 |

---

## 9. 接口契约

### 9.1 Cache Service 接口

```typescript
interface CacheService {
  get<T>(key: string, options?: { allowStale?: boolean }): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  getStale<T>(key: string): Promise<{ data: T; stale: boolean } | null>;
}
```

### 9.2 模块间约定

- **content-source**: 负责与 Notion 交互，使用源站缓存
- **content-domain**: 使用缓存服务获取数据，不直接访问 Notion
- **features/***: 通过 content-domain 获取数据，不直接操作缓存
- **search/interaction**: 管理自己的缓存，遵循 Key 命名规范

---

## 10. 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| 1.0.0 | 2026-03-02 | 初始版本 | - |
