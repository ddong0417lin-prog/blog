/**
 * ============================================================================
 * Block 内容块类型定义
 * ============================================================================
 *
 * 定义内部使用的 Block 类型，用于内容转换
 * 基于契约层的 Block 和 BlockType 定义
 *
 * @version 1.0.0
 * ============================================================================
 */

export type {
  Block,
  BlockType,
  TocItem,
} from '@/contracts/types';

/**
 * 扩展的 Block 属性
 * 用于存储 Notion 特定的属性
 */
export interface BlockProps {
  /** Notion 块类型 */
  notionType: string;

  /** 代码语言（仅 code 类型） */
  language?: string;

  /** 图片 alt 文本（仅 image 类型） */
  alt?: string;

  /** 链接 URL（仅 link 类型） */
  url?: string;

  /** 是否选中（仅 to_do 类型） */
  checked?: boolean;

  /** 引用来源（仅 bookmark 类型） */
  caption?: string;

  /** 调用块图标（仅 callout 类型） */
  icon?: string;

  /** 调用块颜色（仅 callout 类型） */
  color?: string;
}

/**
 * 完整的 Block 类型，包含扩展属性
 */
export interface ExtendedBlock {
  id: string;
  type: string;
  content: string;
  children?: ExtendedBlock[];
  props?: BlockProps;
}

/**
 * 富文本片段
 */
export interface RichTextFragment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  link?: string;
  color?: string;
}

/**
 * Block 转换选项
 */
export interface TransformOptions {
  /** 是否生成目录 */
  generateToc?: boolean;

  /** 是否包含子块 */
  includeChildren?: boolean;

  /** 最大递归深度 */
  maxDepth?: number;
}