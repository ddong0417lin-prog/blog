#!/usr/bin/env node

import { Redis } from '@upstash/redis';

function sanitize(value) {
  if (!value) return '';
  return String(value).trim().replace(/^['"]|['"]$/g, '');
}

const url = sanitize(process.env.UPSTASH_REDIS_REST_URL);
const token = sanitize(process.env.UPSTASH_REDIS_REST_TOKEN);

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const redis = new Redis({ url, token });
const shouldDeleteLegacy = process.argv.includes('--apply');
const scanCount = 500;

function parseLegacyKey(key) {
  // blog:visitor:[articleId]:[fingerprint]
  if (!key.startsWith('blog:visitor:')) return null;
  const parts = key.split(':');
  if (parts.length < 4) return null;
  const articleId = parts[2];
  const fingerprint = parts.slice(3).join(':');
  if (!articleId || !fingerprint) return null;
  return { articleId, fingerprint };
}

async function main() {
  let cursor = '0';
  let scanned = 0;
  let migrated = 0;
  let deleted = 0;

  console.log(
    `Starting migration: legacy String -> HLL (mode: ${shouldDeleteLegacy ? 'apply' : 'dry-run'})`
  );

  do {
    const result = await redis.scan(cursor, {
      match: 'blog:visitor:*',
      count: scanCount,
    });

    cursor = String(result[0] ?? '0');
    const keys = Array.isArray(result[1]) ? result[1] : [];
    scanned += keys.length;

    if (keys.length === 0) {
      continue;
    }

    const pfPipeline = redis.pipeline();
    const deletePipeline = redis.pipeline();

    for (const key of keys) {
      const parsed = parseLegacyKey(key);
      if (!parsed) continue;

      const hllKey = `blog:uv:${parsed.articleId}`;
      pfPipeline.pfadd(hllKey, parsed.fingerprint);
      migrated += 1;

      if (shouldDeleteLegacy) {
        deletePipeline.del(key);
        deleted += 1;
      }
    }

    await pfPipeline.exec();
    if (shouldDeleteLegacy) {
      await deletePipeline.exec();
    }
  } while (cursor !== '0');

  console.log(
    JSON.stringify(
      {
        scanned,
        migrated,
        deleted,
        mode: shouldDeleteLegacy ? 'apply' : 'dry-run',
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

