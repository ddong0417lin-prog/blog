/**
 * ============================================================================
 * 搜索 API 路由
 * ============================================================================
 *
 * 服务端搜索接口，避免客户端直接访问 Notion 数据源
 */

import { NextRequest, NextResponse } from 'next/server';
import { postService } from '@/lib/content';
import type { SearchDocument } from '@/contracts/types';

// 简单的内存缓存（避免频繁请求 Notion）
let cachedDocuments: SearchDocument[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟

/**
 * 获取搜索文档列表（带缓存）
 * @returns documents 和是否来自缓存的标志
 */
async function getSearchDocuments(): Promise<{
  documents: SearchDocument[];
  fromCache: boolean;
  error: Error | null;
}> {
  const now = Date.now();

  // 返回有效缓存
  if (cachedDocuments && now - cacheTime < CACHE_TTL) {
    return { documents: cachedDocuments, fromCache: true, error: null };
  }

  try {
    const posts = await postService.getAllPublishedPosts();

    cachedDocuments = posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      tags: post.tags,
      category: post.category,
    }));

    cacheTime = now;
    return { documents: cachedDocuments, fromCache: false, error: null };
  } catch (error) {
    console.error('[Search API] Failed to fetch documents:', error);
    // 返回缓存（如果有）或错误
    return {
      documents: cachedDocuments || [],
      fromCache: cachedDocuments !== null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * 简单的文本搜索（支持中文）
 */
function searchInDocuments(
  documents: SearchDocument[],
  query: string,
  limit: number = 10
): (SearchDocument & { score: number })[] {
  const normalizedQuery = query.toLowerCase().trim();
  const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

  if (queryTerms.length === 0) {
    return [];
  }

  const results: (SearchDocument & { score: number })[] = [];

  for (const doc of documents) {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const excerptLower = doc.excerpt.toLowerCase();
    const tagsLower = doc.tags.map(t => t.toLowerCase());
    const categoryLower = doc.category.toLowerCase();

    for (const term of queryTerms) {
      // 标题匹配（权重最高）
      if (titleLower.includes(term)) {
        score += 10;
        // 精确匹配额外加分
        if (titleLower === term) {
          score += 5;
        }
      }

      // 摘要匹配
      if (excerptLower.includes(term)) {
        score += 3;
      }

      // 标签匹配
      for (const tag of tagsLower) {
        if (tag.includes(term)) {
          score += 5;
          if (tag === term) {
            score += 3;
          }
        }
      }

      // 分类匹配
      if (categoryLower.includes(term)) {
        score += 4;
        if (categoryLower === term) {
          score += 2;
        }
      }
    }

    if (score > 0) {
      results.push({ ...doc, score });
    }
  }

  // 按分数排序并返回前 N 个
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * 高亮文本中的匹配词
 */
function highlightText(text: string, query: string, maxLength?: number): string {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  let result = text;

  // 截断文本（如果需要）
  if (maxLength && result.length > maxLength) {
    const lowerText = result.toLowerCase();
    let bestStart = 0;

    for (const term of terms) {
      const index = lowerText.indexOf(term);
      if (index !== -1) {
        bestStart = Math.max(0, index - 30);
        break;
      }
    }

    result = result.slice(bestStart, bestStart + maxLength);
    if (bestStart > 0) {
      result = '...' + result;
    }
    if (bestStart + maxLength < text.length) {
      result = result + '...';
    }
  }

  // 高亮匹配词
  for (const term of terms) {
    if (term.length < 2) continue;

    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    result = result.replace(regex, '**$1**');
  }

  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/search?q=query&limit=10
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const limitParam = searchParams.get('limit') || '10';

  // limit 参数边界校验 (1-50)
  let limit = parseInt(limitParam, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    limit = 10;
  } else if (limit > 50) {
    limit = 50;
  }

  if (!query.trim()) {
    return NextResponse.json({ results: [], total: 0 });
  }

  try {
    const { documents, fromCache, error } = await getSearchDocuments();

    // 如果数据源失败且没有缓存，返回 503
    if (error && !fromCache) {
      return NextResponse.json(
        {
          error: 'Service unavailable',
          message: 'Unable to fetch search data. Please try again later.',
          results: [],
        },
        { status: 503 }
      );
    }

    // 如果数据源失败但有缓存，继续使用缓存（降级）
    if (error && fromCache) {
      console.warn('[Search API] Using cached data due to upstream error');
    }

    const results = searchInDocuments(documents, query, limit);

    // 添加高亮文本
    const formattedResults = results.map((item) => ({
      ...item,
      highlightedTitle: highlightText(item.title, query),
      highlightedExcerpt: highlightText(item.excerpt, query, 150),
    }));

    return NextResponse.json({
      results: formattedResults,
      total: results.length,
      query,
      cached: fromCache,
    });
  } catch (error) {
    console.error('[Search API] Search failed:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}