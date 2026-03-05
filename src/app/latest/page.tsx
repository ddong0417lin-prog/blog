import { getLatestPostsWindow } from '@/app/actions/get-posts';
import { PostList } from '@/components/posts/PostList';

interface LatestPageProps {
  searchParams: Promise<{ startCursor?: string }>;
}

export const revalidate = 300;

export default async function LatestPage({ searchParams }: LatestPageProps) {
  const { startCursor } = await searchParams;
  const { data, hasMore, nextCursor, total } = await getLatestPostsWindow({
    pageSize: 12,
    startCursor,
    limit: 100,
  });

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mx-auto max-w-6xl px-6 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl font-semibold">最新文章</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              按发布时间倒序 · 最多展示 100 篇 · 当前 {total} 篇
            </p>
          </div>
        </div>

        <PostList posts={data} hasMore={hasMore} nextCursor={nextCursor} />
      </section>
    </div>
  );
}

