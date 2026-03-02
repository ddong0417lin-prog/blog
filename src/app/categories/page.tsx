import Link from 'next/link';
import { getAllCategories, getPostsByCategory } from '@/app/actions/get-posts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const revalidate = 3600; // 1 小时

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  if (categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">分类</h1>
        <p className="text-muted-foreground">暂无分类</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">分类</h1>
      <p className="text-muted-foreground mb-8">
        共 {categories.length} 个分类
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Link key={cat.slug} href={`/categories/${encodeURIComponent(cat.slug)}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{cat.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {cat.count} 篇文章
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}