/**
 * ============================================================================
 * Post 相关类型定义
 * ============================================================================
 *
 * 从契约层重新导出 PostSummary, PostDetail 等类型
 * 本模块不重新定义类型，仅做重新导出
 *
 * @version 1.0.0
 * ============================================================================
 */

export type {
  PostSummary,
  PostDetail,
  Post,
  ListOptions,
  PaginatedResult,
} from '@/contracts/types';

export { PostStatus } from '@/contracts/types';