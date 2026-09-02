import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || typeof (body as Record<string, unknown>).activityId !== 'string' || !(body as Record<string, unknown>).activityId) {
    return NextResponse.json({ error: 'activityId is required' }, { status: 400 });
  }
  const requested = (body as Record<string, unknown>).startedAt;
  const startedAt = typeof requested === 'string' ? new Date(requested) : new Date();
  if (Number.isNaN(startedAt.getTime()) || startedAt.getTime() > Date.now() + 60_000) {
    return NextResponse.json({ error: 'Invalid start timestamp' }, { status: 400 });
  }
  const plannedStart = (body as Record<string, unknown>).plannedStart;
  const planned = typeof plannedStart === 'string' ? new Date(plannedStart) : null;
  const late = planned && !Number.isNaN(planned.getTime()) ? startedAt.getTime() > planned.getTime() : false;
  return NextResponse.json({ activityId: (body as Record<string, unknown>).activityId, startedAt: startedAt.toISOString(), status: 'in-progress', lateStart: late }, { status: 201 });
}
