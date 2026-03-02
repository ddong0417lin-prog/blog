/**
 * ============================================================================
 * Footer 页脚组件
 * ============================================================================
 *
 * 站点页脚，显示版权信息和链接
 */

import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground">
          © {currentYear} {SITE_CONFIG.name}. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link
            href={SITE_CONFIG.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
          <Link
            href={SITE_CONFIG.links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Twitter
          </Link>
        </div>
      </div>
    </footer>
  );
}