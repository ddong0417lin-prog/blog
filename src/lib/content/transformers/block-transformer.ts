/**
 * ============================================================================
 * Block 转换器
 * ============================================================================
 *
 * 将 Notion Block 对象转换为内部 Block 格式
 *
 * @version 1.0.0
 * ============================================================================
 */

import type {
  BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import {
  Block,
  BlockType,
} from '@/contracts/types';

import { richTextToHtml, richTextToMarkdown } from './rich-text-transformer';

/**
 * Notion Block 类型到内部 BlockType 的映射
 */
const BLOCK_TYPE_MAP: Record<string, BlockType> = {
  paragraph: 'paragraph',
  heading_1: 'heading_1',
  heading_2: 'heading_2',
  heading_3: 'heading_3',
  bulleted_list_item: 'bulleted_list_item',
  numbered_list_item: 'numbered_list_item',
  to_do: 'to_do',
  quote: 'quote',
  code: 'code',
  image: 'image',
  divider: 'divider',
  bookmark: 'bookmark',
  embed: 'embed',
  callout: 'callout',
};

/**
 * 转换选项
 */
export interface TransformBlockOptions {
  /** 是否包含子块 */
  includeChildren?: boolean;

  /** 最大递归深度 */
  maxDepth?: number;
}

/**
 * 提取富文本内容
 */
function extractRichTextContent(block: BlockObjectResponse): string {
  const blockType = block.type;

  if (!(blockType in block)) {
    return '';
  }

  const blockData = (block as Record<string, unknown>)[blockType] as {
    rich_text?: Array<{ plain_text: string }>;
  };

  if (!blockData?.rich_text) {
    return '';
  }

  return blockData.rich_text.map(t => t.plain_text).join('');
}

/**
 * 提取图片 URL
 */
function extractImageUrl(block: BlockObjectResponse): string | undefined {
  if (!('image' in block)) {
    return undefined;
  }

  const image = block.image;

  if (image.type === 'file') {
    return image.file.url;
  }

  if (image.type === 'external') {
    return image.external.url;
  }

  return undefined;
}

/**
 * 提取图片 caption
 */
function extractImageCaption(block: BlockObjectResponse): string {
  if (!('image' in block)) {
    return '';
  }

  const image = block.image;

  if (!image.caption) {
    return '';
  }

  return image.caption.map(t => t.plain_text).join('');
}

/**
 * 提取代码语言
 */
function extractCodeLanguage(block: BlockObjectResponse): string | undefined {
  if (!('code' in block)) {
    return undefined;
  }

  return block.code.language;
}

/**
 * 提取 to_do 状态
 */
function extractToDoChecked(block: BlockObjectResponse): boolean {
  if (!('to_do' in block)) {
    return false;
  }

  return block.to_do.checked || false;
}

/**
 * 提取引用内容
 */
function extractQuoteContent(block: BlockObjectResponse): string {
  if (!('quote' in block)) {
    return '';
  }

  const quote = block.quote;

  if (!quote.rich_text) {
    return '';
  }

  return quote.rich_text.map(t => t.plain_text).join('');
}

/**
 * 提取 bookmark URL
 */
function extractBookmarkUrl(block: BlockObjectResponse): string | undefined {
  if (!('bookmark' in block)) {
    return undefined;
  }

  return block.bookmark.url;
}

/**
 * 提取 bookmark caption
 */
function extractBookmarkCaption(block: BlockObjectResponse): string {
  if (!('bookmark' in block)) {
    return '';
  }

  const bookmark = block.bookmark;

  if (!bookmark.caption) {
    return '';
  }

  return bookmark.caption.map(t => t.plain_text).join('');
}

/**
 * 提取 callout 图标
 */
function extractCalloutIcon(block: BlockObjectResponse): string | undefined {
  if (!('callout' in block)) {
    return undefined;
  }

  const callout = block.callout;

  if (!callout.icon) {
    return undefined;
  }

  if (callout.icon.type === 'emoji') {
    return callout.icon.emoji;
  }

  return undefined;
}

/**
 * 提取 callout 颜色
 */
function extractCalloutColor(block: BlockObjectResponse): string | undefined {
  if (!('callout' in block)) {
    return undefined;
  }

  return block.callout.color;
}

/**
 * 将 Notion Block 转换为内部 Block 格式
 *
 * @param block - Notion Block 对象
 * @param options - 转换选项
 * @returns 内部 Block 对象
 */
export function transformBlockToInternal(
  block: BlockObjectResponse,
  options: TransformBlockOptions = {}
): Block {
  const { includeChildren = true } = options;

  const blockType = block.type;
  const internalType = BLOCK_TYPE_MAP[blockType] || 'paragraph';

  let content = '';
  let props: Record<string, unknown> = {};

  // 根据不同的块类型提取内容
  switch (blockType) {
    case 'paragraph':
      content = extractRichTextContent(block);
      break;

    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      content = extractRichTextContent(block);
      break;

    case 'bulleted_list_item':
      content = extractRichTextContent(block);
      break;

    case 'numbered_list_item':
      content = extractRichTextContent(block);
      break;

    case 'to_do':
      content = extractRichTextContent(block);
      props = { checked: extractToDoChecked(block) };
      break;

    case 'quote':
      content = extractQuoteContent(block);
      break;

    case 'code':
      content = extractRichTextContent(block);
      props = { language: extractCodeLanguage(block) };
      break;

    case 'image':
      content = extractImageUrl(block) || '';
      props = { alt: extractImageCaption(block) };
      break;

    case 'divider':
      content = '';
      break;

    case 'bookmark':
      content = extractBookmarkUrl(block) || '';
      props = { caption: extractBookmarkCaption(block) };
      break;

    case 'embed':
      content = extractRichTextContent(block);
      break;

    case 'callout':
      content = extractRichTextContent(block);
      props = {
        icon: extractCalloutIcon(block),
        color: extractCalloutColor(block),
      };
      break;

    default:
      content = extractRichTextContent(block);
  }

  // 递归处理子块
  let children: Block[] | undefined;

  if (includeChildren && 'has_children' in block && block.has_children) {
    // 注意：实际子块需要通过额外 API 获取
    // 这里仅标记存在子块，实际内容由调用方处理
    children = [];
  }

  return {
    id: block.id,
    type: internalType,
    content,
    children,
    props,
  };
}

/**
 * 将 Notion Blocks 数组转换为内部 Block 数组
 *
 * @param blocks - Notion Block 数组
 * @param options - 转换选项
 * @returns 内部 Block 数组
 */
export function transformBlocksToInternal(
  blocks: BlockObjectResponse[],
  options: TransformBlockOptions = {}
): Block[] {
  return blocks.map(block => transformBlockToInternal(block, options));
}

/**
 * 从内部 Block 转换为 HTML
 *
 * @param block - 内部 Block 对象
 * @returns HTML 字符串
 */
export function blockToHtml(block: Block): string {
  const { type, content, props } = block;

  switch (type) {
    case 'heading_1':
      return `<h1>${content}</h1>`;

    case 'heading_2':
      return `<h2>${content}</h2>`;

    case 'heading_3':
      return `<h3>${content}</h3>`;

    case 'paragraph':
      return `<p>${content}</p>`;

    case 'bulleted_list_item':
      return `<li>${content}</li>`;

    case 'numbered_list_item':
      return `<li>${content}</li>`;

    case 'to_do':
      const checked = props?.checked ? 'checked' : '';
      return `<input type="checkbox" ${checked} disabled /> ${content}`;

    case 'quote':
      return `<blockquote>${content}</blockquote>`;

    case 'code':
      const language = props?.language || '';
      return `<pre><code class="language-${language}">${content}</code></pre>`;

    case 'image':
      const alt = props?.alt || '';
      return `<img src="${content}" alt="${alt}" />`;

    case 'divider':
      return '<hr />';

    case 'bookmark':
      const caption = props?.caption || '';
      return `<a href="${content}" target="_blank">${caption || content}</a>`;

    case 'callout':
      const icon = props?.icon || '💡';
      const color = props?.color || '';
      return `<div class="callout" data-color="${color}">${icon} ${content}</div>`;

    case 'embed':
      return `<iframe src="${content}"></iframe>`;

    default:
      return `<p>${content}</p>`;
  }
}

/**
 * 从内部 Block 转换为 Markdown
 *
 * @param block - 内部 Block 对象
 * @returns Markdown 字符串
 */
export function blockToMarkdown(block: Block): string {
  const { type, content, props } = block;

  switch (type) {
    case 'heading_1':
      return `# ${content}\n\n`;

    case 'heading_2':
      return `## ${content}\n\n`;

    case 'heading_3':
      return `### ${content}\n\n`;

    case 'paragraph':
      return `${content}\n\n`;

    case 'bulleted_list_item':
      return `- ${content}\n`;

    case 'numbered_list_item':
      return `1. ${content}\n`;

    case 'to_do':
      const checked = props?.checked ? '[x]' : '[ ]';
      return `${checked} ${content}\n`;

    case 'quote':
      return `> ${content}\n\n`;

    case 'code':
      const language = props?.language || '';
      return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;

    case 'image':
      const alt = props?.alt || '';
      return `![${alt}](${content})\n\n`;

    case 'divider':
      return '---\n\n';

    case 'bookmark':
      const caption = props?.caption || '';
      return `[${caption || content}](${content})\n\n`;

    case 'callout':
      const icon = props?.icon || '💡';
      return `> ${icon} ${content}\n\n`;

    case 'embed':
      return `${content}\n\n`;

    default:
      return `${content}\n\n`;
  }
}