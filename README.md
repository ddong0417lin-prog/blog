# Notion Blog

一个基于 Notion 作为 CMS 的现代博客系统，使用 Next.js 构建并部署在 Vercel 上。

## 技术栈

- **框架**: [Next.js 14](https://nextjs.org/) (App Router)
- **CMS**: [Notion](https://www.notion.so/)
- **部署**: [Vercel](https://vercel.com/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **搜索**: [FlexSearch](https://github.com/nextapps-de/flexsearch)
- **评论**: [Giscus](https://giscus.app/) (基于 GitHub Discussions)
- **缓存**: [Upstash Redis](https://upstash.com/)

## 功能特性

- 使用 Notion 作为内容管理系统
- 静态生成 (SSG) + 增量静态再生成 (ISR)
- 全文搜索功能
- 暗黑模式支持
- 代码语法高亮 (Shiki)
- 响应式设计
- SEO 优化
- 点赞功能 (基于 Upstash Redis)
- 评论系统 (Giscus)
- 性能监控 (Vercel Analytics + Speed Insights)

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd blog
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写必要的配置：

```bash
cp .env.example .env.local
```

### 4. 获取 Notion API Token

1. 访问 [Notion Integrations](https://www.notion.so/my-integrations)
2. 创建一个新的 Integration，获取 `NOTION_TOKEN`
3. 在你的 Notion 数据库页面，点击右上角 "..." -> "Add connections" -> 选择你的 Integration

### 5. 获取数据库 ID

打开你的 Notion 数据库页面，URL 格式为：
```
https://www.notion.so/{workspace}/{database_id}?v={view_id}
```
其中 `database_id` 就是 `NOTION_DATABASE_ID`。

### 6. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 查看效果。

## 项目结构

```
blog/
├── contracts/          # 契约定义 (类型、接口)
│   ├── types.ts       # TypeScript 类型定义
│   └── service-interface.ts  # Service 接口
├── modules/            # 模块目录
│   ├── content-source/  # Notion API 封装
│   ├── content-domain/  # 业务逻辑层
│   ├── web-ui/         # UI 组件和页面
│   ├── search/         # 搜索功能
│   └── interaction/    # 交互功能 (评论、点赞)
├── app/               # Next.js App Router
├── public/            # 静态资源
└── styles/            # 全局样式
```

## 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `NOTION_TOKEN` | ✅ | Notion Integration Token |
| `NOTION_DATABASE_ID` | ✅ | Notion 数据库 ID |
| `UPSTASH_REDIS_REST_URL` | ❌ | Upstash Redis URL (点赞功能) |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | Upstash Redis Token (点赞功能) |
| `NEXT_PUBLIC_GISCUS_*` | ❌ | Giscus 评论配置 |

## 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com/) 导入项目
3. 配置环境变量
4. 点击部署

## 开发指南

详细的实施计划请查看 [Implement.md](./Implement.md)。

## 许可证

MIT