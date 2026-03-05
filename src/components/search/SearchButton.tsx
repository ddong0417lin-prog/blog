'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchDialog } from './SearchDialog';

interface SearchButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
}

export function SearchButton({ variant = 'ghost', showLabel = false }: SearchButtonProps) {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  return (
    <>
      <Button
        variant={variant}
        size={showLabel ? 'default' : 'icon'}
        onClick={() => setOpen(true)}
        className="relative gap-2"
        aria-label="搜索"
      >
        <Search className="h-4 w-4" />
        {showLabel && <span>搜索</span>}
        {!showLabel && (
          <div className="pointer-events-none absolute right-1.5 top-1.5 hidden select-none items-center gap-1 sm:flex">
            <kbd className="h-5 rounded border bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground/90">
              {isMac ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="h-5 rounded border bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground/90">
              K
            </kbd>
          </div>
        )}
      </Button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
