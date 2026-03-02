/**
 * ============================================================================
 * Shiki 代码高亮配置
 * ============================================================================
 *
 * 使用 Shiki 进行服务端代码高亮
 */

import { createHighlighter, type Highlighter } from 'shiki';

let highlighterInstance: Highlighter | null = null;

/**
 * 获取 Shiki 高亮器实例（单例）
 */
export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'json',
        'html',
        'css',
        'bash',
        'shell',
        'markdown',
        'python',
        'go',
        'rust',
        'sql',
        'yaml',
      ],
    });
  }
  return highlighterInstance;
}

/**
 * 代码高亮（服务端）
 */
export async function highlightCode(
  code: string,
  language: string,
  theme: 'github-dark' | 'github-light' = 'github-dark'
): Promise<string> {
  try {
    const highlighter = await getHighlighter();

    return highlighter.codeToHtml(code, {
      lang: language.toLowerCase() || 'text',
      theme,
    });
  } catch (error) {
    // 如果语言不支持，使用纯文本
    console.warn(`Shiki highlight error for language "${language}":`, error);
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}