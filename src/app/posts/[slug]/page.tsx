import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, getRelatedPosts } from '@/app/actions/get-posts';
import { PostHeader } from '@/components/posts/PostHeader';
import { PostContent } from '@/components/posts/PostContent';
import { TableOfContents } from '@/components/posts/TableOfContents';
import { RelatedPosts } from '@/components/posts/RelatedPosts';
import { GiscusComments } from '@/components/comments/GiscusComments';
import { LikeButton } from '@/components/interaction/LikeButton';
import { ViewTracker } from '@/components/interaction/ViewTracker';
import { SITE_CONFIG } from '@/lib/constants';
import { getViewCount } from '@/lib/redis/client';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug(decodedSlug);

  if (!post) {
    return { title: '文章未找到' };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt,
      authors: [SITE_CONFIG.author.name],
      images: post.coverImage ? [{ url: post.coverImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug(decodedSlug);

  if (!post) {
    notFound();
  }

  const [relatedPosts, viewCount] = await Promise.all([
    getRelatedPosts(decodedSlug, 3),
    getViewCount(post.id),
  ]);

  return (
    <article className="page-container py-10 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt,
            image: post.coverImage,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            author: {
              '@type': 'Person',
              name: SITE_CONFIG.author.name,
            },
          }),
        }}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8 xl:col-span-9">
          <PostHeader post={post} viewCount={viewCount} />
          <ViewTracker slug={post.id} />

          <section className="paper-card p-6 md:p-8">
            <PostContent content={post.content} />
          </section>

          <section className="paper-card px-6 py-4">
            <LikeButton slug={post.slug} />
          </section>

          <section className="paper-card p-6 md:p-8">
            <GiscusComments slug={post.slug} />
          </section>

          {relatedPosts.length > 0 && (
            <section className="paper-card p-6 md:p-8">
              <RelatedPosts posts={relatedPosts} />
            </section>
          )}
        </div>

        {post.toc.length > 0 && (
          <aside className="hidden lg:col-span-4 lg:block xl:col-span-3">
            <div className="sticky top-28 paper-card p-5">
              <TableOfContents toc={post.toc} />
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
