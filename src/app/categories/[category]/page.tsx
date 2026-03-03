import type { Metadata } from 'next';
import { getAllCategories, getPostsByCategory } from '@/app/actions/get-posts';
import { PostList } from '@/components/posts/PostList';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ startCursor?: string }>;
}

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

function resolveCategoryByParam(
  categories: Array<{ name: string; slug: string }>,
  rawParam: string
) {
  const decoded = decodeURIComponent(rawParam);
  const normalized = decoded.toLowerCase();

  return categories.find((cat) => {
    const slug = cat.slug.toLowerCase();
    const name = cat.name.toLowerCase();
    return slug === normalized || name === normalized;
  });
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const allCategories = await getAllCategories();
  const categoryEntity = resolveCategoryByParam(allCategories, category);
  const displayName = categoryEntity?.name || decodeURIComponent(category);

  return {
    title: `${displayName} - 分类`,
    description: `查看 ${displayName} 分类下的所有文章`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const { startCursor } = await searchParams;

  const allCategories = await getAllCategories();
  const categoryEntity = resolveCategoryByParam(allCategories, category);
  const categoryName = categoryEntity?.name || decodeURIComponent(category);

  const { data: posts, hasMore, nextCursor } = await getPostsByCategory(categoryName, {
    pageSize: 12,
    startCursor,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{categoryName}</h1>
        <p className="text-muted-foreground">共 {posts.length} 篇文章</p>
      </header>

      <PostList posts={posts} hasMore={hasMore} nextCursor={nextCursor} />
    </div>
  );
}

