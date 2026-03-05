import Link from 'next/link';
import {
  getHotPostsWindow,
  getMostCommentedPostsWindow,
  getMostViewedPostsWindow,
} from '@/app/actions/get-posts';

interface HotPageProps {
  searchParams: Promise<{ startCursor?: string; metric?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function HotPage({ searchParams }: HotPageProps) {
  const { startCursor, metric } = await searchParams;
  const activeMetric =
    metric === 'views' || metric === 'comments' ? metric : 'likes';

  const likeResult =
    activeMetric === 'likes'
      ? await getHotPostsWindow({
          pageSize: 12,
          startCursor,
          limit: 100,
        })
      : null;
  const viewResult =
    activeMetric === 'views'
      ? await getMostViewedPostsWindow({
          pageSize: 12,
          startCursor,
          limit: 100,
        })
      : null;
  const commentResult =
    activeMetric === 'comments'
      ? await getMostCommentedPostsWindow({
          pageSize: 12,
          startCursor,
          limit: 100,
        })
      : null;

  const result = likeResult ?? viewResult ?? commentResult;
  const counts =
    activeMetric === 'views'
      ? viewResult?.viewCounts
      : activeMetric === 'comments'
      ? commentResult?.commentCounts
      : likeResult?.likeCounts;
  const icon =
    activeMetric === 'views' ? '👀' : activeMetric === 'comments' ? '💬' : '👍';
  const title =
    activeMetric === 'views'
      ? '最多阅读'
      : activeMetric === 'comments'
      ? '最多评论'
      : '最多点赞';

  if (!result) {
    return null;
  }

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mx-auto max-w-6xl px-6 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="text-4xl font-semibold">热度榜单</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            展示上限 100 篇，支持游标分页加载
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/hot?metric=likes"
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                activeMetric === 'likes'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/80 hover:bg-accent'
              }`}
              data-interactive="true"
            >
              最多点赞
            </Link>
            <Link
              href="/hot?metric=views"
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                activeMetric === 'views'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/80 hover:bg-accent'
              }`}
              data-interactive="true"
            >
              最多阅读
            </Link>
            <Link
              href="/hot?metric=comments"
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                activeMetric === 'comments'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/80 hover:bg-accent'
              }`}
              data-interactive="true"
            >
              最多评论
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            当前视图：{title} · 当前 {result.total} 篇
          </p>
        </div>

        {result.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/90 bg-muted/30 px-6 py-14 text-center">
            <p className="text-base text-muted-foreground">暂无榜单文章</p>
          </div>
        ) : (
          <div className="space-y-3">
            {result.data.map((post, index) => {
              const rank = Number(startCursor || 0) + index + 1;
              const dateLabel = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString('zh-CN')
                : '未发布';

              return (
                <Link
                  key={post.id}
                  href={`/posts/${encodeURIComponent(post.id)}`}
                  className="block rounded-xl border border-border/70 bg-card/70 px-4 py-3 transition-colors hover:bg-accent/40"
                  data-interactive="true"
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>#{rank}</span>
                    <span>
                      {icon} {counts?.[post.id] || 0}
                    </span>
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

        {result.hasMore && result.nextCursor && (
          <div className="mt-8 flex justify-center">
            <a
              href={`?metric=${activeMetric}&startCursor=${result.nextCursor}`}
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
