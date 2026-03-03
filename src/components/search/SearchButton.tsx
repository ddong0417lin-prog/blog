'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchDialog } from './SearchDialog';

interface SearchButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
}

export function SearchButton({ variant = 'ghost', showLabel = false }: SearchButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={showLabel ? 'default' : 'icon'}
        onClick={() => setOpen(true)}
        className="gap-2"
        aria-label="搜索"
      >
        <Search className="h-4 w-4" />
        {showLabel && <span>搜索</span>}
        {!showLabel && (
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </Button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}