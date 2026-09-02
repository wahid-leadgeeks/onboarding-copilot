import { NextResponse } from 'next/server';
import { writeDiary } from '@/lib/sheets/client';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || typeof (body as Record<string, unknown>).content !== 'string') return NextResponse.json({ error: 'Learning content is required' }, { status: 400 });
  const content = String((body as Record<string, unknown>).content).trim();
  if (!content) return NextResponse.json({ error: 'Learning content cannot be empty' }, { status: 400 });
  if (content.length > 10_000) return NextResponse.json({ error: 'Learning content is too long' }, { status: 413 });
  try {
    const synced = await writeDiary(content);
    return NextResponse.json({ content, syncStatus: synced ? 'synced' : 'pending' }, { status: 201 });
  } catch {
    return NextResponse.json({ content, syncStatus: 'pending' }, { status: 201 });
  }
}
