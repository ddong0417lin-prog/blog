import Link from 'next/link';
import { getHotPostsWindow, getLatestPostsWindow } from './actions/get-posts';
import { SITE_CONFIG } from '@/lib/constants';
import type { PostSummary } from '@/contracts/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [latestResult, hotResult] = await Promise.all([
    getLatestPostsWindow({ pageSize: 3, limit: 100 }),
    getHotPostsWindow({ pageSize: 3, limit: 100 }),
  ]);

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mb-10 px-6 py-10 md:px-12">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Simple writing space
        </p>
        <h1 className="mb-4 text-5xl font-semibold leading-none md:text-6xl">
          {SITE_CONFIG.name}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          {SITE_CONFIG.description}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="paper-card px-6 py-8 md:px-8">
          <SectionHeader
            title="最新文章"
            subtitle="按发布时间倒序"
            href="/latest"
            total={latestResult.total}
          />
          <CompactPostList posts={latestResult.data} />
        </div>

        <div className="paper-card px-6 py-8 md:px-8">
          <SectionHeader
            title="热点文章"
            subtitle="按点赞量排序"
            href="/hot"
            total={hotResult.total}
          />
          <CompactPostList posts={hotResult.data} likeCounts={hotResult.likeCounts} />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  total,
}: {
  title: string;
  subtitle: string;
  href: string;
  total?: number;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {subtitle}
          {typeof total === 'number' ? ` · 共 ${total} 篇（最多展示 100 篇）` : ''}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent"
        data-interactive="true"
      >
        展开更多
      </Link>
    </div>
  );
}

function CompactPostList({
  posts,
  likeCounts,
}: {
  posts: PostSummary[];
  likeCounts?: Record<string, number>;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-5 py-10 text-center text-muted-foreground">
        暂无文章
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
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
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-1 text-lg font-medium">{post.title}</h3>
              {likeCounts && (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  👍 {likeCounts[post.id] || 0}
                </span>
              )}
            </div>
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
  );
}
