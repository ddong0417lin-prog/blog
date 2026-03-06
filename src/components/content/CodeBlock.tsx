'use client';

/**
 * ============================================================================
 * CodeBlock 代码块组件
 * ============================================================================
 *
 * 使用 Shiki 进行代码高亮，支持主题切换
 */

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  codeBlockFrameClassName,
  codeBlockInnerPreClassName,
  codeBlockScrollContainerClassName,
} from '@/components/content/code-block-styles';

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const { theme } = useTheme();
  const [html, setHtml] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 客户端动态获取高亮后的代码
    async function highlight() {
      try {
        const res = await fetch('/api/highlight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language, theme: theme === 'dark' ? 'github-dark' : 'github-light' }),
        });
        const data = await res.json();
        setHtml(data.html);
      } catch {
        // 降级显示
        setHtml(`<pre class="${codeBlockInnerPreClassName}"><code>${escapeHtml(code)}</code></pre>`);
      }
    }

    if (mounted) {
      highlight();
    }
  }, [code, language, theme, mounted]);

  if (!mounted) {
    return (
      <div className={codeBlockFrameClassName}>
        <div className={codeBlockScrollContainerClassName}>
          <pre className={codeBlockInnerPreClassName}>
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={codeBlockFrameClassName}>
      <div
        className={`${codeBlockScrollContainerClassName} [&_pre]:!m-0 [&_pre]:!inline-block [&_pre]:!min-w-full [&_pre]:!overflow-visible [&_pre]:!bg-transparent [&_pre]:!p-3`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
