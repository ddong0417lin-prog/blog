import Link from 'next/link';
import { getAllCategories } from '@/app/actions/get-posts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mx-auto max-w-4xl px-6 py-8 md:px-8">
        <h1 className="mb-3 text-4xl font-semibold">分类</h1>
        {categories.length === 0 ? (
          <p className="text-muted-foreground">暂无分类</p>
        ) : (
          <>
            <p className="mb-8 text-muted-foreground">共 {categories.length} 个分类</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categories/${encodeURIComponent(cat.slug)}`}
                  data-interactive="true"
                >
                  <Card className="h-full border-border/80 bg-card/80 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{cat.count} 篇文章</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="mx-auto mt-4 max-w-4xl text-right">
        <Link
          href="/archive"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          data-interactive="true"
        >
          按时间归档查看全部文章
        </Link>
      </div>
    </div>
  );
}