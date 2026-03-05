import { createHmac, timingSafeEqual } from 'crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type NotionWebhookPayload = {
  type?: string;
  verification_token?: string;
  data?: {
    id?: string;
    parent?: {
      id?: string;
      type?: string;
    };
    data_source_id?: string;
  };
  entity?: {
    id?: string;
    type?: string;
    parent?: {
      id?: string;
      type?: string;
    };
    data_source_id?: string;
  };
};

const NOTION_EVENT_PREFIXES = ['page.', 'data_source.'];

function toString(value: string | null): string {
  return (value || '').trim();
}

function normalizeId(value: string): string {
  return value.replace(/-/g, '').toLowerCase();
}

function hasWebhookSecretConfigured(): boolean {
  return Boolean(process.env.NOTION_WEBHOOK_SECRET?.trim());
}

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.NOTION_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
  const signature = signatureHeader.trim().toLowerCase();

  // Notion commonly sends header as "sha256=<hex>"
  const received = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  if (!/^[0-9a-f]+$/.test(received) || received.length !== computed.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(computed, 'hex'));
}

function extractEventType(payload: NotionWebhookPayload): string {
  return toString(payload.type || '');
}

function isNotionContentEvent(eventType: string): boolean {
  return NOTION_EVENT_PREFIXES.some((prefix) => eventType.startsWith(prefix));
}

function getTrackedSourceIds(): string[] {
  const ids = [
    process.env.NOTION_DATA_SOURCE_ID,
    process.env.NOTION_DATABASE_ID,
  ]
    .map((item) => toString(item || ''))
    .filter(Boolean)
    .map(normalizeId);

  return Array.from(new Set(ids));
}

function payloadMatchesTrackedSource(payload: NotionWebhookPayload): boolean {
  const tracked = getTrackedSourceIds();
  if (!tracked.length) return true;

  const candidateIds = [
    payload.data?.data_source_id,
    payload.entity?.data_source_id,
    payload.data?.id,
    payload.entity?.id,
    payload.data?.parent?.id,
    payload.entity?.parent?.id,
  ]
    .map((item) => toString(item || ''))
    .filter(Boolean)
    .map(normalizeId);

  if (!candidateIds.length) return false;
  return candidateIds.some((id) => tracked.includes(id));
}

function revalidateBlogCaches(): void {
  revalidateTag('posts');
  revalidateTag('tags');
  revalidateTag('categories');

  revalidatePath('/');
  revalidatePath('/latest');
  revalidatePath('/hot');
  revalidatePath('/archive');
  revalidatePath('/categories');
  revalidatePath('/tags');
  revalidatePath('/sitemap.xml');
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let payload: NotionWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as NotionWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Verification handshake payload from Notion
  if (payload.verification_token) {
    const configuredToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN?.trim();
    const incomingToken = payload.verification_token.trim();

    if (!configuredToken) {
      console.warn(
        '[NotionWebhook] NOTION_WEBHOOK_VERIFICATION_TOKEN is not configured yet.'
      );
      return NextResponse.json(
        {
          ok: false,
          message:
            'Webhook verification token received. Please set NOTION_WEBHOOK_VERIFICATION_TOKEN in env.',
          tokenPreview: `${incomingToken.slice(0, 4)}...${incomingToken.slice(-4)}`,
        },
        { status: 400 }
      );
    }

    if (configuredToken !== incomingToken) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, verified: true });
  }

  // Signature validation (strict in production when secret is configured)
  const signatureHeader =
    request.headers.get('x-notion-signature') ||
    request.headers.get('notion-signature') ||
    '';

  if (hasWebhookSecretConfigured()) {
    if (!signatureHeader || !verifySignature(rawBody, signatureHeader)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'NOTION_WEBHOOK_SECRET is required in production' },
      { status: 500 }
    );
  }

  const eventType = extractEventType(payload);
  if (!eventType) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'missing-event-type' });
  }

  if (!isNotionContentEvent(eventType)) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      eventType,
      reason: 'event-type-not-used-by-blog-cache',
    });
  }

  if (!payloadMatchesTrackedSource(payload)) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      eventType,
      reason: 'event-not-from-tracked-notion-source',
    });
  }

  revalidateBlogCaches();

  return NextResponse.json({
    ok: true,
    revalidated: true,
    eventType,
    at: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: 'Notion Webhook Endpoint',
    hint: 'Use POST from Notion webhook subscriptions.',
  });
}

