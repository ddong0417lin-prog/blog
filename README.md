# Notion Blog（新版本部署指南）

一个基于 **Next.js + Notion API** 的个人博客项目，适合零基础快速上线到 Vercel。

本 README 已按当前代码更新（2026-03-03）：
- 使用 Notion 新 API（Database / Data Source）
- 默认读取中文字段（`标题`、`日期`、`类型`、`标签`、`状态`、`摘要`）
- `Slug` 字段可选（没有也能运行）

---

## 1. 你需要准备什么

- GitHub 账号
- Notion 账号
- Vercel 账号（可直接 GitHub 登录）

---

## 2. 先在 Notion 准备数据库

### 2.1 创建一个 Database

在 Notion 新建一个数据库（表格视图即可）。

### 2.2 字段必须按下面命名

> 当前代码里，标签和分类筛选是按字段名硬匹配的，请保持一致。

| 字段名 | 类型 | 是否必需 | 说明 |
|---|---|---|---|
| `标题` | Title | 必需 | 文章标题 |
| `日期` | Date | 建议 | 文章日期；为空时会回退到页面创建时间 |
| `类型` | Select | 建议 | 分类 |
| `标签` | Multi-select | 建议 | 标签 |
| `状态` | Status | 建议 | 发布状态 |
| `摘要` | Rich text | 可选 | 摘要；为空时会自动从正文提取 |
| `Slug` | Rich text | 可选 | URL slug；为空会自动根据标题生成 |

`状态` 字段中，以下值会被视为“已发布”：
- `Published`
- `published`
- `已发布`
- `发布`
- `公开`

兼容旧表：若有 `Published`（Checkbox）且为 `true`，也会被视为已发布。

### 2.3 把 Integration 连接到数据库

这是最容易漏的一步：
1. 打开数据库页面
2. 右上角 `...` 或 `Share`
3. `Add connections` / `连接到`
4. 选择你创建的 Integration

没连上会报 `object_not_found`。

---

## 3. 创建 Notion Integration 并拿 Token

1. 打开：<https://www.notion.so/my-integrations>
2. 新建 内部Integration
3. 复制 Token（通常是 `ntn_` 开头）

---

## 4. 获取 Database ID / Data Source ID

### 4.1 Database ID

打开数据库页面 URL，例如：

```text
https://www.notion.so/<workspace>/<database_id>?v=<view_id>
```

- `<database_id>` 就是 `NOTION_DATABASE_ID`
- `?v=` 后面是视图 ID，不是数据库 ID

### 4.2 Data Source ID（可选）

当前代码支持两种模式：

- 模式 A（推荐新手）：只配 `NOTION_DATABASE_ID`，并设置 `NOTION_ID_KIND=database`
- 模式 B：直接配 `NOTION_DATA_SOURCE_ID`（若设置了它，会优先生效）

> 如果你更换了数据库，记得同步更新或删除旧的 `NOTION_DATA_SOURCE_ID`，否则会读到旧库。

---

## 5. 本地运行

```bash
git clone <你的仓库地址>
cd blog
npm install
```

创建 `.env.local`：

```env
NOTION_TOKEN=你的NotionToken
NOTION_DATABASE_ID=你的DatabaseID
NOTION_ID_KIND=database

# 可选：如果你明确拿到了 data_source_id
# NOTION_DATA_SOURCE_ID=你的DataSourceID

# 可选：点赞功能
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# 可选：评论功能
NEXT_PUBLIC_GISCUS_REPO=
NEXT_PUBLIC_GISCUS_REPO_ID=
NEXT_PUBLIC_GISCUS_CATEGORY=Announcements
NEXT_PUBLIC_GISCUS_CATEGORY_ID=
NEXT_PUBLIC_GISCUS_MAPPING=pathname
NEXT_PUBLIC_GISCUS_REACTIONS_ENABLED=1
NEXT_PUBLIC_GISCUS_EMIT_METADATA=0
NEXT_PUBLIC_GISCUS_INPUT_POSITION=top
NEXT_PUBLIC_GISCUS_THEME=preferred_color_scheme
NEXT_PUBLIC_GISCUS_LANG=zh-CN
```

启动：

```bash
npm run dev
```

检查构建：

```bash
npm run build
```

---

## 6. 部署到 Vercel

### 6.1 导入仓库

在 Vercel 里导入你的 GitHub 仓库。

### 6.2 配置环境变量（Production/Preview 都建议配）

必填：
- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

建议：
- `NOTION_ID_KIND=database`

可选：
- `NOTION_DATA_SOURCE_ID`（若填了会优先使用）
- `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`
- 全部 `NEXT_PUBLIC_GISCUS_*`

> 注意：Vercel 不会读取你本地 `.env.local`，必须在 Vercel 控制台单独配置。

### 6.3 点击 Deploy

首次部署完成后，访问 Vercel 给你的域名检查页面是否正常。

---

## 7. 常见报错排查

### 7.1 `Missing required environment variables: NOTION_TOKEN, NOTION_DATABASE_ID`

原因：Vercel 没配置环境变量。

处理：到 Vercel 项目设置里补齐变量并重新部署。

### 7.2 `object_not_found`

原因：Integration 没有访问这个数据库。

处理：在 Notion 数据库页面把 Integration 添加到连接（Share/Add connections）。

### 7.3 `Could not find property with name or id: ...`

原因：数据库字段名和代码期望不一致。

处理：按本 README 的字段名建列，尤其是：
- `标题`
- `标签`
- `类型`
- `状态`
- `日期`
- `摘要`

### 7.4 切换数据库后内容仍是旧的

原因：`NOTION_DATA_SOURCE_ID` 还指向旧库。

处理：更新为新库的 Data Source ID，或先删除该变量并使用 `NOTION_ID_KIND=database`。

---

## 8. 功能说明

- 评论（Giscus）：可选，不配变量则不启用
- 点赞（Upstash Redis）：可选，不配变量则回退为无持久化/默认行为
- 搜索：内置客户端搜索

---

## 9. 许可证

MIT
