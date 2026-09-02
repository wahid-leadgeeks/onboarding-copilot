import { NextResponse } from 'next/server';
import { calculateDurationMinutes } from '@/lib/session/duration';
import { writeSession } from '@/lib/sheets/client';
import { enqueueSync, readPendingSyncs } from '@/lib/sync-queue';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.activityId !== 'string' || !data.activityId.trim() || typeof data.start !== 'string' || typeof data.end !== 'string') return NextResponse.json({ error: 'activityId, start, and end are required' }, { status: 400 });
  const start = new Date(data.start); const end = new Date(data.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NextResponse.json({ error: 'Invalid timestamps' }, { status: 400 });
  const now = Date.now();
  if (start.getTime() > now + 60_000 || end.getTime() > now + 60_000) return NextResponse.json({ error: 'Session timestamps cannot be in the future' }, { status: 400 });
  if (end.getTime() < start.getTime()) return NextResponse.json({ error: 'Session end must be after start' }, { status: 400 });
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) return NextResponse.json({ error: 'Session duration cannot exceed 24 hours' }, { status: 400 });
  const durationMinutes = calculateDurationMinutes(start, end);
  try {
    const session = { actualStart: start.toISOString(), actualEnd: end.toISOString(), durationMinutes };
    const synced = await writeSession(data.activityId, session);
    if (!synced) {
      // The browser owns the queue so a later retry can happen without a database.
      const pending = enqueueSync(readPendingSyncs(null), { activityId: data.activityId, ...session });
      return NextResponse.json({ activityId: data.activityId, start: session.actualStart, end: session.actualEnd, durationMinutes, status: 'done', syncStatus: 'pending', pendingSync: pending.at(-1) ?? null });
    }
    return NextResponse.json({ activityId: data.activityId, start: session.actualStart, end: session.actualEnd, durationMinutes, status: 'done', syncStatus: 'synced' });
  } catch {
    return NextResponse.json({ activityId: data.activityId, start: start.toISOString(), end: end.toISOString(), durationMinutes, status: 'done', syncStatus: 'pending', pendingSync: { activityId: data.activityId, actualStart: start.toISOString(), actualEnd: end.toISOString(), durationMinutes, queuedAt: new Date().toISOString(), attempts: 0 } });
  }
}
