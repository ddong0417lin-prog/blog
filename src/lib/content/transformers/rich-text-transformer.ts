/**
 * ============================================================================
 * 富文本转换器
 * ============================================================================
 *
 * 将 Notion Rich Text 对象转换为纯文本、HTML 或 Markdown
 *
 * @version 1.0.0
 * ============================================================================
 */

import type {
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

/**
 * Notion 支持的颜色类型
 */
type NotionColor =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'default_background'
  | 'gray_background'
  | 'brown_background'
  | 'orange_background'
  | 'yellow_background'
  | 'green_background'
  | 'blue_background'
  | 'purple_background'
  | 'pink_background'
  | 'red_background';

/**
 * 富文本注解类型
 */
interface Annotations {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: string;
}

/**
 * 富文本链接
 */
interface Link {
  type: 'url';
  url: string;
}

/**
 * 转换选项
 */
export interface TransformRichTextOptions {
  /** 是否保留链接 */
  preserveLinks?: boolean;

  /** 是否保留颜色 */
  preserveColor?: boolean;

  /** 自定义链接渲染函数 */
  renderLink?: (url: string, text: string) => string;

  /** 自定义颜色渲染函数 */
  renderColor?: (color: string, text: string) => string;
}

/**
 * 提取注解样式
 */
function extractAnnotations(richText: RichTextItemResponse): Annotations {
  return {
    bold: richText.annotations?.bold || false,
    italic: richText.annotations?.italic || false,
    strikethrough: richText.annotations?.strikethrough || false,
    underline: richText.annotations?.underline || false,
    code: richText.annotations?.code || false,
    color: richText.annotations?.color || 'default',
  };
}

/**
 * 提取链接
 */
function extractLink(richText: RichTextItemResponse): Link | undefined {
  if ('href' in richText && richText.href) {
    return {
      type: 'url',
      url: richText.href,
    };
  }
  return undefined;
}

/**
 * 富文本转纯文本
 *
 * @param richText - Notion Rich Text 数组
 * @returns 纯文本字符串
 */
export function richTextToPlainText(richText: RichTextItemResponse[]): string {
  if (!richText || !Array.isArray(richText)) {
    return '';
  }

  return richText.map(text => text.plain_text).join('');
}

/**
 * 富文本转 HTML
 *
 * @param richText - Notion Rich Text 数组
 * @param options - 转换选项
 * @returns HTML 字符串
 */
export function richTextToHtml(
  richText: RichTextItemResponse[],
  options: TransformRichTextOptions = {}
): string {
  const {
    preserveLinks = true,
    preserveColor = false,
    renderLink,
    renderColor,
  } = options;

  if (!richText || !Array.isArray(richText)) {
    return '';
  }

  return richText.map(text => {
    const { plain_text: content } = text;
    const annotations = extractAnnotations(text);
    const link = extractLink(text);

    let htmlContent = content;

    // 处理 HTML 转义
    htmlContent = htmlContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // 应用注解
    if (annotations.code) {
      htmlContent = `<code>${htmlContent}</code>`;
    }

    if (annotations.bold) {
      htmlContent = `<strong>${htmlContent}</strong>`;
    }

    if (annotations.italic) {
      htmlContent = `<em>${htmlContent}</em>`;
    }

    if (annotations.strikethrough) {
      htmlContent = `<s>${htmlContent}</s>`;
    }

    if (annotations.underline) {
      htmlContent = `<u>${htmlContent}</u>`;
    }

    // 处理颜色
    if (preserveColor && annotations.color && annotations.color !== 'default') {
      if (renderColor) {
        htmlContent = renderColor(annotations.color, htmlContent);
      } else {
        htmlContent = `<span style="color: ${annotations.color}">${htmlContent}</span>`;
      }
    }

    // 处理链接
    if (preserveLinks && link) {
      if (renderLink) {
        htmlContent = renderLink(link.url, htmlContent);
      } else {
        htmlContent = `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${htmlContent}</a>`;
      }
    }

    return htmlContent;
  }).join('');
}

/**
 * 富文本转 Markdown
 *
 * @param richText - Notion Rich Text 数组
 * @param options - 转换选项
 * @returns Markdown 字符串
 */
export function richTextToMarkdown(
  richText: RichTextItemResponse[],
  options: TransformRichTextOptions = {}
): string {
  const { preserveLinks = true } = options;

  if (!richText || !Array.isArray(richText)) {
    return '';
  }

  return richText.map(text => {
    const { plain_text: content } = text;
    const annotations = extractAnnotations(text);
    const link = extractLink(text);

    let mdContent = content;

    // Markdown 转义
    mdContent = mdContent
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/#/g, '\\#')
      .replace(/-/g, '\\-')
      .replace(/\+/g, '\\+')
      .replace(/!/g, '\\!');

    // 应用注解（需要从内到外应用）
    // 代码需要在最内层，然后是粗体、斜体等
    if (annotations.code) {
      mdContent = `\`${mdContent}\``;
    }

    if (annotations.strikethrough) {
      mdContent = `~~${mdContent}~~`;
    }

    if (annotations.italic) {
      mdContent = `*${mdContent}*`;
    }

    if (annotations.bold) {
      mdContent = `**${mdContent}**`;
    }

    if (annotations.underline) {
      // Markdown 没有原生的下划线，使用 HTML
      mdContent = `<u>${mdContent}</u>`;
    }

    // 处理链接
    if (preserveLinks && link) {
      mdContent = `[${mdContent}](${link.url})`;
    }

    return mdContent;
  }).join('');
}

/**
 * 创建富文本片段（用于测试）
 */
export function createRichText(
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    link?: string;
    strikethrough?: boolean;
    underline?: boolean;
    color?: NotionColor;
  } = {}
): RichTextItemResponse {
  const {
    bold = false,
    italic = false,
    code = false,
    link,
    strikethrough = false,
    underline = false,
    color = 'default',
  } = options;

  const richText: RichTextItemResponse = {
    plain_text: text,
    href: link || null,
    annotations: {
      bold,
      italic,
      strikethrough,
      underline,
      code,
      color,
    },
    type: 'text',
    text: {
      content: text,
      link: link ? { url: link } : null,
    },
  };

  return richText;
}

/**
 * 合并多个富文本数组
 */
export function mergeRichText(
  ...arrays: RichTextItemResponse[][]
): RichTextItemResponse[] {
  return arrays.flat();
}

/**
 * 验证富文本是否为空
 */
export function isRichTextEmpty(richText: RichTextItemResponse[]): boolean {
  if (!richText || !Array.isArray(richText)) {
    return true;
  }

  return richText.every(text => !text.plain_text || text.plain_text.trim() === '');
}

/**
 * 计算富文本中的纯文本长度
 */
export function getRichTextLength(richText: RichTextItemResponse[]): number {
  return richTextToPlainText(richText).length;
}