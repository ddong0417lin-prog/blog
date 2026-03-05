'use client';

const VISITOR_ID_KEY = 'blog:visitor_id';

function generateVisitorId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server';

  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const id = generateVisitorId();
  window.localStorage.setItem(VISITOR_ID_KEY, id);
  return id;
}

