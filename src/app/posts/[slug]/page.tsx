import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, getRelatedPosts, getPublishedPosts } from '@/app/actions/get-posts';
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

// 生成静态路径
export async function generateStaticParams() {
  const { data: posts } = await getPublishedPosts({
    pageSize: 100,
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// 生成元数据
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

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
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(slug, 3);

  return (
    <article className="container mx-auto px-4 py-8">
      {/* JSON-LD 结构化数据 */}
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
        {/* 主内容区 */}
        <div className="lg:col-span-8 xl:col-span-9">
          <PostHeader post={post} />
          <PostContent content={post.content} />

          {/* 点赞和分享 */}
          <div className="mt-8 py-4 border-t border-b">
            <LikeButton slug={post.slug} />
          </div>

          {/* 评论 */}
          <GiscusComments slug={post.slug} />

          {/* 相关文章 */}
          {relatedPosts.length > 0 && (
            <RelatedPosts posts={relatedPosts} />
          )}
        </div>

        {/* 侧边目录 */}
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