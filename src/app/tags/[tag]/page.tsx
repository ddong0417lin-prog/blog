import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostsByTag, getAllTags } from '@/app/actions/get-posts';
import { PostList } from '@/components/posts/PostList';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({
    tag: tag.slug,
  }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  return {
    title: `${decodedTag} - 标签`,
    description: `查看 ${decodedTag} 标签下的所有文章`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  const { data: posts, hasMore, nextCursor } = await getPostsByTag(decodedTag, {
    pageSize: 12,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-muted-foreground">#</span> {decodedTag}
        </h1>
        <p className="text-muted-foreground">
          共 {posts.length} 篇文章
        </p>
      </header>

      <PostList posts={posts} hasMore={hasMore} nextCursor={nextCursor} />
    </div>
  );
}