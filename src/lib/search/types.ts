/**
 * ============================================================================
 * 搜索模块类型定义
 * ============================================================================
 *
 * 定义搜索相关的类型接口
 *
 * @version 1.0.0
 * ============================================================================
 */

import type { SearchDocument, SearchResult } from '@/contracts/types';

/**
 * 搜索索引配置
 */
export interface SearchIndexConfig {
  /** 索引名称 */
  name: string;
  /** 是否区分大小写 */
  caseSensitive?: boolean;
}

/**
 * 搜索结果项（扩展自契约类型）
 */
export interface SearchItem extends SearchResult {
  /** 高亮的标题片段 */
  highlightedTitle?: string;
  /** 高亮的摘要片段 */
  highlightedExcerpt?: string;
  /** 匹配的字段 */
  matchedFields: string[];
}

/**
 * FlexSearch 索引实例类型
 */
export interface FlexSearchIndex {
  add: (id: string, doc: SearchDocument) => void;
  search: (query: string, options?: SearchOptions) => SearchResult[];
  clear: () => void;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 返回结果数量限制 */
  limit?: number;
  /** 是否返回分数 */
  score?: boolean;
}

/**
 * 搜索状态
 */
export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * 搜索上下文
 */
export interface SearchContextValue {
  /** 搜索状态 */
  status: SearchStatus;
  /** 搜索结果 */
  results: SearchItem[];
  /** 当前查询 */
  query: string;
  /** 执行搜索 */
  search: (query: string) => Promise<void>;
  /** 清空搜索 */
  clear: () => void;
}