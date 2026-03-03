/**
 * ============================================================================
 * 搜索模块入口
 * ============================================================================
 *
 * 统一导出搜索模块的公开 API
 *
 * @version 1.0.0
 * ============================================================================
 */

// 引擎
export { searchIndex } from './engine';

// 构建器
export { buildSearchIndex, searchDocuments } from './builder';

// 类型导出
export type {
  SearchIndexConfig,
  SearchItem,
  FlexSearchIndex,
  SearchOptions,
  SearchStatus,
  SearchContextValue,
} from './types';