import { PostCardSkeletonList } from '@/components/skeleton/PostCardSkeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* 标题骨架 */}
        <div className="h-10 bg-muted rounded w-3/4 mb-4" />
        <div className="h-4 bg-muted rounded w-1/2 mb-8" />

        {/* 内容骨架 */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}