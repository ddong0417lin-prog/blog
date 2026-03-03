'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 点赞响应类型
 */
interface LikeResponse {
  count: number;
  hasLiked: boolean;
  enabled: boolean;
}

/**
 * 点赞按钮组件属性
 */
interface LikeButtonProps {
  slug: string;
  initialCount?: number;
}

/**
 * 获取本地存储的点赞状态键
 */
function getLocalStorageKey(slug: string): string {
  return `blog:liked:${slug}`;
}

/**
 * 检查本地是否已点赞
 */
function getLocalLiked(slug: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getLocalStorageKey(slug)) === 'true';
}

/**
 * 设置本地点赞状态
 */
function setLocalLiked(slug: string, liked: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getLocalStorageKey(slug), String(liked));
}

/**
 * 点赞按钮组件
 */
export function LikeButton({ slug, initialCount = 0 }: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // 初始化：从 API 获取点赞状态
  useEffect(() => {
    async function fetchLikeStatus() {
      try {
        const response = await fetch(`/api/like?slug=${encodeURIComponent(slug)}`);
        if (response.ok) {
          const data: LikeResponse = await response.json();
          setCount(data.count);
          setIsEnabled(data.enabled);

          // 如果服务端显示未点赞，检查本地存储
          if (!data.hasLiked) {
            const localLiked = getLocalLiked(slug);
            setHasLiked(localLiked);
          } else {
            setHasLiked(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch like status:', error);
      }
    }

    fetchLikeStatus();
  }, [slug]);

  // 点赞处理
  const handleLike = useCallback(async () => {
    if (hasLiked || isLoading || !isEnabled) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success) {
          setCount(result.count);
          setHasLiked(true);
          setLocalLiked(slug, true);
        } else {
          // 已经点赞过了
          setCount(result.count);
          setHasLiked(true);
          setLocalLiked(slug, true);
        }
      }
    } catch (error) {
      console.error('Failed to like:', error);
    } finally {
      setIsLoading(false);
    }
  }, [slug, hasLiked, isLoading, isEnabled]);

  // 未启用时显示禁用状态
  if (!isEnabled) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Heart className="h-5 w-5" />
        <span className="text-sm">点赞功能未启用</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'gap-2 transition-all',
          hasLiked && 'text-red-500 hover:text-red-600'
        )}
        onClick={handleLike}
        disabled={hasLiked || isLoading}
      >
        <Heart
          className={cn(
            'h-5 w-5 transition-all',
            hasLiked && 'fill-current'
          )}
        />
        <span className="font-medium">{count}</span>
      </Button>
      <span className="text-sm text-muted-foreground">
        {hasLiked ? '已点赞' : '点赞'}
      </span>
    </div>
  );
}

/**
 * 点赞组件骨架屏
 */
export function LikeButtonSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="h-9 w-16 bg-muted rounded-md" />
      <div className="h-4 w-10 bg-muted rounded" />
    </div>
  );
}