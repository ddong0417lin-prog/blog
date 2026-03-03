/**
 * ============================================================================
 * Post 转换器
 * ============================================================================
 *
 * 将 Notion Page 对象转换为 PostSummary 和 PostDetail
 *
 * @version 1.0.0
 * ============================================================================
 */

import type {
  PageObjectResponse,
  BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import {
  PostSummary,
  PostDetail,
  PostStatus,
  Block,
  TocItem,
} from '@/contracts/types';

import { generateUniqueSlug, generateSlug } from '../utils/slug';
import { calculateReadingTime } from '../utils/reading-time';
import { transformBlockToInternal } from './block-transformer';
import { richTextToPlainText } from './rich-text-transformer';

/**
 * Notion Page 属性映射
 * 定义 Notion 页面的属性字段
 */
export interface NotionPropertyMapping {
  title: string;        // 标题字段名（默认：Title）
  slug: string;         // Slug 字段名（默认：Slug）
  tags: string;         // 标签字段名（默认：Tags）
  category: string;     // 分类字段名（默认：Category）
  status: string;       // 状态字段名（默认：Status）
  publishedAt: string;  // 发布日期字段名（默认：PublishedAt）
  excerpt: string;      // 摘要字段名（默认：Excerpt）
  cover: string;        // 封面字段名（默认：Cover）
}

/**
 * 默认属性映射
 */
export const DEFAULT_PROPERTY_MAPPING: NotionPropertyMapping = {
  title: 'Title',
  slug: 'Slug',
  tags: 'Tags',
  category: 'Category',
  status: 'Status',
  publishedAt: 'PublishedAt',
  excerpt: 'Excerpt',
  cover: 'Cover',
};

/**
 * 转换选项
 */
export interface TransformPostOptions {
  /** 属性映射配置 */
  propertyMapping?: Partial<NotionPropertyMapping>;

  /** 是否生成目录 */
  generateToc?: boolean;

  /** 已存在的 slug 集合（用于冲突处理） */
  existingSlugs?: Set<string>;
}

/**
 * 从 Notion 页面提取属性值
 */
function extractPropertyValue(
  page: PageObjectResponse,
  propertyName: string
): unknown {
  const property = page.properties[propertyName];
  if (!property) {
    return undefined;
  }

  switch (property.type) {
    case 'title':
      return property.title.map(t => t.plain_text).join('');

    case 'rich_text':
      return property.rich_text.map(t => t.plain_text).join('');

    case 'multi_select':
      return property.multi_select.map(s => s.name);

    case 'select':
      return property.select?.name;

    case 'status':
      return property.status?.name;

    case 'date':
      return property.date?.start;

    case 'checkbox':
      return property.checkbox;

    case 'files':
      if (property.files.length > 0) {
        const file = property.files[0];
        if (file.type === 'file') {
          return file.file.url;
        } else if (file.type === 'external') {
          return file.external.url;
        }
      }
      return undefined;

    default:
      return undefined;
  }
}

/**
 * 提取封面图片 URL
 */
function extractCoverImage(page: PageObjectResponse): string | undefined {
  if (!page.cover) {
    return undefined;
  }

  if (page.cover.type === 'external') {
    return page.cover.external.url;
  }

  if (page.cover.type === 'file') {
    return page.cover.file.url;
  }

  return undefined;
}

/**
 * 提取标签列表
 */
function extractTags(
  page: PageObjectResponse,
  propertyName: string
): string[] {
  const tags = extractPropertyValue(page, propertyName);
  if (Array.isArray(tags)) {
    return tags;
  }
  return [];
}

/**
 * 提取分类
 */
function extractCategory(
  page: PageObjectResponse,
  propertyName: string
): string {
  const category = extractPropertyValue(page, propertyName);
  if (typeof category === 'string' && category) {
    return category;
  }
  return 'Uncategorized';
}

/**
 * 提取状态
 */
function extractStatus(page: PageObjectResponse, propertyName: string): PostStatus {
  const status = extractPropertyValue(page, propertyName);

  if (status === 'Published' || status === 'published') {
    return PostStatus.PUBLISHED;
  }

  // 兼容旧 schema：Published 为 checkbox
  const publishedCheckbox = extractPropertyValue(page, 'Published');
  if (publishedCheckbox === true) {
    return PostStatus.PUBLISHED;
  }

  return PostStatus.DRAFT;
}

/**
 * 提取发布日期
 */
function extractPublishedAt(
  page: PageObjectResponse,
  propertyName: string
): string | null {
  const date = extractPropertyValue(page, propertyName);
  if (typeof date === 'string' && date) {
    return date;
  }

  // 如果没有 PublishedAt，尝试使用 page 的 created_time
  return page.created_time || null;
}

/**
 * 提取摘要
 */
function extractExcerpt(
  page: PageObjectResponse,
  propertyName: string,
  blocks?: BlockObjectResponse[]
): string {
  // 首先尝试从属性中获取
  const excerpt = extractPropertyValue(page, propertyName);
  if (typeof excerpt === 'string' && excerpt) {
    return excerpt;
  }

  // 如果没有摘要，从内容中提取前 200 字
  if (blocks && blocks.length > 0) {
    let text = '';

    for (const block of blocks) {
      if ('paragraph' in block && block.paragraph?.rich_text) {
        text += richTextToPlainText(block.paragraph.rich_text) + ' ';
      }

      if (text.length >= 200) {
        break;
      }
    }

    if (text.length > 0) {
      return text.substring(0, 200).trim() + '...';
    }
  }

  return '';
}

/**
 * 将 Notion Page 转换为 PostSummary
 *
 * @param page - Notion Page 对象
 * @param blocks - 页面内容块（用于计算阅读时长和摘要）
 * @param options - 转换选项
 * @returns PostSummary
 */
export function transformToPostSummary(
  page: PageObjectResponse,
  blocks?: BlockObjectResponse[],
  options: TransformPostOptions = {}
): PostSummary {
  const {
    propertyMapping = DEFAULT_PROPERTY_MAPPING,
    existingSlugs = new Set<string>(),
  } = options;

  // 获取属性名（使用默认值）
  const titleProp = propertyMapping.title ?? DEFAULT_PROPERTY_MAPPING.title;
  const slugProp = propertyMapping.slug ?? DEFAULT_PROPERTY_MAPPING.slug;
  const tagsProp = propertyMapping.tags ?? DEFAULT_PROPERTY_MAPPING.tags;
  const categoryProp = propertyMapping.category ?? DEFAULT_PROPERTY_MAPPING.category;
  const statusProp = propertyMapping.status ?? DEFAULT_PROPERTY_MAPPING.status;
  const publishedAtProp = propertyMapping.publishedAt ?? DEFAULT_PROPERTY_MAPPING.publishedAt;
  const excerptProp = propertyMapping.excerpt ?? DEFAULT_PROPERTY_MAPPING.excerpt;

  // 提取标题
  const title = extractPropertyValue(page, titleProp) as string || 'Untitled';

  // 提取或生成 slug
  let slug = extractPropertyValue(page, slugProp) as string;
  if (!slug) {
    slug = generateUniqueSlug(title, existingSlugs);
  } else {
    // 检查 slug 是否冲突
    if (existingSlugs.has(slug)) {
      slug = generateUniqueSlug(title, existingSlugs);
    }
  }

  // 提取其他字段
  const tags = extractTags(page, tagsProp);
  const category = extractCategory(page, categoryProp);
  const status = extractStatus(page, statusProp);
  const publishedAt = extractPublishedAt(page, publishedAtProp);
  const excerpt = extractExcerpt(page, excerptProp, blocks);
  const coverImage = extractCoverImage(page);

  // 计算阅读时长
  const rawContent = blocks ? blocksToMarkdown(blocks) : '';
  const readingTime = calculateReadingTime(rawContent).minutes;

  return {
    id: page.id,
    slug,
    title,
    excerpt,
    coverImage,
    tags,
    category,
    publishedAt,
    updatedAt: page.last_edited_time,
    readingTime,
    status,
  };
}

/**
 * 将 Notion Page 转换为 PostDetail
 *
 * @param page - Notion Page 对象
 * @param blocks - 页面内容块
 * @param options - 转换选项
 * @returns PostDetail
 */
export function transformToPostDetail(
  page: PageObjectResponse,
  blocks: BlockObjectResponse[] = [],
  options: TransformPostOptions = {}
): PostDetail {
  // 首先转换为摘要
  const summary = transformToPostSummary(page, blocks, options);

  // 转换内容块
  const content = blocks.map(block => transformBlockToInternal(block));

  // 根据选项决定是否生成目录（默认生成）
  const shouldGenerateToc = options.generateToc ?? true;
  const toc = shouldGenerateToc ? generateToc(blocks) : [];

  // 生成原始内容（Markdown）
  const rawContent = blocksToMarkdown(blocks);

  return {
    ...summary,
    content,
    rawContent,
    toc,
  };
}

/**
 * 从内容块生成目录
 */
function generateToc(blocks: BlockObjectResponse[]): TocItem[] {
  const toc: TocItem[] = [];
  let headingCounter = 0;

  for (const block of blocks) {
    if ('heading_1' in block && block.heading_1?.rich_text) {
      headingCounter++;
      const text = richTextToPlainText(block.heading_1.rich_text);
      const slug = `heading-${headingCounter}`;
      toc.push({
        id: block.id,
        text,
        level: 1,
        slug,
      });
    } else if ('heading_2' in block && block.heading_2?.rich_text) {
      headingCounter++;
      const text = richTextToPlainText(block.heading_2.rich_text);
      const slug = `heading-${headingCounter}`;
      toc.push({
        id: block.id,
        text,
        level: 2,
        slug,
      });
    } else if ('heading_3' in block && block.heading_3?.rich_text) {
      headingCounter++;
      const text = richTextToPlainText(block.heading_3.rich_text);
      const slug = `heading-${headingCounter}`;
      toc.push({
        id: block.id,
        text,
        level: 3,
        slug,
      });
    }
  }

  return toc;
}

/**
 * 将 Notion 块转换为 Markdown 字符串（辅助函数）
 */
function blocksToMarkdown(blocks: BlockObjectResponse[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    let line = '';

    if ('paragraph' in block && block.paragraph?.rich_text) {
      line = richTextToPlainText(block.paragraph.rich_text);
    } else if ('heading_1' in block && block.heading_1?.rich_text) {
      line = `# ${richTextToPlainText(block.heading_1.rich_text)}`;
    } else if ('heading_2' in block && block.heading_2?.rich_text) {
      line = `## ${richTextToPlainText(block.heading_2.rich_text)}`;
    } else if ('heading_3' in block && block.heading_3?.rich_text) {
      line = `### ${richTextToPlainText(block.heading_3.rich_text)}`;
    } else if ('bulleted_list_item' in block && block.bulleted_list_item?.rich_text) {
      line = `- ${richTextToPlainText(block.bulleted_list_item.rich_text)}`;
    } else if ('numbered_list_item' in block && block.numbered_list_item?.rich_text) {
      line = `1. ${richTextToPlainText(block.numbered_list_item.rich_text)}`;
    } else if ('quote' in block && block.quote?.rich_text) {
      line = `> ${richTextToPlainText(block.quote.rich_text)}`;
    } else if ('code' in block && block.code?.rich_text) {
      const language = block.code.language || '';
      const code = richTextToPlainText(block.code.rich_text);
      line = `\`\`\`${language}\n${code}\n\`\`\``;
    } else if ('divider' in block) {
      line = '---';
    }

    if (line) {
      lines.push(line);
    }
  }

  return lines.join('\n\n');
}

/**
 * 批量转换 PostSummary
 *
 * @param pages - Notion Page 数组
 * @param options - 转换选项
 * @returns PostSummary 数组
 */
export function transformToPostSummaries(
  pages: PageObjectResponse[],
  options: TransformPostOptions = {}
): PostSummary[] {
  const { existingSlugs = new Set<string>() } = options;

  return pages.map((page, index) => {
    // 为每个页面创建独立的 slug 集合（已处理前面的冲突）
    const slugsForPage = new Set<string>();
    for (let i = 0; i < index; i++) {
      const title = extractPropertyValue(pages[i], options.propertyMapping?.title || DEFAULT_PROPERTY_MAPPING.title) as string || 'Untitled';
      let slug = extractPropertyValue(pages[i], options.propertyMapping?.slug || DEFAULT_PROPERTY_MAPPING.slug) as string;
      if (!slug) {
        slug = generateSlug(title);
      }
      slugsForPage.add(slug);
    }

    const pageSlugs = new Set([...existingSlugs, ...slugsForPage]);
    return transformToPostSummary(page, undefined, {
      ...options,
      existingSlugs: pageSlugs,
    });
  });
}
