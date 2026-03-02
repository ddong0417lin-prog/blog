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
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">{SITE_CONFIG.name}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {SITE_CONFIG.description}
        </p>
      </section>

      {/* Posts Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">最新文章</h2>
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