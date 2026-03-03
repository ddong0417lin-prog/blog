'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

/**
 * Giscus 配置类型
 */
interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: string;
  reactionsEnabled: string;
  emitMetadata: string;
  inputPosition: string;
  theme: string;
  lang: string;
}

/**
 * Giscus 评论组件属性
 */
interface GiscusCommentsProps {
  slug: string;
}

/**
 * Giscus 评论组件
 * 基于 GitHub Discussions 的评论系统
 */
export function GiscusComments({ slug }: GiscusCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Giscus 配置
  const config: GiscusConfig = {
    repo: process.env.NEXT_PUBLIC_GISCUS_REPO || '',
    repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID || '',
    category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY || 'Announcements',
    categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || '',
    mapping: process.env.NEXT_PUBLIC_GISCUS_MAPPING || 'pathname',
    reactionsEnabled: process.env.NEXT_PUBLIC_GISCUS_REACTIONS_ENABLED || '1',
    emitMetadata: process.env.NEXT_PUBLIC_GISCUS_EMIT_METADATA || '0',
    inputPosition: process.env.NEXT_PUBLIC_GISCUS_INPUT_POSITION || 'top',
    theme: resolvedTheme === 'dark' ? 'github-dark' : 'github-light',
    lang: process.env.NEXT_PUBLIC_GISCUS_LANG || 'zh-CN',
  };

  // 检查是否配置了 Giscus
  const isConfigured = config.repo && config.repoId && config.categoryId;

  useEffect(() => {
    if (!isConfigured || !containerRef.current) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    // 创建 Giscus script
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', config.repo);
    script.setAttribute('data-repo-id', config.repoId);
    script.setAttribute('data-category', config.category);
    script.setAttribute('data-category-id', config.categoryId);
    script.setAttribute('data-mapping', config.mapping);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', config.reactionsEnabled);
    script.setAttribute('data-emit-metadata', config.emitMetadata);
    script.setAttribute('data-input-position', config.inputPosition);
    script.setAttribute('data-theme', config.theme);
    script.setAttribute('data-lang', config.lang);
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
  }, [slug, resolvedTheme, isConfigured, config]);

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