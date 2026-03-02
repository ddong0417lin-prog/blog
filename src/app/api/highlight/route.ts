import { NextRequest, NextResponse } from 'next/server';
import { highlightCode } from '@/lib/shiki/highlighter';

export async function POST(request: NextRequest) {
  try {
    const { code, language, theme } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const html = await highlightCode(
      code,
      language || 'text',
      theme || 'github-dark'
    );

    return NextResponse.json({ html });
  } catch (error) {
    console.error('Highlight error:', error);
    return NextResponse.json(
      { error: 'Failed to highlight code' },
      { status: 500 }
    );
  }
}