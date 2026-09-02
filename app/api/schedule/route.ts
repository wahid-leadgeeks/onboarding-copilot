import { NextResponse } from 'next/server';
import { readSchedule } from '@/lib/sheets/client';
import { isActivity } from '@/lib/sheets/types';

export async function GET() {
  try {
    const activities = await readSchedule();
    if (!Array.isArray(activities) || !activities.every(isActivity)) return NextResponse.json({ error: 'Invalid schedule data' }, { status: 502 });
    return NextResponse.json(activities);
  } catch {
    return NextResponse.json({ error: 'Schedule unavailable' }, { status: 503 });
  }
}
