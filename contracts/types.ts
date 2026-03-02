/**
 * ============================================================================
 * Phase -1: 契约冻结 - TypeScript 类型定义
 * ============================================================================
 *
 * 本文件定义所有模块间共享的核心类型
 * 任何修改需经过所有模块维护者评审
 *
 * @version 1.0.0
 * @frozen true
 * ============================================================================
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 文章状态枚举
 * 注：SCHEDULED 状态在 v1.1 版本支持，当前版本仅使用 PUBLISHED/DRAFT
 */
export enum PostStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  // SCHEDULED = 'scheduled', // v1.1 支持定时发布
}

/**
 * Notion 块类型（简化版）
 * 实际实现时需与 @notionhq/client 类型对齐
 */
export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'to_do'
  | 'quote'
  | 'code'
  | 'image'
  | 'divider'
  | 'bookmark'
  | 'embed'
  | 'callout';

/**
 * 内容块接口
 */
export interface Block {
  id: string;
  type: BlockType;
  content: string;
  children?: Block[];
  props?: Record<string, unknown>;
}

/**
 * 目录项接口
 */
export interface TocItem {
  id: string;
  text: string;
  level: number;
  slug: string;
}

// ============================================================================
// 文章类型
// ============================================================================

/**
 * 文章摘要 - 用于列表页、搜索页
 * 轻量级，不包含完整内容
 *
 * 使用场景：
 * - 首页文章列表
 * - 标签/分类筛选页
 * - 搜索结果页
 * - RSS Feed
 */
export interface PostSummary {
  /** Notion page id */
  id: string;

  /** URL 友好的唯一标识 */
  slug: string;

  /** 文章标题 */
  title: string;

  /** 摘要或前200字 */
  excerpt: string;

  /** 封面图片 URL */
  coverImage?: string;

  /** 标签列表 */
  tags: string[];

  /** 分类名称 */
  category: string;

  /**
   * 发布时间（ISO 8601 字符串，如 2026-03-02T10:00:00.000Z）
   * - PUBLISHED 状态：必填
   * - DRAFT 状态：可能为 null（未设置发布时间）
   */
  publishedAt: string | null;

  /** 最后更新时间（ISO 8601 字符串） */
  updatedAt: string;

  /** 阅读时长（分钟） */
  readingTime: number;

  /** 文章状态 */
  status: PostStatus;
}

/**
 * 文章详情 - 用于详情页
 * 继承摘要，包含完整内容
 *
 * 使用场景：
 * - 文章详情页
 * - SEO 元数据生成
 * - 内容导出功能
 */
export interface PostDetail extends PostSummary {
  /** 结构化内容块 */
  content: Block[];

  /** Markdown/HTML 原文（用于 SEO/导出） */
  rawContent: string;

  /** 文章目录 */
  toc: TocItem[];
}

// ============================================================================
// 元数据类型
// ============================================================================

/**
 * 标签
 */
export interface Tag {
  /** 标签名称 */
  name: string;

  /** URL 友好的标识 */
  slug: string;

  /** 文章数量 */
  count: number;
}

/**
 * 分类
 */
export interface Category {
  /** 分类名称 */
  name: string;

  /** URL 友好的标识 */
  slug: string;

  /** 文章数量 */
  count: number;
}

// ============================================================================
// 查询参数类型
// ============================================================================

/**
 * 列表查询选项 - 使用游标分页
 * 适用于 Notion API 等游标式数据源
 */
export interface ListOptions {
  /** 每页数量，默认 10，最大 50 */
  pageSize?: number;

  /** 排序字段 */
  sortBy?: 'publishedAt' | 'updatedAt' | 'title';

  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';

  /** 游标（首次查询不传，后续使用上次返回的 nextCursor） */
  startCursor?: string;
}

/**
 * 分页结果 - 游标分页
 */
export interface PaginatedResult<T> {
  /** 当前页数据 */
  data: T[];

  /** 是否有更多数据 */
  hasMore: boolean;

  /** 下一页游标（hasMore 为 true 时存在） */
  nextCursor?: string;

  /** 总数量（可能为 null，如果数据源不支持） */
  total?: number;
}

// ============================================================================
// 搜索相关类型
// ============================================================================

/**
 * 搜索文档（用于 FlexSearch 索引）
 */
export interface SearchDocument {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
}

/**
 * 搜索结果
 */
export interface SearchResult extends SearchDocument {
  /** 匹配分数 */
  score?: number;
}

// ============================================================================
// 互动相关类型
// ============================================================================

/**
 * 点赞响应
 */
export interface LikeResponse {
  success: boolean;
  count: number;
  liked: boolean;
}

/**
 * 点赞错误
 */
export interface LikeError {
  error: string;
  resetTime?: number;
}

/**
 * 限流信息
 */
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// ============================================================================
// 缓存相关类型
// ============================================================================

/**
 * 缓存层级
 */
export type CacheTier = 'memory' | 'edge' | 'origin';

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 业务错误码
 */
export enum ErrorCode {
  // 内容相关
  POST_NOT_FOUND = 'POST_NOT_FOUND',
  INVALID_SLUG = 'INVALID_SLUG',

  // API 相关
  RATE_LIMITED = 'RATE_LIMITED',
  ALREADY_LIKED = 'ALREADY_LIKED',
  NOT_LIKED = 'NOT_LIKED',

  // 系统相关
  CACHE_ERROR = 'CACHE_ERROR',
  NOTION_API_ERROR = 'NOTION_API_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * 应用错误
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  recoverable: boolean;
}

// ============================================================================
// 类型导出
// ============================================================================

/** 兼容旧代码的 Post 别名 */
export type Post = PostDetail;
