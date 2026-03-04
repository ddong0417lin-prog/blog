import { Suspense } from 'react';
import { getPublishedPosts } from './actions/get-posts';
import { PostList } from '@/components/posts/PostList';
import { PostCardSkeletonList } from '@/components/skeleton/PostCardSkeleton';
import { SITE_CONFIG } from '@/lib/constants';

interface HomePageProps {
  searchParams: Promise<{ startCursor?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { startCursor } = await searchParams;

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

      <section className="paper-card px-6 py-8 md:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold">最新文章</h2>
          <p className="text-sm text-muted-foreground">按发布时间倒序</p>
        </div>
        <Suspense fallback={<PostCardSkeletonList count={6} />}>
          <PostsGrid startCursor={startCursor} />
        </Suspense>
      </section>
    </div>
  );
}

async function PostsGrid({ startCursor }: { startCursor?: string }) {
  const { data: posts, hasMore, nextCursor } = await getPublishedPosts({
    pageSize: 12,
    startCursor,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });

  return <PostList posts={posts} hasMore={hasMore} nextCursor={nextCursor} />;
}

