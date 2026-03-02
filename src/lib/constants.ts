/**
 * ============================================================================
 * 站点配置常量
 * ============================================================================
 *
 * 集中管理站点级别的配置信息
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
  ],
} as const;

/**
 * ISR 缓存配置
 */
export const ISR_CONFIG = {
  /** 首页/列表页刷新间隔（秒） */
  LIST_REVALIDATE: 300,
  /** 详情页刷新间隔（秒） */
  DETAIL_REVALIDATE: 3600,
  /** 静态生成的文章数量上限 */
  STATIC_GENERATE_LIMIT: 100,
} as const;