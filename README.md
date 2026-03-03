# Notion Blog 部署指南（最新版）

这是一个用 **Next.js + Notion API** 搭的个人博客项目。  
目标很简单：你在 Notion 写文章，网站自动读取并展示。

这份文档按当前代码整理，适合第一次部署的同学。

---

## 1. 先准备账号

- GitHub
- Notion
- Vercel（可以直接用 GitHub 登录）

---

## 2. 在 Notion 建好数据库

新建一个表格数据库，然后把字段名改成下面这些（名字要一致）：

| 字段名 | 类型 | 必需 | 用途 |
|---|---|---|---|
| `标题` | Title | 是 | 文章标题 |
| `日期` | Date | 建议 | 发布时间（为空时会回退到创建时间） |
| `类型` | Select | 建议 | 分类 |
| `标签` | Multi-select | 建议 | 标签 |
| `状态` | Status | 建议 | 发布状态 |
| `摘要` | Rich text | 否 | 列表摘要 |
| `Slug` | Rich text | 否 | 文章链接名（可不填） |

`状态` 里下面这些值会被当作“已发布”：

- `Published`
- `published`
- `已发布`
- `发布`
- `公开`

兼容旧字段：如果你有 `Published`（checkbox）并且为 `true`，也会被识别为已发布。

---

## 3. 把 Integration 连接到这个数据库

这一步最容易漏，漏了会直接 `object_not_found`。

1. 打开你的数据库页面
2. 点右上角 `Share`（共享）或 `...`
3. 找到 `Add connections`（添加连接）
4. 选择你创建的 Notion Integration

---

## 4. 获取 Notion Token 和 Database ID

### 4.1 Token

去 <https://www.notion.so/my-integrations> 创建内部 Integration，复制 `ntn_` 开头的 Token。

### 4.2 Database ID

数据库页面 URL 形如：

```text
https://www.notion.so/<workspace>/<database_id>?v=<view_id>
```

- `<database_id>` 就是 `NOTION_DATABASE_ID`
- `?v=` 后面那个不是数据库 ID

### 4.3 Data Source ID（可选）

当前代码支持两种方式：

- 新手推荐：只配 `NOTION_DATABASE_ID` + `NOTION_ID_KIND=database`
- 进阶方式：直接配置 `NOTION_DATA_SOURCE_ID`（配置后优先使用它）

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

# 可选（如果你已经拿到 data_source_id）
# NOTION_DATA_SOURCE_ID=你的DataSourceID

# 可选：点赞
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# 可选：评论（Giscus）
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

启动开发环境：

```bash
npm run dev
```

上线前先本地构建：

```bash
npm run build
```

---

## 6. 部署到 Vercel

1. 在 Vercel 导入 GitHub 仓库
2. 在项目环境变量里填写：
   - 必填：`NOTION_TOKEN`、`NOTION_DATABASE_ID`
   - 建议：`NOTION_ID_KIND=database`
   - 可选：`NOTION_DATA_SOURCE_ID`、`UPSTASH_*`、`NEXT_PUBLIC_GISCUS_*`
3. 点击 Deploy

注意：Vercel 不会读取你本机 `.env.local`，必须在 Vercel 控制台单独配置。

---

## 7. 常见问题（按出现频率）

### 1) 首页显示“暂无文章”

优先检查：

- 文章 `状态` 是否是已发布值（如 `已发布` / `Published`）
- Integration 是否连接到了数据库
- Vercel 环境变量是否填在正确项目、正确环境（Production / Preview）

### 2) 报错：`Missing required environment variables`

说明 Vercel 缺变量。去项目设置补齐后重新部署。

### 3) 报错：`object_not_found`

几乎都是 Notion 连接权限问题。回到数据库页面重新 `Add connections`。

### 4) 报错：`Could not find property with name or id`

数据库字段名不匹配。按本 README 的字段名逐个核对，尤其是：

- `标题`
- `类型`
- `标签`
- `状态`
- `日期`

### 5) 换了数据库但还是读到旧内容

通常是 `NOTION_DATA_SOURCE_ID` 还指向旧库。  
更新它，或者暂时删除它，只保留：

- `NOTION_DATABASE_ID`
- `NOTION_ID_KIND=database`

---

## 8. 功能开关说明

- 评论（Giscus）：不配变量就不显示评论区
- 点赞（Upstash）：不配变量会降级为无持久化行为
- 搜索：内置可用

---

## 9. License

MIT
