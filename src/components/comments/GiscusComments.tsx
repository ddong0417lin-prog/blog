'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';

/**
 * Giscus 评论组件
 * 基于 GitHub Discussions 的评论系统
 */
interface GiscusCommentsProps {
  slug: string;
}

export function GiscusComments({ slug }: GiscusCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // 使用 useMemo 稳定配置对象
  const giscusConfig = useMemo(() => ({
    repo: process.env.NEXT_PUBLIC_GISCUS_REPO || '',
    repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID || '',
    categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || '',
    category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY || 'Announcements',
    mapping: process.env.NEXT_PUBLIC_GISCUS_MAPPING || 'pathname',
    reactionsEnabled: process.env.NEXT_PUBLIC_GISCUS_REACTIONS_ENABLED || '1',
    emitMetadata: process.env.NEXT_PUBLIC_GISCUS_EMIT_METADATA || '0',
    inputPosition: process.env.NEXT_PUBLIC_GISCUS_INPUT_POSITION || 'top',
    lang: process.env.NEXT_PUBLIC_GISCUS_LANG || 'zh-CN',
    theme: process.env.NEXT_PUBLIC_GISCUS_THEME || '',
  }), []);

  const giscusTheme = useMemo(() => {
    // Respect explicit env theme first.
    if (giscusConfig.theme && giscusConfig.theme !== 'preferred_color_scheme') {
      return giscusConfig.theme;
    }

    // Prefer higher contrast defaults to avoid dark mode readability issues.
    return resolvedTheme === 'dark' ? 'dark_high_contrast' : 'light_high_contrast';
  }, [giscusConfig.theme, resolvedTheme]);

  // 检查是否配置了 Giscus
  const isConfigured = giscusConfig.repo && giscusConfig.repoId && giscusConfig.categoryId;

  useEffect(() => {
    if (!isConfigured || !containerRef.current) return;

    const container = containerRef.current;
    const iframe = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');

    // If giscus is already mounted, update theme only.
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme: giscusTheme } } },
        'https://giscus.app'
      );
      return;
    }

    // 清空容器
    container.innerHTML = '';

    // 创建 Giscus script
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', giscusConfig.repo);
    script.setAttribute('data-repo-id', giscusConfig.repoId);
    script.setAttribute('data-category', giscusConfig.category);
    script.setAttribute('data-category-id', giscusConfig.categoryId);
    script.setAttribute('data-mapping', giscusConfig.mapping);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', giscusConfig.reactionsEnabled);
    script.setAttribute('data-emit-metadata', giscusConfig.emitMetadata);
    script.setAttribute('data-input-position', giscusConfig.inputPosition);
    script.setAttribute('data-theme', giscusTheme);
    script.setAttribute('data-lang', giscusConfig.lang);
    script.setAttribute('data-term', slug);
    script.crossOrigin = 'anonymous';
    script.async = true;

    container.appendChild(script);

    // 清理函数
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [slug, isConfigured, giscusConfig, giscusTheme]);

  // 未配置时显示提示
  if (!isConfigured) {
    return (
      <div className="mt-8 p-4 border border-border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground text-center">
          评论功能未配置。请在 .env.local 中设置 Giscus 相关环境变量。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">评论</h2>
      <div
        ref={containerRef}
        className="giscus-container"
      />
    </div>
  );
}
