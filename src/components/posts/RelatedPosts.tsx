import Link from 'next/link';
import type { PostSummary } from '@/contracts/types';

interface RelatedPostsProps {
  posts: PostSummary[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t">
      <h3 className="text-xl font-semibold mb-6">相关文章</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}`}
            className="group block p-4 rounded-lg border hover:shadow-md transition-all"
          >
            <h4 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {post.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}