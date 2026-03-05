import Link from 'next/link';
import { getAllPublishedPosts } from '@/app/actions/get-posts';
import type { PostSummary } from '@/contracts/types';

interface ArchivePageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

type ArchiveItem = {
  key: string;
  year: string;
  month: string;
  label: string;
  posts: PostSummary[];
};

function toDate(value: string | null): Date {
  return value ? new Date(value) : new Date();
}

function getMonthKey(dateValue: string | null): string {
  const date = toDate(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthLabel(year: string, month: string): string {
  return `${year}年${Number(month)}月`;
}

function parseQueryYear(value?: string): string | null {
  if (!value) return null;
  return /^\d{4}$/.test(value) ? value : null;
}

function parseQueryMonth(value?: string): string | null {
  if (!value) return null;
  return /^(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

export const revalidate = 300;

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const posts = await getAllPublishedPosts();
  const { year: rawYear, month: rawMonth } = await searchParams;
  const selectedYear = parseQueryYear(rawYear);
  const selectedMonth = parseQueryMonth(rawMonth);

  const grouped = posts.reduce((map, post) => {
    const monthKey = getMonthKey(post.publishedAt);
    const list = map.get(monthKey) || [];
    list.push(post);
    map.set(monthKey, list);
    return map;
  }, new Map<string, PostSummary[]>());

  const allArchives: ArchiveItem[] = Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, monthPosts]) => {
      const [year, month] = key.split('-');
      return {
        key,
        year,
        month,
        label: getMonthLabel(year, month),
        posts: monthPosts.sort((a, b) => {
          const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return bTime - aTime;
        }),
      };
    });

  const years = Array.from(new Set(allArchives.map((item) => item.year))).sort((a, b) => b.localeCompare(a));

  const filteredArchives = allArchives.filter((item) => {
    if (selectedYear && item.year !== selectedYear) {
      return false;
    }
    if (selectedMonth && item.month !== selectedMonth) {
      return false;
    }
    return true;
  });

  const yearToMonths = allArchives.reduce((map, item) => {
    const list = map.get(item.year) || [];
    if (!list.includes(item.month)) {
      list.push(item.month);
    }
    map.set(item.year, list.sort((a, b) => b.localeCompare(a)));
    return map;
  }, new Map<string, string[]>());

  const activeYear = selectedYear || years[0] || null;
  const monthOptions = activeYear ? (yearToMonths.get(activeYear) || []) : [];

  return (
    <div className="page-container py-10 md:py-12">
      <section className="paper-card mx-auto max-w-5xl px-6 py-8 md:px-8">
        <h1 className="mb-2 text-4xl font-semibold">归档</h1>
        <p className="mb-6 text-muted-foreground">按“年 / 月”快速检索文章，共 {posts.length} 篇</p>

        {years.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">年份：</span>
            <Link
              href="/archive"
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                !selectedYear ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent border-border/80'
              }`}
              data-interactive="true"
            >
              全部
            </Link>
            {years.map((year) => (
              <Link
                key={year}
                href={`/archive?year=${year}`}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedYear === year ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent border-border/80'
                }`}
                data-interactive="true"
              >
                {year}
              </Link>
            ))}
          </div>
        )}

        {monthOptions.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">月份：</span>
            {activeYear && (
              <Link
                href={`/archive?year=${activeYear}`}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  !selectedMonth ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent border-border/80'
                }`}
                data-interactive="true"
              >
                全部
              </Link>
            )}
            {monthOptions.map((month) => {
              const href = activeYear ? `/archive?year=${activeYear}&month=${month}` : `/archive?month=${month}`;
              return (
                <Link
                  key={month}
                  href={href}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    selectedMonth === month ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent border-border/80'
                  }`}
                  data-interactive="true"
                >
                  {Number(month)}月
                </Link>
              );
            })}
          </div>
        )}

        {filteredArchives.length === 0 ? (
          <p className="text-muted-foreground">当前筛选条件下暂无文章</p>
        ) : (
          <div className="space-y-8">
            {filteredArchives.map((archive) => (
              <section key={archive.key} id={`month-${archive.key}`} className="space-y-3">
                <div className="inline-flex rounded-full border border-border/80 bg-card/90 px-3 py-1 text-sm font-medium backdrop-blur">
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
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : '未发布'}
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
