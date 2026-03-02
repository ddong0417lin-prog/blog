/**
 * ============================================================================
 * PostList 文章列表组件
 * ============================================================================
 *
 * 网格布局的文章列表，支持加载更多
 */

import { PostCard } from './PostCard';
import type { PostSummary } from '@/contracts/types';

interface PostListProps {
  posts: PostSummary[];
  hasMore?: boolean;
  nextCursor?: string;
}

export function PostList({ posts, hasMore, nextCursor }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">暂无文章</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 文章网格 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && nextCursor && (
        <div className="flex justify-center">
          <a
            href={`?startCursor=${nextCursor}`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            加载更多
          </a>
        </div>
      )}
    </div>
  );
}