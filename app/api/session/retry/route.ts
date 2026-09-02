import { NextResponse } from 'next/server';
import { writeSession } from '@/lib/sheets/client';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid retry payload' }, { status: 400 });
  const value = body as Record<string, unknown>;
  if (typeof value.activityId !== 'string' || !value.activityId.trim() || typeof value.actualStart !== 'string' || typeof value.actualEnd !== 'string' || typeof value.durationMinutes !== 'number') {
    return NextResponse.json({ error: 'activityId, actualStart, actualEnd, and durationMinutes are required' }, { status: 400 });
  }
  const start = new Date(value.actualStart);
  const end = new Date(value.actualEnd);
  const calculatedDuration = Math.floor(Math.max(0, end.getTime() - start.getTime()) / 60_000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime() || end.getTime() > Date.now() + 60_000 || end.getTime() - start.getTime() > 24 * 60 * 60 * 1000 || value.durationMinutes !== calculatedDuration) {
    return NextResponse.json({ error: 'Invalid session timing' }, { status: 400 });
  }
  try {
    const synced = await writeSession(value.activityId, { actualStart: start.toISOString(), actualEnd: end.toISOString(), durationMinutes: calculatedDuration });
    return NextResponse.json({ synced });
  } catch {
    return NextResponse.json({ synced: false });
  }
}
