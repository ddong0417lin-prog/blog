# web-ui 模块计划

## 模块概述

负责整个博客的视觉呈现和交互体验，包括 Tailwind 主题配置、shadcn/ui 组件、暗黑模式支持、响应式布局和基础页面结构。作为最独立的模块，可以与其他模块并行开发。

## 模块边界

- ✅ 负责：主题系统、UI 组件、布局结构、响应式设计
- ❌ 不负责：业务逻辑（数据获取由 features 处理）、Notion 数据处理

## 契约引用

本模块需遵守以下契约文件：

| 契约文件 | 路径 | 说明 |
|----------|------|------|
| 模块路径映射 | [contracts/module-structure.md](../../contracts/module-structure.md) | 导出路径规范 |

**注意**：web-ui 作为纯展示层，不直接依赖类型契约，但需确保组件 Props 与 content-domain 输出的数据结构兼容。

示例 Props 接口：
```typescript
// 与 PostSummary 兼容的 PostCard Props
interface PostCardProps {
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    coverImage?: string;
    tags: string[];
    category: string;
    publishedAt: string | null;
    readingTime: number;
  };
  variant?: 'default' | 'compact';
}
```

## 技术选型

| 组件 | 选择 | 说明 |
|------|------|------|
| 样式框架 | Tailwind CSS | 原子化 CSS，暗黑模式支持 |
| UI 组件库 | shadcn/ui | 与 Tailwind 配合，可定制 |
| 图标 | Lucide React | shadcn 默认图标 |
| 字体 | Inter + JetBrains Mono | 正文 + 代码字体 |
| 动画 | Framer Motion | 可选，用于页面过渡 |

## 设计系统

### 颜色系统

```css
/* 语义化颜色变量 */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--secondary-foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--border: 214.3 31.8% 91.4%;
--input: 214.3 31.8% 91.4%;
--ring: 222.2 84% 4.9%;
```

### 断点设计

| 断点 | 宽度 | 用途 |
|------|------|------|
| sm | 640px | 手机横屏 |
| md | 768px | 平板 |
| lg | 1024px | 小桌面 |
| xl | 1280px | 标准桌面 |
| 2xl | 1536px | 大屏 |

### 间距系统

使用 Tailwind 默认间距：4px 基准（1 = 0.25rem = 4px）

## 组件清单

### 基础组件（shadcn/ui）
- [ ] Button
- [ ] Card
- [ ] Input
- [ ] Dialog
- [ ] Dropdown Menu
- [ ] Skeleton
- [ ] Badge
- [ ] Sheet（移动端菜单）
- [ ] Label
- [ ] Separator
- [ ] Avatar
- [ ] Navigation Menu

### 布局组件
- [ ] Header - 顶部导航
- [ ] Footer - 页脚
- [ ] Sidebar - 侧边栏（可选）
- [ ] Container - 内容容器
- [ ] MainLayout - 主布局

### 博客组件
- [ ] PostCard - 文章卡片
- [ ] PostList - 文章列表
- [ ] PostContent - 文章内容渲染
- [ ] TagBadge - 标签徽章
- [ ] CategoryNav - 分类导航

### 功能组件
- [ ] ThemeToggle - 主题切换
- [ ] SearchBox - 搜索框
- [ ] Pagination - 分页
- [ ] TOC - 文章目录

## 实施步骤

### Step 1: 项目初始化 (1h)
- [ ] 创建 Next.js 项目 (shadcn init)
- [ ] 配置 Tailwind 主题变量
- [ ] 配置暗黑模式 (class 策略)
- [ ] 添加基础 CSS

### Step 2: 主题系统 (2h)
- [ ] 实现 ThemeProvider
- [ ] 实现 ThemeToggle 组件
- [ ] 配置 next-themes
- [ ] 测试主题切换无闪烁

### Step 3: 基础组件 (3h)
- [ ] 安装 shadcn 基础组件
- [ ] 自定义组件样式
- [ ] 添加动画效果
- [ ] 组件文档/示例

### Step 4: 布局组件 (3h)
- [ ] Header 组件（Logo + 导航 + 主题切换）
- [ ] Footer 组件
- [ ] MainLayout 布局
- [ ] 响应式导航（移动端菜单）

### Step 5: 博客组件 (4h)
- [ ] PostCard 组件
- [ ] PostList 组件
- [ ] PostContent 组件框架
- [ ] TagBadge 组件
- [ ] TOC 组件

### Step 6: 页面模板 (2h)
- [ ] 首页模板（文章列表）
- [ ] 文章详情页模板
- [ ] 标签页模板
- [ ] 分类页模板

### Step 7: 优化与测试 (2h)
- [ ] 响应式测试（多设备）
- [ ] 暗黑模式测试
- [ ] 性能优化（字体加载、图片）
- [ ] 可访问性检查

## 代码结构

```
app/
├── layout.tsx              # 根布局
├── globals.css             # 全局样式
├── page.tsx                # 首页模板
├── (blog)/
│   ├── layout.tsx          # 博客布局
│   ├── page.tsx            # 文章列表
│   └── [slug]/
│       └── page.tsx        # 文章详情模板
components/
├── ui/                     # shadcn/ui 组件
├── layout/                 # 布局组件
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── MainLayout.tsx
├── blog/                   # 博客组件
│   ├── PostCard.tsx
│   ├── PostList.tsx
│   ├── PostContent.tsx
│   └── TOC.tsx
├── theme/                  # 主题组件
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
└── search/                 # 搜索组件
    └── SearchBox.tsx
lib/
└── utils.ts                # 工具函数
tailwind.config.ts          # Tailwind 配置
```

## 依赖关系

- **依赖**：无（最独立模块）
- **被依赖**：所有 features/* 模块

## 边界情况

| 场景 | 处理策略 |
|------|----------|
| 无网络（图标字体） | 使用本地字体文件 |
| JS 禁用 | 服务端渲染保证内容可见 |
| 主题闪烁 | 使用 suppressHydrationWarning |
| 小屏幕 | 移动端优先响应式设计 |

## 验收标准

- [ ] 所有页面响应式正常
- [ ] 主题切换无闪烁
- [ ] Lighthouse 可访问性 > 90
- [ ] 支持键盘导航
- [ ] 移动端体验良好

## 设计参考

- 整体风格：简洁、内容优先
- 参考 Notion Next 的 clean design
- 字体：Inter 正文，JetBrains Mono 代码
- 强调色：蓝色系（#3b82f6）

## 与其他模块协作

```
┌─────────────────────────────────────────┐
│           features/*                    │
│  (blog, search, interaction)            │
│  - 传入数据                             │
│  - 处理业务逻辑                          │
└─────────────────┬───────────────────────┘
                  │ 使用组件
                  ▼
┌─────────────────────────────────────────┐
│             web-ui                      │
│  (本模块：UI 组件、主题、布局)            │
│  - 纯展示层                              │
│  - 无业务逻辑                            │
└─────────────────────────────────────────┘
```
