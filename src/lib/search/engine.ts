/**
 * ============================================================================
 * FlexSearch 搜索引擎
 * ============================================================================
 *
 * 客户端全文搜索索引，支持标题、摘要、标签搜索
 *
 * @version 1.0.0
 * ============================================================================
 */

import type { SearchDocument, SearchResult } from '@/contracts/types';
import type { FlexSearchIndex, SearchItem, SearchOptions } from './types';

// FlexSearch 动态导入（仅客户端）
let FlexSearch: any = null;

/**
 * 创建 FlexSearch 索引实例
 */
async function createFlexSearchIndex(): Promise<FlexSearchIndex> {
  if (typeof window === 'undefined') {
    // 服务端返回空实现
    return {
      add: () => {},
      search: () => [],
      clear: () => {},
    };
  }

  if (!FlexSearch) {
    // 动态导入 FlexSearch
    const module = await import('flexsearch');
    FlexSearch = module.default || module;
  }

  // 创建索引配置
  // @ts-ignore - FlexSearch 类型定义不完整
  const index = new FlexSearch.Document({
    tokenize: 'forward',
    charset: 'latin:extra',
    document: {
      id: 'id',
      index: ['title', 'excerpt', 'tags', 'category'],
    },
  });

  return {
    add: (id: string, doc: SearchDocument) => {
      index.add(id, doc);
    },
    search: (query: string, options?: SearchOptions) => {
      const limit = options?.limit || 10;

      try {
        // FlexSearch Document 索引搜索
        const results = index.search(query, { limit });

        // 合并结果并去重
        const resultMap = new Map<string, SearchResult>();

        results.forEach((result: any) => {
          result.result.forEach((id: string) => {
            if (!resultMap.has(id)) {
              resultMap.set(id, {
                id,
                slug: '',
                title: '',
                excerpt: '',
                tags: [],
                category: '',
                score: result.score || 1,
              });
            }
          });
        });

        return Array.from(resultMap.values());
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    clear: () => {
      index.clear();
    },
  };
}

/**
 * 搜索索引管理器
 */
class SearchIndexManager {
  private index: FlexSearchIndex | null = null;
  private documents: Map<string, SearchDocument> = new Map();
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  /**
   * 初始化索引
   */
  async initialize(documents: SearchDocument[]): Promise<void> {
    // 避免重复初始化
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // 创建索引
        this.index = await createFlexSearchIndex();

        // 清空旧数据
        this.documents.clear();

        // 添加文档
        for (const doc of documents) {
          this.documents.set(doc.id, doc);
          this.index.add(doc.id, doc);
        }

        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize search index:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.index !== null;
  }

  /**
   * 搜索文档
   */
  async search(query: string, options?: SearchOptions): Promise<SearchItem[]> {
    if (!this.index || !this.isInitialized) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return [];
    }

    // 执行搜索
    const rawResults = this.index.search(normalizedQuery, {
      limit: options?.limit || 10,
      score: true,
    });

    // 转换结果并补充完整信息
    const items: SearchItem[] = [];

    for (const result of rawResults) {
      const doc = this.documents.get(result.id);
      if (!doc) continue;

      // 计算匹配字段
      const matchedFields: string[] = [];
      const queryTerms = normalizedQuery.split(/\s+/);

      // 检查标题匹配
      const titleLower = doc.title.toLowerCase();
      if (queryTerms.some((term) => titleLower.includes(term))) {
        matchedFields.push('title');
      }

      // 检查摘要匹配
      const excerptLower = doc.excerpt.toLowerCase();
      if (queryTerms.some((term) => excerptLower.includes(term))) {
        matchedFields.push('excerpt');
      }

      // 检查标签匹配
      if (doc.tags.some((tag) => queryTerms.some((term) => tag.toLowerCase().includes(term)))) {
        matchedFields.push('tags');
      }

      // 检查分类匹配
      if (queryTerms.some((term) => doc.category.toLowerCase().includes(term))) {
        matchedFields.push('category');
      }

      items.push({
        ...doc,
        slug: doc.slug,
        score: result.score,
        highlightedTitle: this.highlightText(doc.title, queryTerms),
        highlightedExcerpt: this.highlightText(doc.excerpt, queryTerms, 150),
        matchedFields,
      });
    }

    return items;
  }

  /**
   * 高亮文本中的匹配词
   */
  private highlightText(text: string, terms: string[], maxLength?: number): string {
    let result = text;

    // 截断文本（如果需要）
    if (maxLength && result.length > maxLength) {
      // 尝试在匹配词附近截断
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
      if (term.length < 2) continue; // 跳过太短的词

      const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
      result = result.replace(regex, '**$1**');
    }

    return result;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 清空索引
   */
  clear(): void {
    if (this.index) {
      this.index.clear();
    }
    this.documents.clear();
    this.isInitialized = false;
    this.initPromise = null;
  }
}

// 导出单例
export const searchIndex = new SearchIndexManager();

// 类型导出
export type { SearchDocument, SearchResult };