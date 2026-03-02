import { MetadataRoute } from 'next';
import { getAllPublishedPosts, getAllTags, getAllCategories } from './actions/get-posts';
import { SITE_CONFIG } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 使用全量获取方法，确保 sitemap 包含所有文章
  const posts = await getAllPublishedPosts();

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_CONFIG.url}/posts/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 动态生成分类和标签 URL
  const categories = await getAllCategories();
  const tags = await getAllTags();

  const categoryUrls: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_CONFIG.url}/categories/${encodeURIComponent(cat.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const tagUrls: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${SITE_CONFIG.url}/tags/${encodeURIComponent(tag.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: SITE_CONFIG.url,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_CONFIG.url}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_CONFIG.url}/tags`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  return [...staticUrls, ...categoryUrls, ...tagUrls, ...postUrls];
}