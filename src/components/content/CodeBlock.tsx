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
        setHtml(`<pre class="overflow-x-auto p-4 bg-muted rounded-lg"><code>${escapeHtml(code)}</code></pre>`);
      }
    }

    if (mounted) {
      highlight();
    }
  }, [code, language, theme, mounted]);

  if (!mounted) {
    return (
      <pre className="overflow-x-auto p-4 bg-muted rounded-lg">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="not-prose my-5 overflow-hidden rounded-xl border border-border/80 bg-muted/55 p-3 shadow-sm [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
