import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostsByTag, getAllTags } from '@/app/actions/get-posts';
import { PostList } from '@/components/posts/PostList';

interface TagPageProps {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ startCursor?: string }>;
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

  // 通过 slug 映射回 name 以获取正确的显示名称
  const allTags = await getAllTags();
  const tagEntity = allTags.find((t) => t.slug === decodedTag);
  const displayName = tagEntity?.name || decodedTag;

  return {
    title: `${displayName} - 标签`,
    description: `查看 ${displayName} 标签下的所有文章`,
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag } = await params;
  const { startCursor } = await searchParams;
  const decodedSlug = decodeURIComponent(tag);

  // 通过 slug 映射回 name
  const allTags = await getAllTags();
  const tagEntity = allTags.find((t) => t.slug === decodedSlug);

  if (!tagEntity) {
    notFound();
  }

  const { data: posts, hasMore, nextCursor } = await getPostsByTag(tagEntity.name, {
    pageSize: 12,
    startCursor,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-muted-foreground">#</span> {tagEntity.name}
        </h1>
        <p className="text-muted-foreground">
          共 {posts.length} 篇文章
        </p>
      </header>

      <PostList posts={posts} hasMore={hasMore} nextCursor={nextCursor} />
    </div>
  );
}