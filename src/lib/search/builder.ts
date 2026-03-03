/**
 * ============================================================================
 * 搜索索引构建器
 * ============================================================================
 *
 * 从 content-domain 获取文章数据并构建搜索索引
 *
 * @version 1.0.0
 * ============================================================================
 */

import type { SearchDocument } from '@/contracts/types';
import { postService } from '@/lib/content';
import { searchIndex } from './index';

/**
 * 构建搜索索引
 * 从 Notion 获取所有已发布文章并添加到搜索索引
 */
export async function buildSearchIndex(): Promise<void> {
  try {
    // 获取所有已发布文章
    const posts = await postService.getAllPublishedPosts();

    // 转换为搜索文档
    const documents: SearchDocument[] = posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      tags: post.tags,
      category: post.category,
    }));

    // 初始化索引
    await searchIndex.initialize(documents);

    console.log(`[Search] Index built with ${documents.length} documents`);
  } catch (error) {
    console.error('[Search] Failed to build search index:', error);
    throw error;
  }
}

/**
 * 搜索文档
 */
export async function searchDocuments(query: string, limit: number = 10) {
  if (!searchIndex.isReady()) {
    // 如果索引未就绪，尝试构建
    await buildSearchIndex();
  }

  return searchIndex.search(query, { limit });
}