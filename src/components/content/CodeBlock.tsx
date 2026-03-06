'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  codeBlockFrameClassName,
  codeBlockInnerPreClassName,
  codeBlockScrollbarClassName,
  codeBlockScrollContainerClassName,
} from '@/components/content/code-block-styles';

interface CodeBlockProps {
  code: string;
  language: string;
}

const codeBlockPreOverrideClassName =
  '[&_pre]:!m-0 [&_pre]:!inline-block [&_pre]:!min-w-full [&_pre]:!overflow-visible [&_pre]:!bg-transparent [&_pre]:!p-3';

export function CodeBlock({ code, language }: CodeBlockProps) {
  const { theme } = useTheme();
  const [html, setHtml] = useState('');
  const [mounted, setMounted] = useState(false);
  const [scrollMetrics, setScrollMetrics] = useState({ clientWidth: 0, scrollWidth: 0 });
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollbarRef = useRef<HTMLDivElement | null>(null);
  const syncingSourceRef = useRef<'content' | 'scrollbar' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
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
        setHtml(`<pre class="${codeBlockInnerPreClassName}"><code>${escapeHtml(code)}</code></pre>`);
      }
    }

    if (mounted) {
      highlight();
    }
  }, [code, language, theme, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const contentNode = contentScrollRef.current;
    const scrollbarNode = scrollbarRef.current;
    if (!contentNode || !scrollbarNode) return;

    const syncMetrics = () => {
      setScrollMetrics({
        clientWidth: contentNode.clientWidth,
        scrollWidth: contentNode.scrollWidth,
      });
    };

    const syncFromContent = () => {
      if (syncingSourceRef.current === 'scrollbar') return;
      syncingSourceRef.current = 'content';
      scrollbarNode.scrollLeft = contentNode.scrollLeft;
      syncingSourceRef.current = null;
    };

    const syncFromScrollbar = () => {
      if (syncingSourceRef.current === 'content') return;
      syncingSourceRef.current = 'scrollbar';
      contentNode.scrollLeft = scrollbarNode.scrollLeft;
      syncingSourceRef.current = null;
    };

    syncMetrics();
    syncFromContent();

    const resizeObserver = new ResizeObserver(() => {
      syncMetrics();
      syncFromContent();
    });

    resizeObserver.observe(contentNode);
    const preNode = contentNode.querySelector('pre');
    if (preNode) {
      resizeObserver.observe(preNode);
    }

    contentNode.addEventListener('scroll', syncFromContent, { passive: true });
    scrollbarNode.addEventListener('scroll', syncFromScrollbar, { passive: true });
    window.addEventListener('resize', syncMetrics);

    return () => {
      resizeObserver.disconnect();
      contentNode.removeEventListener('scroll', syncFromContent);
      scrollbarNode.removeEventListener('scroll', syncFromScrollbar);
      window.removeEventListener('resize', syncMetrics);
    };
  }, [html, mounted]);

  const scrollbarTrackWidth = Math.max(scrollMetrics.scrollWidth, scrollMetrics.clientWidth, 1);

  if (!mounted) {
    return (
      <div className={codeBlockFrameClassName}>
        <div className={codeBlockScrollContainerClassName}>
          <pre className={codeBlockInnerPreClassName}>
            <code>{code}</code>
          </pre>
        </div>
        <div className={codeBlockScrollbarClassName} aria-hidden="true">
          <div style={{ width: '100%', minWidth: '100%', height: '1px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={codeBlockFrameClassName}>
      <div
        ref={contentScrollRef}
        className={`${codeBlockScrollContainerClassName} ${codeBlockPreOverrideClassName}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div
        ref={scrollbarRef}
        className={codeBlockScrollbarClassName}
        aria-label="代码块横向滚动条"
      >
        <div style={{ width: `${scrollbarTrackWidth}px`, minWidth: '100%', height: '1px' }} />
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
