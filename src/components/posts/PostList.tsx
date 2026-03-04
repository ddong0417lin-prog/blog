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
      <div className="rounded-2xl border border-dashed border-border/90 bg-muted/30 px-6 py-14 text-center">
        <p className="text-base text-muted-foreground">暂时还没有文章，写下第一篇吧。</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && nextCursor && (
        <div className="flex justify-center">
          <a
            href={`?startCursor=${nextCursor}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-accent"
            data-interactive="true"
          >
            加载更多
          </a>
        </div>
      )}
    </div>
  );
}

