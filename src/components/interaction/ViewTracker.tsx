'use client';

import { useEffect } from 'react';

interface ViewTrackerProps {
  slug: string;
}

export function ViewTracker({ slug }: ViewTrackerProps) {
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/view?slug=${encodeURIComponent(slug)}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    }).catch(() => {
      // Ignore tracking errors in UI.
    });

    return () => controller.abort();
  }, [slug]);

  return null;
}

