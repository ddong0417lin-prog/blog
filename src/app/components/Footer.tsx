import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 md:py-10">
      <div className="page-container">
        <div className="paper-card flex flex-col items-center justify-between gap-4 px-5 py-6 md:h-20 md:flex-row md:px-6">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {SITE_CONFIG.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href={SITE_CONFIG.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
              data-interactive="true"
            >
              GitHub
            </Link>
            <Link
              href={SITE_CONFIG.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
              data-interactive="true"
            >
              Twitter
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
