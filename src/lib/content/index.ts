/**
 * ============================================================================
 * Content Domain Module Entry
 * ============================================================================
 *
 * 统一导出 content 模块的公开 API
 */

// Service
export { postService, PostServiceImpl } from './services/post-service';

// Types (re-export from contracts)
export type {
  PostSummary,
  PostDetail,
  Tag,
  Category,
  ListOptions,
  PaginatedResult,
  PostStatus,
} from '@/contracts/types';

// Utils
export { generateSlug, resolveSlugConflict, isValidSlug, generateUniqueSlug, cleanSlug } from './utils/slug';
export { filterPublishedPosts, filterPostsByTag, filterPostsByCategory } from './utils/filter';
export { sortPosts } from './utils/sort';
export { extractTags, extractCategories } from './utils/stats';
export { calculateReadingTime } from './utils/reading-time';

// Transformers
export {
  transformToPostSummary,
  transformToPostDetail,
  transformToPostSummaries,
} from './transformers/post-transformer';
export { transformBlockToInternal } from './transformers/block-transformer';
export {
  richTextToMarkdown,
  richTextToHtml,
  richTextToPlainText,
} from './transformers/rich-text-transformer';

// Types (internal)
export type { Block, BlockType, TocItem, ExtendedBlock } from './types/block';