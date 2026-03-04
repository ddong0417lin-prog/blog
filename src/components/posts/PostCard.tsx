import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { PostSummary } from '@/contracts/types';

interface PostCardProps {
  post: PostSummary;
}

export function PostCard({ post }: PostCardProps) {
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '未发布';

  return (
    <Link
      href={`/posts/${encodeURIComponent(post.id)}`}
      className="group block rounded-2xl border border-border/80 bg-card/80 p-3 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_hsl(var(--foreground)/0.12)]"
      data-interactive="true"
    >
      {post.coverImage && (
        <div className="mb-4 aspect-video overflow-hidden rounded-xl">
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      <div className="px-2 pb-2">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {post.category}
          </Badge>
          {post.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <h3 className="mb-2 line-clamp-2 text-2xl font-semibold leading-tight">{post.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <time dateTime={post.publishedAt || undefined}>{formattedDate}</time>
          <span>{post.readingTime} 分钟阅读</span>
        </div>
      </div>
    </Link>
  );
}
