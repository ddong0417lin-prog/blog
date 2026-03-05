import Link from 'next/link';
import { getAllPublishedPosts } from '@/app/actions/get-posts';

type ArchiveItem = {
  key: string;
  label: string;
  posts: Awaited<ReturnType<typeof getAllPublishedPosts>>;
};

function formatMonthKey(dateValue: string | null): string {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
}

export const revalidate = 3600;

export default async function ArchivePage() {
  const posts = await getAllPublishedPosts();

  const grouped = posts.reduce((map, post) => {
    const monthKey = formatMonthKey(post.publishedAt);
    const list = map.get(monthKey) || [];
    list.push(post);
    map.set(monthKey, list);
    return map;
  }, new Map<string, typeof posts>());

  const archives: ArchiveItem[] = Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, monthPosts]) => ({
      key,
      label: formatMonthLabel(key),
      posts: monthPosts.sort((a, b) => {
        const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bTime - aTime;
      }),
    }));

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mx-auto max-w-5xl px-6 py-8 md:px-8">
        <h1 className="mb-2 text-4xl font-semibold">归档</h1>
        <p className="mb-8 text-muted-foreground">按年月快速查找文章，共 {posts.length} 篇</p>

        {archives.length === 0 ? (
          <p className="text-muted-foreground">暂无文章</p>
        ) : (
          <div className="space-y-8">
            {archives.map((archive) => (
              <section key={archive.key} id={`month-${archive.key}`} className="space-y-3">
                <div className="sticky top-20 z-10 inline-flex rounded-full border border-border/80 bg-card/90 px-3 py-1 text-sm font-medium backdrop-blur">
                  {archive.label} · {archive.posts.length} 篇
                </div>
                <div className="space-y-2">
                  {archive.posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts/${encodeURIComponent(post.id)}`}
                      className="block rounded-xl border border-border/70 bg-card/70 px-4 py-3 transition-colors hover:bg-accent/40"
                      data-interactive="true"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-medium">{post.title}</h2>
                        <span className="text-xs text-muted-foreground">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString('zh-CN')
                            : '未发布'}
                        </span>
                      </div>
                      {post.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
