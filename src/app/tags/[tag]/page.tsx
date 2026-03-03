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

function resolveTagByParam(tags: Array<{ name: string; slug: string }>, rawParam: string) {
  const decoded = decodeURIComponent(rawParam);
  const normalized = decoded.toLowerCase();

  return tags.find((tag) => {
    const slug = tag.slug.toLowerCase();
    const name = tag.name.toLowerCase();
    return slug === normalized || name === normalized;
  });
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const allTags = await getAllTags();
  const tagEntity = resolveTagByParam(allTags, tag);
  const displayName = tagEntity?.name || decodeURIComponent(tag);

  return {
    title: `${displayName} - 标签`,
    description: `查看 ${displayName} 标签下的所有文章`,
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag } = await params;
  const { startCursor } = await searchParams;

  const allTags = await getAllTags();
  const tagEntity = resolveTagByParam(allTags, tag);

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
        <p className="text-muted-foreground">共 {posts.length} 篇文章</p>
      </header>

      <PostList posts={posts} hasMore={hasMore} nextCursor={nextCursor} />
    </div>
  );
}
