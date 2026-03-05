'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dispatchFlowerBurst } from '@/components/effects/fx-events';
import { getOrCreateVisitorId } from '@/lib/client-visitor-id';

interface LikeResponse {
  count: number;
  hasLiked: boolean;
  enabled: boolean;
}

interface LikeButtonProps {
  slug: string;
  initialCount?: number;
}

function getLocalStorageKey(slug: string): string {
  return `blog:liked:${slug}`;
}

function getLocalLiked(slug: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getLocalStorageKey(slug)) === 'true';
}

function setLocalLiked(slug: string, liked: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getLocalStorageKey(slug), String(liked));
}

export function LikeButton({ slug, initialCount = 0 }: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [pulse, setPulse] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function fetchLikeStatus() {
      try {
        const visitorId = getOrCreateVisitorId();
        const response = await fetch(
          `/api/like?slug=${encodeURIComponent(slug)}&visitorId=${encodeURIComponent(visitorId)}`
        );
        if (!response.ok) return;
        const data: LikeResponse = await response.json();
        setCount(data.count);
        setIsEnabled(data.enabled);

        if (!data.hasLiked) {
          setHasLiked(getLocalLiked(slug));
        } else {
          setHasLiked(true);
        }
      } catch (error) {
        console.error('Failed to fetch like status:', error);
      }
    }

    fetchLikeStatus();
  }, [slug]);

  const triggerFlower = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    dispatchFlowerBurst({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setPulse(true);
    window.setTimeout(() => setPulse(false), 220);
  }, []);

  const handleLike = useCallback(async () => {
    if (hasLiked || isLoading || !isEnabled) return;

    setIsLoading(true);

    try {
      const visitorId = getOrCreateVisitorId();
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-visitor-id': visitorId,
        },
        body: JSON.stringify({ slug, visitorId }),
      });

      if (!response.ok) return;
      const result = await response.json();

      setCount(result.count ?? count);
      setHasLiked(true);
      setLocalLiked(slug, true);
      triggerFlower();
    } catch (error) {
      console.error('Failed to like:', error);
    } finally {
      setIsLoading(false);
    }
  }, [slug, hasLiked, isLoading, isEnabled, triggerFlower, count]);

  if (!isEnabled) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Heart className="h-5 w-5" />
        <span className="text-sm">���޹���δ����</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className={cn(
          'gap-2 rounded-full border border-border/80 bg-card px-4 transition-all hover:bg-accent',
          pulse && 'scale-105',
          hasLiked && 'text-red-500 hover:text-red-600'
        )}
        onClick={handleLike}
        disabled={hasLiked || isLoading}
        data-interactive="true"
      >
        <Heart className={cn('h-5 w-5 transition-all', hasLiked && 'fill-current')} />
        <span className={cn('font-medium transition-transform', pulse && 'scale-110')}>{count}</span>
      </Button>
      <span className="text-sm text-muted-foreground">{hasLiked ? '������һ��С�컨' : '�����'}</span>
    </div>
  );
}

export function LikeButtonSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-2">
      <div className="h-9 w-16 rounded-full bg-muted" />
      <div className="h-4 w-10 rounded bg-muted" />
    </div>
  );
}