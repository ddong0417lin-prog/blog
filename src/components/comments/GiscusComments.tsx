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
  }), []);

  // 检查是否配置了 Giscus
  const isConfigured = giscusConfig.repo && giscusConfig.repoId && giscusConfig.categoryId;

  useEffect(() => {
    if (!isConfigured || !containerRef.current) return;

    // 清空容器
    containerRef.current.innerHTML = '';

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
    script.setAttribute('data-theme', resolvedTheme === 'dark' ? 'github-dark' : 'github-light');
    script.setAttribute('data-lang', giscusConfig.lang);
    script.setAttribute('data-term', slug);
    script.crossOrigin = 'anonymous';
    script.async = true;

    containerRef.current.appendChild(script);

    // 清理函数
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [slug, resolvedTheme, isConfigured, giscusConfig]);

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