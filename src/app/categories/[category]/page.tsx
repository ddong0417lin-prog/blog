import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostsByCategory, getAllCategories } from '@/app/actions/get-posts';
import { PostList } from '@/components/posts/PostList';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);

  return {
    title: `${decodedCategory} - 分类`,
    description: `查看 ${decodedCategory} 分类下的所有文章`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);

  const { data: posts, hasMore, nextCursor } = await getPostsByCategory(decodedCategory, {
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
        <h1 className="text-4xl font-bold mb-2">{decodedCategory}</h1>
        <p className="text-muted-foreground">
          共 {posts.length} 篇文章
        </p>
      </header>

      <PostList posts={posts} hasMore={hasMore} nextCursor={nextCursor} />
    </div>
  );
}