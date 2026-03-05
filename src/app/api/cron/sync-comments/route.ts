import { NextRequest, NextResponse } from 'next/server';
import { getAllPublishedPosts } from '@/app/actions/get-posts';
import { syncCommentCounts } from '@/lib/redis/client';
import { SITE_CONFIG } from '@/lib/constants';

type DiscussionNode = {
  title: string;
  comments?: { totalCount?: number | null } | null;
};

function normalize(value: string): string {
  return decodeURIComponent(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/+$/, '');
}

function parseRepo(value?: string): { owner: string; name: string } | null {
  if (!value) return null;
  const [owner, name] = value.split('/');
  if (!owner || !name) return null;
  return { owner, name };
}

function buildCandidates(post: { id: string; slug: string; title: string }, mapping: string): string[] {
  const postPath = `/posts/${encodeURIComponent(post.id)}`;
  const site = SITE_CONFIG.url.replace(/\/+$/, '');

  const byMapping: Record<string, string[]> = {
    pathname: [postPath],
    url: [`${site}${postPath}`],
    title: [post.title],
    specific: [post.slug, post.id],
    number: [post.slug, post.id],
  };

  const fallback = [postPath, `${site}${postPath}`, post.slug, post.id, post.title];
  return [...(byMapping[mapping] || []), ...fallback];
}

async function fetchAllDiscussions(
  owner: string,
  name: string,
  githubToken: string
): Promise<DiscussionNode[]> {
  const discussions: DiscussionNode[] = [];
  let hasNextPage = true;
  let afterCursor: string | null = null;

  const query = `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            title
            comments {
              totalCount
            }
          }
        }
      }
    }
  `;

  while (hasNextPage) {
    const response: Response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${githubToken}`,
      },
      body: JSON.stringify({
        query,
        variables: { owner, name, after: afterCursor },
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL failed: ${response.status}`);
    }

    const payload: any = await response.json();
    if (payload.errors?.length) {
      throw new Error(`GitHub GraphQL error: ${payload.errors[0]?.message || 'unknown'}`);
    }

    const connection = payload?.data?.repository?.discussions;
    const nodes = (connection?.nodes || []) as DiscussionNode[];
    discussions.push(...nodes);

    hasNextPage = Boolean(connection?.pageInfo?.hasNextPage);
    afterCursor = connection?.pageInfo?.endCursor || null;
  }

  return discussions;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const querySecret = request.nextUrl.searchParams.get('secret') || '';

  return bearer === secret || querySecret === secret;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const repo = parseRepo(process.env.NEXT_PUBLIC_GISCUS_REPO);
  const mapping = (process.env.NEXT_PUBLIC_GISCUS_MAPPING || 'pathname').toLowerCase();

  if (!githubToken || !repo) {
    return NextResponse.json(
      {
        error: 'Missing GITHUB_TOKEN or NEXT_PUBLIC_GISCUS_REPO',
      },
      { status: 400 }
    );
  }

  try {
    const [posts, discussions] = await Promise.all([
      getAllPublishedPosts(),
      fetchAllDiscussions(repo.owner, repo.name, githubToken),
    ]);

    const candidateToPostId = new Map<string, string>();
    const postIdSet = new Set(posts.map((post) => post.id));

    for (const post of posts) {
      for (const candidate of buildCandidates(post, mapping)) {
        candidateToPostId.set(normalize(candidate), post.id);
      }
    }

    const commentCounts: Record<string, number> = {};
    for (const post of posts) {
      commentCounts[post.id] = 0;
    }

    for (const discussion of discussions) {
      const targetPostId = candidateToPostId.get(normalize(discussion.title || ''));
      if (!targetPostId || !postIdSet.has(targetPostId)) continue;
      commentCounts[targetPostId] = discussion.comments?.totalCount ?? 0;
    }

    await syncCommentCounts(commentCounts);

    const matched = Object.values(commentCounts).filter((count) => count > 0).length;

    return NextResponse.json({
      ok: true,
      posts: posts.length,
      discussions: discussions.length,
      matched,
      mapping,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to sync comments:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync comments',
        message: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    );
  }
}
