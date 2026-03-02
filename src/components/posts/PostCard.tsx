/**
 * ============================================================================
 * PostCard 文章卡片组件
 * ============================================================================
 *
 * 显示单篇文章的摘要信息，用于列表页
 */

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PostSummary } from '@/contracts/types';

interface PostCardProps {
  post: PostSummary;
}

export function PostCard({ post }: PostCardProps) {
  // 格式化日期
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '未发布';

  return (
    <Link href={`/posts/${post.slug}`}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        {/* 封面图片 */}
        {post.coverImage && (
          <div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform hover:scale-105"
            />
          </div>
        )}

        <CardHeader className="pb-2">
          {/* 标签和分类 */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {post.category}
            </Badge>
            {post.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* 标题 */}
          <CardTitle className="line-clamp-2 text-lg font-bold">
            {post.title}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* 摘要 */}
          <p className="line-clamp-2 text-sm text-muted-foreground mb-3">
            {post.excerpt}
          </p>

          {/* 元信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <time dateTime={post.publishedAt || undefined}>{formattedDate}</time>
            <span>{post.readingTime} 分钟阅读</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}