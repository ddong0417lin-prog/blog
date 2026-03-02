/**
 * ============================================================================
 * 阅读时长计算工具
 * ============================================================================
 *
 * 基于文章字数计算阅读时长
 * 默认阅读速度：200 字/分钟
 *
 * @version 1.0.0
 * ============================================================================
 */

/**
 * 默认阅读速度（字/分钟）
 */
const DEFAULT_READING_SPEED = 200;

/**
 * 配置选项
 */
export interface ReadingTimeOptions {
  /** 阅读速度（字/分钟） */
  speed?: number;

  /** 是否包含图片阅读时间 */
  includeImages?: boolean;

  /** 图片阅读时间加成（分钟/张） */
  imageTime?: number;
}

/**
 * 阅读时长结果
 */
export interface ReadingTimeResult {
  /** 分钟数 */
  minutes: number;

  /** 完整文本（包含 "X min read"） */
  text: string;

  /** 时间戳 */
  timestamp: number;
}

/**
 * 计算文本字数
 * 移除 Markdown/HTML 标签后统计
 *
 * @param content - 原始内容
 * @returns 字数
 */
function countWords(content: string): number {
  // 移除 HTML 标签
  let text = content.replace(/<[^>]*>/g, '');

  // 移除 Markdown 格式（代码块、图片、链接等）
  text = text
    .replace(/```[\s\S]*?```/g, '')  // 代码块
    .replace(/`[^`]*`/g, '')  // 行内代码
    .replace(/!\[.*?\]\(.*?\)/g, '')  // 图片
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')  // 链接，保留文字
    .replace(/#+\s/g, '')  // 标题符号
    .replace(/[*_~]/g, '')  // 强调符号
    .replace(/>\s/g, '')  // 引用符号
    .replace(/[-*+]\s/g, '')  // 列表符号
    .replace(/\d+\.\s/g, '');  // 数字列表

  // 统计字符数（中文按字，英文按词）
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = text
    .replace(/[\u4e00-\u9fa5]/g, ' ')  // 移除中文字符后统计英文
    .split(/\s+/)
    .filter(word => word.length > 0).length;

  // 中文字数 + 英文词数 = 总"字数"
  return chineseChars + englishWords;
}

/**
 * 统计图片数量
 *
 * @param content - 原始内容
 * @returns 图片数量
 */
function countImages(content: string): number {
  // 匹配 Markdown 图片和 HTML img 标签
  const markdownImages = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const htmlImages = (content.match(/<img[^>]*>/gi) || []).length;

  return markdownImages + htmlImages;
}

/**
 * 计算阅读时长
 *
 * @param content - 文章内容（支持 Markdown 或 HTML）
 * @param options - 配置选项
 * @returns 阅读时长结果
 */
export function calculateReadingTime(
  content: string,
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  const {
    speed = DEFAULT_READING_SPEED,
    includeImages = true,
    imageTime = 0.2, // 默认 12 秒/张图
  } = options;

  // 统计字数
  const wordCount = countWords(content);

  // 计算基础阅读时间
  let minutes = Math.ceil(wordCount / speed);

  // 图片加成
  if (includeImages) {
    const imageCount = countImages(content);
    minutes += Math.ceil(imageCount * imageTime);
  }

  // 最小值为 1 分钟
  minutes = Math.max(1, minutes);

  return {
    minutes,
    text: `${minutes} min read`,
    timestamp: Date.now(),
  };
}

/**
 * 格式化阅读时长
 *
 * @param minutes - 分钟数
 * @returns 格式化的文本
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) {
    return 'Less than 1 min read';
  }

  if (minutes === 1) {
    return '1 min read';
  }

  return `${minutes} min read`;
}

/**
 * 估算阅读时长（用于摘要展示）
 * 不需要精确统计，只需快速估算
 *
 * @param content - 原始内容
 * @returns 估算的分钟数
 */
export function estimateReadingTime(content: string): number {
  // 快速估算：假设平均每 200 字符 1 分钟
  const estimatedMinutes = Math.ceil(content.length / 200);
  return Math.max(1, estimatedMinutes);
}