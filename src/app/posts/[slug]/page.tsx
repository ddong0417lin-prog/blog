import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, getRelatedPosts } from '@/app/actions/get-posts';
import { PostHeader } from '@/components/posts/PostHeader';
import { PostContent } from '@/components/posts/PostContent';
import { TableOfContents } from '@/components/posts/TableOfContents';
import { RelatedPosts } from '@/components/posts/RelatedPosts';
import { GiscusComments } from '@/components/comments/GiscusComments';
import { LikeButton } from '@/components/interaction/LikeButton';
import { SITE_CONFIG } from '@/lib/constants';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug(decodedSlug);

  if (!post) {
    return {
      title: '文章未找到',
    };
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

  const relatedPosts = await getRelatedPosts(decodedSlug, 3);

  return (
    <article className="container mx-auto px-4 py-8">
      {/* JSON-LD 缁撴瀯鍖栨暟鎹?*/}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 涓诲唴瀹瑰尯 */}
        <div className="lg:col-span-8 xl:col-span-9">
          <PostHeader post={post} />
          <PostContent content={post.content} />

          {/* 鐐硅禐鍜屽垎浜?*/}
          <div className="mt-8 py-4 border-t border-b">
            <LikeButton slug={post.slug} />
          </div>

          {/* 璇勮 */}
          <GiscusComments slug={post.slug} />

          {/* 鐩稿叧鏂囩珷 */}
          {relatedPosts.length > 0 && (
            <RelatedPosts posts={relatedPosts} />
          )}
        </div>

        {/* 渚ц竟鐩綍 */}
        {post.toc.length > 0 && (
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24">
              <TableOfContents toc={post.toc} />
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}

