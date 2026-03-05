import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { PostDetail } from '@/contracts/types';

interface PostHeaderProps {
  post: PostDetail;
  viewCount?: number;
}

export function PostHeader({ post, viewCount = 0 }: PostHeaderProps) {
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '未发布';

  return (
    <header className="paper-card mb-8 p-6 md:p-8">
      <Link
        href={`/categories/${encodeURIComponent(post.category)}`}
        className="mb-4 inline-block"
        data-interactive="true"
      >
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs tracking-wide">
          {post.category}
        </Badge>
      </Link>

      <h1 className="mb-4 text-4xl font-semibold leading-tight md:text-5xl">{post.title}</h1>
      <p className="mb-6 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
        {post.excerpt}
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <time dateTime={post.publishedAt || undefined}>{formattedDate}</time>
        <span>·</span>
        <span>{post.readingTime} 分钟阅读</span>
        <span>·</span>
        <span>👀 {viewCount}</span>
        {post.updatedAt !== post.publishedAt && (
          <>
            <span>·</span>
            <span>更新于 {new Date(post.updatedAt).toLocaleDateString('zh-CN')}</span>
          </>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`} data-interactive="true">
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs hover:bg-accent">
              {tag}
            </Badge>
          </Link>
        ))}
      </div>

      {post.coverImage && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}
    </header>
  );
}
