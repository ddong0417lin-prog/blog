import type { SearchDocument, SearchResult } from '@/contracts/types';
import type { FlexSearchIndex, SearchItem, SearchOptions } from './types';

let FlexSearch: any = null;

async function createFlexSearchIndex(): Promise<FlexSearchIndex> {
  if (typeof window === 'undefined') {
    return {
      add: () => {},
      search: () => [],
      clear: () => {},
    };
  }

  if (!FlexSearch) {
    const flexsearchModule = await import('flexsearch');
    FlexSearch = flexsearchModule.default || flexsearchModule;
  }

  // @ts-ignore FlexSearch runtime type is dynamic.
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
        const results = index.search(query, { limit });
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

class SearchIndexManager {
  private index: FlexSearchIndex | null = null;
  private documents: Map<string, SearchDocument> = new Map();
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  async initialize(documents: SearchDocument[]): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.index = await createFlexSearchIndex();
        this.documents.clear();

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

  isReady(): boolean {
    return this.isInitialized && this.index !== null;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchItem[]> {
    if (!this.index || !this.isInitialized) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return [];
    }

    const rawResults = this.index.search(normalizedQuery, {
      limit: options?.limit || 10,
      score: true,
    });

    const items: SearchItem[] = [];

    for (const result of rawResults) {
      const doc = this.documents.get(result.id);
      if (!doc) {
        continue;
      }

      const matchedFields: string[] = [];
      const queryTerms = normalizedQuery.split(/\s+/);

      const titleLower = doc.title.toLowerCase();
      if (queryTerms.some((term) => titleLower.includes(term))) {
        matchedFields.push('title');
      }

      const excerptLower = doc.excerpt.toLowerCase();
      if (queryTerms.some((term) => excerptLower.includes(term))) {
        matchedFields.push('excerpt');
      }

      if (doc.tags.some((tag) => queryTerms.some((term) => tag.toLowerCase().includes(term)))) {
        matchedFields.push('tags');
      }

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

  private highlightText(text: string, terms: string[], maxLength?: number): string {
    let result = text;

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

    for (const term of terms) {
      if (term.length < 2) {
        continue;
      }

      const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
      result = result.replace(regex, '**$1**');
    }

    return result;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  clear(): void {
    if (this.index) {
      this.index.clear();
    }

    this.documents.clear();
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const searchIndex = new SearchIndexManager();

export type { SearchDocument, SearchResult };
