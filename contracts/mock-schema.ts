/**
 * ============================================================================
 * Phase -1: 契约冻结 - Mock Schema
 * ============================================================================
 *
 * 本文件提供开发阶段使用的 Mock 数据
 * 用于模块独立开发和测试
 *
 * @version 1.0.0
 * @frozen true
 * ============================================================================
 */

import {
  PostSummary,
  PostDetail,
  Tag,
  Category,
  PostStatus,
  Block,
  TocItem,
} from './types';

// ============================================================================
// Mock 文章内容
// ============================================================================

const mockToc: TocItem[] = [
  { id: 'heading-1', text: '引言', level: 2, slug: 'introduction' },
  { id: 'heading-2', text: '核心概念', level: 2, slug: 'core-concepts' },
  { id: 'heading-3', text: '服务端组件', level: 3, slug: 'server-components' },
  { id: 'heading-4', text: '客户端组件', level: 3, slug: 'client-components' },
  { id: 'heading-5', text: '实践案例', level: 2, slug: 'practical-examples' },
  { id: 'heading-6', text: '总结', level: 2, slug: 'conclusion' },
];

const mockBlocks: Block[] = [
  {
    id: 'block-1',
    type: 'paragraph',
    content: 'Next.js 15 带来了许多激动人心的新特性，其中最引人注目的就是对 React Server Components 的进一步完善。本文将深入探讨这些新特性及其应用场景。',
  },
  {
    id: 'block-2',
    type: 'heading_2',
    content: '引言',
  },
  {
    id: 'block-3',
    type: 'paragraph',
    content: '随着前端技术的不断发展，服务端渲染已经成为现代 Web 应用的重要组成部分。Next.js 作为 React 生态中最流行的框架之一，一直在推动这一领域的发展。',
  },
  {
    id: 'block-4',
    type: 'heading_2',
    content: '核心概念',
  },
  {
    id: 'block-5',
    type: 'heading_3',
    content: '服务端组件',
  },
  {
    id: 'block-6',
    type: 'paragraph',
    content: '服务端组件（Server Components）是 React 18 引入的重要概念。它允许组件在服务端渲染，从而减少客户端 JavaScript 的体积，提升首屏加载速度。',
  },
  {
    id: 'block-7',
    type: 'code',
    content: '// Server Component example\nasync function PostList() {\n  const posts = await getPosts();\n  return (\n    <ul>\n      {posts.map(post => (\n        <li key={post.id}>{post.title}</li>\n      ))}\n    </ul>\n  );\n}',
    props: { language: 'typescript' },
  },
  {
    id: 'block-8',
    type: 'heading_3',
    content: '客户端组件',
  },
  {
    id: 'block-9',
    type: 'paragraph',
    content: '客户端组件（Client Components）是我们熟悉的传统 React 组件，它们在浏览器中执行，可以访问浏览器 API 和 React hooks。',
  },
  {
    id: 'block-10',
    type: 'heading_2',
    content: '实践案例',
  },
  {
    id: 'block-11',
    type: 'quote',
    content: '最佳实践：将数据获取逻辑放在 Server Components 中，将交互逻辑放在 Client Components 中。',
  },
  {
    id: 'block-12',
    type: 'heading_2',
    content: '总结',
  },
  {
    id: 'block-13',
    type: 'paragraph',
    content: 'Next.js 15 的 Server Components 为构建高性能 Web 应用提供了强大的工具。通过合理使用服务端和客户端组件，我们可以在性能和交互性之间取得平衡。',
  },
];

// ============================================================================
// Mock 文章数据
// ============================================================================

export const mockPostSummary: PostSummary = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'nextjs-15-server-components-guide',
  title: 'Next.js 15 Server Components 完全指南',
  excerpt: '深入了解 Next.js 15 中的服务端组件特性，学习如何构建高性能的 React 应用。本文涵盖核心概念、最佳实践和常见陷阱。',
  coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200',
  tags: ['Next.js', 'React', 'SSR', '前端'],
  category: '前端开发',
  publishedAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-20T00:00:00.000Z',
  readingTime: 8,
  status: PostStatus.PUBLISHED,
};

export const mockPostDetail: PostDetail = {
  ...mockPostSummary,
  content: mockBlocks,
  rawContent: '# Next.js 15 Server Components 完全指南\n\nNext.js 15 带来了许多激动人心的新特性...',
  toc: mockToc,
};

export const mockPostSummaries: PostSummary[] = [
  mockPostSummary,
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    slug: 'tailwind-css-best-practices',
    title: 'Tailwind CSS 最佳实践',
    excerpt: '掌握 Tailwind CSS 的高级技巧，包括自定义配置、插件开发和性能优化。',
    coverImage: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=1200',
    tags: ['Tailwind', 'CSS', 'UI'],
    category: '前端开发',
    publishedAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z',
    readingTime: 6,
    status: PostStatus.PUBLISHED,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    slug: 'notion-as-cms-guide',
    title: '使用 Notion 作为 CMS：完整指南',
    excerpt: '学习如何将 Notion 作为博客的内容管理系统，实现内容与展示的分离。',
    coverImage: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200',
    tags: ['Notion', 'CMS', '博客'],
    category: '工具',
    publishedAt: '2024-01-05T00:00:00.000Z',
    updatedAt: '2024-01-08T00:00:00.000Z',
    readingTime: 10,
    status: PostStatus.PUBLISHED,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    slug: 'typescript-advanced-patterns',
    title: 'TypeScript 高级类型模式',
    excerpt: '探索 TypeScript 的高级类型系统，包括条件类型、映射类型和模板字面量类型。',
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200',
    tags: ['TypeScript', 'JavaScript'],
    category: '编程语言',
    publishedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
    readingTime: 12,
    status: PostStatus.PUBLISHED,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    slug: 'web-performance-optimization',
    title: 'Web 性能优化实战',
    excerpt: '从 Core Web Vitals 到资源优化，全方位提升网站性能指标。',
    coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
    tags: ['性能', 'Web', '优化'],
    category: '性能优化',
    publishedAt: '2023-12-25T00:00:00.000Z',
    updatedAt: '2023-12-28T00:00:00.000Z',
    readingTime: 15,
    status: PostStatus.PUBLISHED,
  },
  // 边界场景：草稿状态
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    slug: 'draft-post-example',
    title: '这是一篇草稿文章',
    excerpt: '草稿状态的示例，用于测试草稿场景。',
    tags: ['草稿', '测试'],
    category: '测试',
    publishedAt: null,
    updatedAt: '2024-01-30T00:00:00.000Z',
    readingTime: 3,
    status: PostStatus.DRAFT,
  },
  // 边界场景：无标签
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    slug: 'no-tags-post',
    title: '没有标签的文章',
    excerpt: '测试无标签场景的示例文章。',
    tags: [],
    category: '未分类',
    publishedAt: '2023-12-20T00:00:00.000Z',
    updatedAt: '2023-12-20T00:00:00.000Z',
    readingTime: 5,
    status: PostStatus.PUBLISHED,
  },
];

// ============================================================================
// Mock 标签数据
// ============================================================================

export const mockTags: Tag[] = [
  { name: 'Next.js', slug: 'nextjs', count: 5 },
  { name: 'React', slug: 'react', count: 8 },
  { name: 'TypeScript', slug: 'typescript', count: 6 },
  { name: '前端', slug: 'frontend', count: 12 },
  { name: 'CSS', slug: 'css', count: 4 },
  { name: '性能', slug: 'performance', count: 3 },
  { name: 'Notion', slug: 'notion', count: 2 },
  { name: '博客', slug: 'blog', count: 3 },
];

// ============================================================================
// Mock 分类数据
// ============================================================================

export const mockCategories: Category[] = [
  { name: '前端开发', slug: 'frontend', count: 15 },
  { name: '后端开发', slug: 'backend', count: 8 },
  { name: '工具', slug: 'tools', count: 5 },
  { name: '编程语言', slug: 'languages', count: 6 },
  { name: '性能优化', slug: 'performance', count: 3 },
];

// ============================================================================
// Mock 搜索结果
// ============================================================================

export const mockSearchDocuments = mockPostSummaries.map(post => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  tags: post.tags,
  category: post.category,
}));

// ============================================================================
// Mock 分页结果（游标分页）
// ============================================================================

export const mockPaginatedResult = {
  data: mockPostSummaries.slice(0, 5),
  hasMore: true,
  nextCursor: '550e8400-e29b-41d4-a716-446655440005',
  total: 25,
};

// ============================================================================
// Mock 点赞数据
// ============================================================================

export const mockLikeData: Record<string, { count: number; liked: boolean }> = {
  'nextjs-15-server-components-guide': { count: 42, liked: false },
  'tailwind-css-best-practices': { count: 28, liked: true },
  'notion-as-cms-guide': { count: 35, liked: false },
  'typescript-advanced-patterns': { count: 56, liked: false },
  'web-performance-optimization': { count: 19, liked: false },
};

// ============================================================================
// Mock 辅助函数
// ============================================================================

/**
 * 获取单篇文章摘要的 Mock
 */
export function getMockPostSummary(slug: string): PostSummary | undefined {
  return mockPostSummaries.find(p => p.slug === slug);
}

/**
 * 获取单篇文章详情的 Mock
 */
export function getMockPostDetail(slug: string): PostDetail | undefined {
  const summary = mockPostSummaries.find(p => p.slug === slug);
  if (!summary) return undefined;

  return {
    ...summary,
    content: mockBlocks,
    rawContent: `# ${summary.title}\n\n${summary.excerpt}\n\n(Mock content)`,
    toc: mockToc,
  };
}

/**
 * 获取文章列表的 Mock（游标分页）
 */
export function getMockPostSummaries(
  pageSize: number = 10,
  startCursor?: string
): { posts: PostSummary[]; nextCursor?: string; hasMore: boolean } {
  const startIndex = startCursor
    ? mockPostSummaries.findIndex(p => p.id === startCursor) + 1
    : 0;
  const posts = mockPostSummaries.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < mockPostSummaries.length;
  const nextCursor = hasMore ? posts[posts.length - 1]?.id : undefined;

  return { posts, nextCursor, hasMore };
}

/**
 * 获取点赞数的 Mock
 */
export function getMockLikeCount(slug: string): number {
  return mockLikeData[slug]?.count ?? 0;
}
