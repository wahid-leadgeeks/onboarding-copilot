import { NextResponse } from 'next/server';
import { heuristicSummary, requestSummary } from '@/lib/ai/client';

type SummarizeBody = { content?: unknown };

export async function POST(request: Request) {
  const body: SummarizeBody = await request.json().catch(() => ({}));
  if (typeof body.content !== 'string' || !body.content.trim()) {
    return NextResponse.json({ error: 'Learning content is required' }, { status: 400 });
  }

  const raw = body.content.trim();
  if (raw.length > 10_000) return NextResponse.json({ error: 'Learning content is too long' }, { status: 413 });
  const generated = await requestSummary(raw);
  const summary = generated?.summary ?? heuristicSummary(raw);
  return NextResponse.json({ raw, summary, confirmed: false, requiresConfirmation: true });
}
