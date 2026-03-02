/**
 * ============================================================================
 * Slug 生成工具
 * ============================================================================
 *
 * 使用 github-slugger 生成 URL 友好的 slug
 * 支持中文标题转拼音/英文
 *
 * @version 1.0.0
 * ============================================================================
 */

import GithubSlugger from 'github-slugger';

/**
 * 中文到拼音的映射（常用字）
 * 用于基本的 transliteration
 */
const chineseToPinyin: Record<string, string> = {
  // 常用汉字映射（简化版）
  '一': 'yi', '二': 'er', '三': 'san', '四': 'si', '五': 'wu',
  '六': 'liu', '七': 'qi', '八': 'ba', '九': 'jiu', '十': 'shi',
  '百': 'bai', '千': 'qian', '万': 'wan', '亿': 'yi',
  '中': 'zhong', '国': 'guo', '人': 'ren', '民': 'min',
  '我': 'wo', '你': 'ni', '他': 'ta', '她': 'ta', '它': 'ta',
  '是': 'shi', '在': 'zai', '有': 'you', '和': 'he',
  '这': 'zhe', '那': 'na', '来': 'lai', '去': 'qu',
  '大': 'da', '小': 'xiao', '多': 'duo', '少': 'shao',
  '好': 'hao', '坏': 'huai', '新': 'xin', '旧': 'jiu',
  '天': 'tian', '地': 'di', '日': 'ri', '月': 'yue',
  '年': 'nian', '时': 'shi', '分': 'fen', '秒': 'miao',
  '学': 'xue', '习': 'xi', '工': 'gong', '作': 'zuo',
  '生': 'sheng', '活': 'huo', '爱': 'ai', '恨': 'hen',
  '看': 'kan', '听': 'ting', '说': 'shuo', '写': 'xie',
  '读': 'du', '书': 'shu', '字': 'zi',
  '程': 'cheng', '序': 'xu', '码': 'ma', '开': 'kai',
  '网': 'wang', '站': 'zhan', '页': 'ye',
  '博': 'bo', '客': 'ke', '章': 'zhang',
  '类': 'lei', '标': 'biao', '签': 'qian',
  '评': 'ping', '论': 'lun', '享': 'xiang',
  '首': 'shou', '列': 'lie', '表': 'biao',
  '图': 'tu', '片': 'pian', '视': 'shi', '频': 'pin',
  '音': 'yin', '乐': 'le', '功': 'gong', '能': 'neng',
  '文': 'wen',
};

/**
 * 简单的中文字符检测
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 简单的中文转拼音实现
 * 注意：这是一个简化版本，可能不完全准确
 * 建议在生产环境中使用完整的拼音库
 */
function transliterateChinese(text: string): string {
  let result = '';

  for (const char of text) {
    if (chineseToPinyin[char]) {
      result += chineseToPinyin[char];
    } else {
      // 非中文字符保留
      result += char;
    }
  }

  return result;
}

/**
 * 从标题生成 slug
 *
 * 每次调用使用新的 GithubSlugger 实例，确保同标题多次调用输出一致。
 * 冲突去重由 resolveSlugConflict 或 generateUniqueSlug 控制。
 *
 * @param title - 文章标题
 * @returns URL 友好的 slug 字符串
 */
export function generateSlug(title: string): string {
  // 边界情况：空标题
  if (!title || title.trim() === '') {
    return 'untitled';
  }

  // 处理中文标题
  let slugText = title;

  if (containsChinese(title)) {
    // 尝试使用 transliteration
    slugText = transliterateChinese(title);
  }

  // 每次调用使用新实例，确保结果稳定
  const slugger = new GithubSlugger();
  return slugger.slug(slugText);
}

/**
 * 处理 slug 冲突
 *
 * @param slug - 基础 slug
 * @param existing - 已存在的 slug 集合
 * @returns 不冲突的 slug
 */
export function resolveSlugConflict(slug: string, existing: Set<string>): string {
  // 如果 slug 不冲突，直接返回
  if (!existing.has(slug)) {
    return slug;
  }

  // 冲突处理：添加序号
  let counter = 1;
  let newSlug = `${slug}-${counter}`;

  while (existing.has(newSlug)) {
    counter++;
    newSlug = `${slug}-${counter}`;
  }

  return newSlug;
}

/**
 * 验证 slug 格式
 *
 * @param slug - 要验证的 slug
 * @returns 是否有效
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim() === '') {
    return false;
  }

  // slug 只能是字母、数字、连字符和下划线
  // 不能以数字开头
  const validSlugPattern = /^[a-z][a-z0-9-]*$/;

  return validSlugPattern.test(slug);
}

/**
 * 从现有 slug 集合生成唯一 slug
 *
 * @param title - 文章标题
 * @param existing - 已存在的 slug 集合
 * @returns 唯一的 slug
 */
export function generateUniqueSlug(title: string, existing: Set<string>): string {
  const baseSlug = generateSlug(title);
  return resolveSlugConflict(baseSlug, existing);
}

/**
 * 清理 slug
 * 移除特殊字符，确保格式正确
 *
 * @param slug - 原始 slug
 * @returns 清理后的 slug
 */
export function cleanSlug(slug: string): string {
  // 移除前后空格
  let cleaned = slug.trim();

  // 移除非法字符
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')  // 多个连字符替换为单个
    .replace(/^-|-$/g, '');  // 移除首尾连字符

  return cleaned || 'untitled';
}