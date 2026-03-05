'use client';

import { useEffect, useRef, useState } from 'react';
import type { TocItem } from '@/contracts/types';

interface TableOfContentsProps {
  toc: TocItem[];
}

export function TableOfContents({ toc }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const clickLockUntilRef = useRef(0);

  useEffect(() => {
    const visibleHeadings = new Map<string, number>();

    const pickTopMostVisibleHeading = () => {
      if (visibleHeadings.size === 0) {
        return null;
      }

      let nextActiveId: string | null = null;
      let minTop = Number.POSITIVE_INFINITY;

      visibleHeadings.forEach((top, id) => {
        if (top < minTop) {
          minTop = top;
          nextActiveId = id;
        }
      });

      return nextActiveId;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < clickLockUntilRef.current) {
          return;
        }

        entries.forEach((entry) => {
          const headingId = entry.target.id;

          if (entry.isIntersecting) {
            visibleHeadings.set(headingId, entry.boundingClientRect.top);
          } else {
            visibleHeadings.delete(headingId);
          }
        });

        const nextActiveId = pickTopMostVisibleHeading();
        if (nextActiveId) {
          setActiveId(nextActiveId);
        }
      },
      {
        rootMargin: '-20% 0% -60% 0%',
        threshold: [0, 1],
      }
    );

    toc.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      clickLockUntilRef.current = Date.now() + 700;
      setActiveId(id);
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="space-y-2 max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
      <h4 className="font-semibold text-sm mb-4">Ŀ¼</h4>
      <ul className="space-y-2 text-sm">
        {toc.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => scrollToHeading(item.id)}
              className={`w-full text-left py-1 px-2 rounded transition-colors ${
                activeId === item.id
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              } ${item.level === 3 ? 'pl-4' : ''}`}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}