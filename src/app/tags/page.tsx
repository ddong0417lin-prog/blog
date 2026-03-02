import Link from 'next/link';
import { getAllTags } from '@/app/actions/get-posts';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600; // 1 小时

export default async function TagsPage() {
  const tags = await getAllTags();

  if (tags.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">标签</h1>
        <p className="text-muted-foreground">暂无标签</p>
      </div>
    );
  }

  // 计算最大和最小文章数，用于字体大小
  const counts = tags.map((t) => t.count);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">标签</h1>
      <p className="text-muted-foreground mb-8">
        共 {tags.length} 个标签
      </p>

      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => {
          // 根据文章数量计算字体大小
          const sizeRatio = maxCount === minCount
            ? 1
            : (tag.count - minCount) / (maxCount - minCount);
          const fontSize = 0.875 + sizeRatio * 0.5; // 14px - 22px

          return (
            <Link
              key={tag.slug}
              href={`/tags/${encodeURIComponent(tag.slug)}`}
            >
              <Badge
                variant="outline"
                className="hover:bg-accent transition-colors"
                style={{ fontSize: `${fontSize}rem` }}
              >
                {tag.name}
                <span className="ml-1 text-muted-foreground text-xs">
                  ({tag.count})
                </span>
              </Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}