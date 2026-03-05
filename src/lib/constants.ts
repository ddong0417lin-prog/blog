/**
 * Site-level constants
 */
export const SITE_CONFIG = {
  name: 'Blog',
  description: '一个基于 Notion 作为 CMS 的现代博客系统',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  author: {
    name: 'Author',
    url: 'https://github.com',
  },
  links: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
  },
  navItems: [
    { label: '首页', href: '/' },
    { label: '分类', href: '/categories' },
    { label: '标签', href: '/tags' },
    { label: '归档', href: '/archive' },
  ],
} as const;

/**
 * ISR cache configuration
 */
export const ISR_CONFIG = {
  LIST_REVALIDATE: 300,
  DETAIL_REVALIDATE: 3600,
  STATIC_GENERATE_LIMIT: 100,
} as const;