'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  score: number;
  highlightedTitle?: string;
  highlightedExcerpt?: string;
}

interface SearchDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchDialog({ open: openProp, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(openProp ?? false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // 同步外部 open 状态
  useEffect(() => {
    if (openProp !== undefined) {
      setOpen(openProp);
    }
  }, [openProp]);

  // 快捷键监听 (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // ESC 关闭
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 搜索防抖 - 通过 API 调用
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Search failed:', error);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = useCallback(
    (slug: string) => {
      setOpen(false);
      setQuery('');
      router.push(`/posts/${slug}`);
    },
    [router]
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
      if (!newOpen) {
        setQuery('');
      }
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="搜索文章、标签、分类..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <CommandList>
            {query && !loading && results.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm">
                未找到相关文章
              </CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading="文章">
                {results.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.slug}
                    onSelect={() => handleSelect(item.slug)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="font-medium">
                        {highlightMatch(item.highlightedTitle || item.title)}
                      </div>
                      {item.highlightedExcerpt && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {highlightMatch(item.highlightedExcerpt)}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1">
                            {tag}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs px-1">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!query && (
              <CommandGroup heading="快捷键">
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">K</kbd> 打开搜索
                </div>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// 高亮匹配文本（解析 ** 包裹的内容）
function highlightMatch(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part.slice(2, -2)}
        </mark>
      );
    }
    return part;
  });
}