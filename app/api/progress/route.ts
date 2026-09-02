import { NextResponse } from 'next/server';
import { readSchedule } from '@/lib/sheets/client';

export async function GET() {
  try {
    const activities = await readSchedule();
    const completed = activities.filter((activity) => activity.status === 'done');
    const remaining = activities.filter((activity) => activity.status !== 'done');
    // Schedule status is authoritative for synced records; local sessions are
    // intentionally kept client-side until a Sheets write is confirmed.
    return NextResponse.json({ total: activities.length, completed: completed.length, remaining: remaining.length, missingRecordIds: remaining.map((activity) => activity.id) });
  } catch {
    return NextResponse.json({ error: 'Progress unavailable' }, { status: 503 });
  }
}
