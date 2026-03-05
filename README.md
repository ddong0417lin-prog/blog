# Notion Blog（新手部署版）

一个基于 **Next.js + Notion API** 的个人博客模板。  
你只需要在 Notion 写文章，网站会自动读取并展示。

- 博客示例：[https://blog-three-gilt-7yh9tj7yxv.vercel.app/](https://blog-three-gilt-7yh9tj7yxv.vercel.app/)
- 代码仓库：[https://github.com/ddong0417lin-prog/blog](https://github.com/ddong0417lin-prog/blog)

---

## 这份文档适合谁

适合第一次做博客、不会后端的新手。  
你按顺序做完下面 6 步，就能把自己的博客跑起来并部署到 Vercel。

---

## 1. 先准备账号

你需要 3 个账号：

1. GitHub（托管代码）
2. Notion（写文章）
3. Vercel（部署网站）

可选：

1. Upstash Redis（点赞/访客统计）
2. Giscus（评论）

---

## 2. 在 Notion 建文章数据库

新建一个数据库（表格视图），字段建议如下：

| 字段名 | 类型 | 说明 |
|---|---|---|
| 标题 | Title | 文章标题（必填） |
| 日期 | Date | 发布时间（建议） |
| 类型 | Select | 分类（建议） |
| 标签 | Multi-select | 标签（建议） |
| 状态 | Status | 发布状态（建议） |
| 摘要 | Rich text | 列表摘要（可选） |
| Slug | Rich text | 自定义链接（可选） |

### 状态字段如何算“已发布”

以下值会被识别为已发布：

- `Published`
- `published`
- `已发布`
- `发布`
- `公开`

> 你最容易漏的步骤：一定要把 Integration 连接到这个数据库（Share / Add connections）。

---

## 3. 获取 Notion 配置

### 3.1 获取 `NOTION_TOKEN`

在 Notion Integrations 页面创建 Internal Integration：  
[https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)

复制以 `ntn_` 开头的 token。

### 3.2 获取 `NOTION_DATABASE_ID`

打开数据库页面 URL：

```text
https://www.notion.so/<workspace>/<database_id>?v=<view_id>
```

`<database_id>` 这段就是 `NOTION_DATABASE_ID`。

### 3.3 `NOTION_DATA_SOURCE_ID` 要不要填

新手建议先不填，只用：

- `NOTION_DATABASE_ID`
- `NOTION_ID_KIND=database`

---

## 4. 本地跑起来

```bash
git clone https://github.com/ddong0417lin-prog/blog.git
cd blog
npm install
```

复制环境变量模板：

```bash
cp .env.example .env.local
```

然后编辑 `.env.local`，至少填这三项：

```env
NOTION_TOKEN=你的NotionToken
NOTION_DATABASE_ID=你的DatabaseID
NOTION_ID_KIND=database
```

启动开发环境：

```bash
npm run dev
```

浏览器打开：

- `http://localhost:3000`

上线前先检查构建：

```bash
npm run build
```

---

## 5. 部署到 Vercel

1. 在 Vercel 导入 GitHub 仓库
2. 在项目 Environment Variables 里填写变量（至少填必填项）
3. 点击 Deploy

必填：

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

建议：

- `NOTION_ID_KIND=database`

可选：

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_GISCUS_*`

> 注意：Vercel 不会读取你本地 `.env.local`，必须在 Vercel 控制台单独配置。

---

## 6. 发布第一篇文章

1. 在 Notion 数据库新增一条记录
2. 填好 `标题`、`日期`、`类型`、`标签`
3. 把 `状态` 改成 `已发布` / `Published`
4. 等待缓存刷新（默认有缓存）或重新部署一次

---

## 当前支持的核心功能

- 首页三栏：最新文章、最多点赞、最多阅读
- 热度页：支持“点赞榜 / 阅读榜”
- 归档页：按年、月筛选
- 分类页、标签页
- 搜索（`Ctrl + K`）
- 点赞与访客统计（Upstash）
- 评论（Giscus，可选）
- 明暗主题切换

---

## 常见问题（新手高频）

### 1）首页显示“暂无文章”

优先检查：

1. 文章 `状态` 是否是已发布
2. Integration 是否连到了正确数据库
3. Vercel 环境变量是否填在正确项目

### 2）报错：缺少 `NOTION_TOKEN` / `NOTION_DATABASE_ID`

说明 Vercel 环境变量没配好，补齐后重新部署。

### 3）报错：`object_not_found`

一般是数据库没授权给 Integration，回 Notion 重新 Add connections。

### 4）报错：`Could not find property with name or id`

数据库字段名和项目映射不一致。优先把字段改成文档里的中文字段名。

### 5）点赞/访客统计不生效

检查：

1. `UPSTASH_REDIS_REST_URL` 是否是 `*.upstash.io` 的 REST 地址
2. `UPSTASH_REDIS_REST_TOKEN` 是否正确

---

## 给新手的建议

- 先只配 Notion 三个必填变量，跑通“文章展示”
- 再加 Upstash（点赞/访客）
- 最后再接 Giscus（评论）

这样排查最省时间。

---

## License

MIT
