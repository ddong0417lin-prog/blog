'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import { dispatchFireworkBurst } from '@/components/effects/fx-events';

interface GiscusCommentsProps {
  slug: string;
}

export function GiscusComments({ slug }: GiscusCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoCelebratedRef = useRef(false);
  const lastMessageFireworkAtRef = useRef(0);
  const { resolvedTheme } = useTheme();

  const giscusConfig = useMemo(
    () => ({
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
    }),
    []
  );

  const giscusTheme = useMemo(() => {
    if (giscusConfig.theme && giscusConfig.theme !== 'preferred_color_scheme') {
      return giscusConfig.theme;
    }
    return resolvedTheme === 'dark' ? 'dark_high_contrast' : 'light_high_contrast';
  }, [giscusConfig.theme, resolvedTheme]);

  const isConfigured = giscusConfig.repo && giscusConfig.repoId && giscusConfig.categoryId;

  useEffect(() => {
    if (!isConfigured || !containerRef.current) return;

    const container = containerRef.current;
    const iframe = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');

    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme: giscusTheme } } },
        'https://giscus.app'
      );
      return;
    }

    container.innerHTML = '';

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

    return () => {
      container.innerHTML = '';
    };
  }, [slug, isConfigured, giscusConfig, giscusTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || hasAutoCelebratedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || hasAutoCelebratedRef.current) return;
        const rect = container.getBoundingClientRect();
        dispatchFireworkBurst({
          x: rect.left + rect.width / 2,
          y: rect.top + Math.min(80, rect.height / 3),
        });
        hasAutoCelebratedRef.current = true;
      },
      { threshold: 0.35 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://giscus.app') return;

      // Throttle to avoid fireworks spam during initial widget boot.
      const now = Date.now();
      if (now - lastMessageFireworkAtRef.current < 2200) return;
      lastMessageFireworkAtRef.current = now;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      dispatchFireworkBurst({
        x: rect.left + rect.width * 0.72,
        y: rect.top + Math.min(120, rect.height * 0.28),
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!isConfigured) {
    return (
      <div className="mt-8 rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-center text-sm text-muted-foreground">
          评论功能未配置。请在环境变量中设置 Giscus 相关参数。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <h2 className="mb-4 text-2xl font-semibold">评论</h2>
      <div ref={containerRef} className="giscus-container rounded-xl" />
    </div>
  );
}

