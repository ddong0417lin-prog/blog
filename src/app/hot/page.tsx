import Link from 'next/link';
import { getHotPostsWindow } from '@/app/actions/get-posts';

interface HotPageProps {
  searchParams: Promise<{ startCursor?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function HotPage({ searchParams }: HotPageProps) {
  const { startCursor } = await searchParams;
  const { data, hasMore, nextCursor, total, likeCounts } = await getHotPostsWindow({
    pageSize: 12,
    startCursor,
    limit: 100,
  });

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mx-auto max-w-6xl px-6 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="text-4xl font-semibold">热点文章</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            按点赞量排序 · 同点赞按发布时间倒序 · 最多展示 100 篇 · 当前 {total} 篇
          </p>
        </div>

        {data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/90 bg-muted/30 px-6 py-14 text-center">
            <p className="text-base text-muted-foreground">暂无热点文章</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((post, index) => {
              const rank = Number(startCursor || 0) + index + 1;
              const dateLabel = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString('zh-CN')
                : '未发布';
              const likes = likeCounts[post.id] || 0;

              return (
                <Link
                  key={post.id}
                  href={`/posts/${encodeURIComponent(post.id)}`}
                  className="block rounded-xl border border-border/70 bg-card/70 px-4 py-3 transition-colors hover:bg-accent/40"
                  data-interactive="true"
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>#{rank}</span>
                    <span>👍 {likes}</span>
                  </div>
                  <h2 className="line-clamp-1 text-lg font-medium">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.category}</span>
                    <time dateTime={post.publishedAt || undefined}>{dateLabel}</time>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {hasMore && nextCursor && (
          <div className="mt-8 flex justify-center">
            <a
              href={`?startCursor=${nextCursor}`}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-5 text-sm font-medium transition-colors hover:bg-accent"
              data-interactive="true"
            >
              加载更多
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
