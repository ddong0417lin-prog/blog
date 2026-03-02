/**
 * ============================================================================
 * PostCardSkeleton 文章卡片骨架屏
 * ============================================================================
 *
 * 文章加载时的骨架屏占位
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PostCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      {/* 封面图骨架 */}
      <Skeleton className="aspect-video w-full" />

      <CardHeader className="pb-2">
        {/* 标签骨架 */}
        <div className="flex gap-2 mb-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>

        {/* 标题骨架 */}
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>

      <CardContent>
        {/* 摘要骨架 */}
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-3" />

        {/* 元信息骨架 */}
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 多个骨架屏列表
 */
export function PostCardSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}