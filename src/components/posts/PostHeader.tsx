import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { PostDetail } from '@/contracts/types';

interface PostHeaderProps {
  post: PostDetail;
}

export function PostHeader({ post }: PostHeaderProps) {
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '未发布';

  return (
    <header className="mb-8">
      {/* 分类 */}
      <Link
        href={`/categories/${encodeURIComponent(post.category)}`}
        className="inline-block mb-4"
      >
        <Badge variant="secondary" className="hover:bg-secondary/80">
          {post.category}
        </Badge>
      </Link>

      {/* 标题 */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
        {post.title}
      </h1>

      {/* 摘要 */}
      <p className="text-lg text-muted-foreground mb-6">
        {post.excerpt}
      </p>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
        <time dateTime={post.publishedAt || undefined}>{formattedDate}</time>
        <span>·</span>
        <span>{post.readingTime} 分钟阅读</span>
        {post.updatedAt !== post.publishedAt && (
          <>
            <span>·</span>
            <span>更新于 {new Date(post.updatedAt).toLocaleDateString('zh-CN')}</span>
          </>
        )}
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {post.tags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
          >
            <Badge variant="outline" className="hover:bg-accent">
              {tag}
            </Badge>
          </Link>
        ))}
      </div>

      {/* 封面图 */}
      {post.coverImage && (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-8">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </header>
  );
}