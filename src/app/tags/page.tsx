import Link from 'next/link';
import { getAllTags } from '@/app/actions/get-posts';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600;

export default async function TagsPage() {
  const tags = await getAllTags();

  const counts = tags.map((t) => t.count);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1;
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mx-auto max-w-4xl px-6 py-8 md:px-8">
        <h1 className="mb-3 text-4xl font-semibold">标签</h1>
        {tags.length === 0 ? (
          <p className="text-muted-foreground">暂无标签</p>
        ) : (
          <>
            <p className="mb-8 text-muted-foreground">共 {tags.length} 个标签</p>
            <div className="flex flex-wrap gap-2.5">
              {tags.map((tag) => {
                const sizeRatio = maxCount === minCount ? 1 : (tag.count - minCount) / (maxCount - minCount);
                const fontSize = 0.875 + sizeRatio * 0.24;

                return (
                  <Link key={tag.slug} href={`/tags/${encodeURIComponent(tag.slug)}`} data-interactive="true">
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/80 px-3 py-1.5 transition-colors hover:bg-accent"
                      style={{ fontSize: `${fontSize}rem` }}
                    >
                      {tag.name}
                      <span className="ml-1 text-xs text-muted-foreground">({tag.count})</span>
                    </Badge>
                  </Link>
                );
              })}
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