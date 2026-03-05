'use client';

import { useEffect } from 'react';
import { getOrCreateVisitorId } from '@/lib/client-visitor-id';

interface ViewTrackerProps {
  slug: string;
}

export function ViewTracker({ slug }: ViewTrackerProps) {
  useEffect(() => {
    const controller = new AbortController();
    const visitorId = getOrCreateVisitorId();

    fetch(
      `/api/view?slug=${encodeURIComponent(slug)}&visitorId=${encodeURIComponent(visitorId)}`,
      {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'x-visitor-id': visitorId,
        },
      }
    ).catch(() => {
      // Ignore tracking errors in UI.
    });

    return () => controller.abort();
  }, [slug]);

  return null;
}