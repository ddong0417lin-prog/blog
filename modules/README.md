# 并行开发模块汇总

## 模块目录结构

```
modules/
├── content-source/          # Phase 1 - 可并行
│   ├── plan.md
│   └── Implement.md
├── content-domain/          # Phase 1 - 依赖 content-source
│   ├── plan.md
│   └── Implement.md
├── web-ui/                  # Phase 1 - 可并行
│   ├── plan.md
│   └── Implement.md
├── search/                  # Phase 3 - 可并行
│   ├── plan.md
│   └── Implement.md
└── interaction/             # Phase 3 - 可并行
    ├── plan.md
    └── Implement.md
```

## 并行开发策略

### Phase 1 并行 (基础架构)

| 模块 | 依赖 | 建议负责人 | 预估工期 |
|------|------|------------|----------|
| **content-source** | 无 | 后端/全栈 | 1-2 天 |
| **web-ui** | 无 | 前端 | 1-2 天 |
| **content-domain** | content-source | 后端/全栈 | 1 天 |

**并行方案**:
- 开发者 A → `content-source`（Notion API 封装）
- 开发者 B → `web-ui`（UI 组件、主题系统）
- content-source 完成后 → 开发者 A 继续 `content-domain`

**关键路径**: content-source → content-domain → features/blog

### Phase 3 并行 (高级功能)

| 模块 | 依赖 | 建议负责人 | 预估工期 |
|------|------|------------|----------|
| **search** | content-domain, web-ui | 前端/全栈 | 2-3 天 |
| **interaction** | content-domain, web-ui | 前端/全栈 | 2-3 天 |

**并行方案**:
- 开发者 A → `search`（FlexSearch 集成）
- 开发者 B → `interaction`（Giscus + 点赞）

**特点**: 两个模块完全独立，可完全并行

## 开发顺序建议

```
Week 1
├── Day 1-2: Phase 0 (部署配置)
├── Day 3-5: Phase 1 并行
│   ├── content-source (开发者A)
│   └── web-ui (开发者B)
└── Day 6-7: content-domain (开发者A)

Week 2
├── Day 1-3: Phase 2 (features/blog)
└── Day 4-7: Phase 3 并行
    ├── search (开发者A)
    └── interaction (开发者B)

Week 3
└── Day 1-2: Phase 4 (优化发布)
```

## 模块接口契约

### Phase 1 → Phase 2 接口

```typescript
// content-domain 输出
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

// web-ui 输出
interface ThemeProviderProps { ... }
interface ButtonProps { ... }
interface CardProps { ... }
// ... 其他 shadcn 组件
```

### Phase 2 → Phase 3 接口

```typescript
// features/blog 输出
interface BlogPageProps {
  posts: Post[];
  post?: Post;  // 详情页
}

// 用于 search 和 interaction 的上下文
const PostContext = createContext<Post>();
```

## 协作注意事项

1. **接口变更通知**
   - content-domain 的 Post 类型变更需通知所有下游模块
   - web-ui 组件接口变更需通知所有使用方

2. **测试数据**
   - content-source 需提供 mock 数据供其他模块开发使用
   - 见 `modules/content-source/src/lib/mock.ts`

3. **环境变量**
   - 每个模块独立维护所需的环境变量列表
   - 在各自 plan.md 中说明

4. **代码审查**
   - 模块完成前需通过 Codex 审阅
   - 接口变更需额外审阅

## 风险与缓解

| 风险 | 影响模块 | 缓解措施 |
|------|----------|----------|
| content-source 延迟 | content-domain, search, interaction | 提供 mock 接口 |
| web-ui 延迟 | 所有 features | 使用原生 HTML 占位 |
| 接口不匹配 | 跨模块 | 先定义 TypeScript 接口再开发 |
| 依赖版本冲突 | 全局 | 统一在根目录管理依赖 |

## 快速开始

### 单人开发
```bash
# 按顺序开发
1. content-source → content-domain → web-ui
2. features/blog
3. search (并行) + interaction (并行)
```

### 双人开发
```bash
# 开发者 A
content-source → content-domain → search

# 开发者 B
web-ui → (等 content-domain) → features/blog → interaction
```

### 三人开发
```bash
# 开发者 A
content-source → content-domain → features/blog

# 开发者 B
web-ui → (等 A 完成 blog) → search

# 开发者 C
(等 A 完成 blog) → interaction
```
