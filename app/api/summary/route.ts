import { NextResponse } from 'next/server';
import { readSchedule } from '@/lib/sheets/client';
import { isActivity } from '@/lib/sheets/types';

export async function GET() {
  try {
    const activities = await readSchedule();
    if (!Array.isArray(activities) || !activities.every(isActivity)) {
      return NextResponse.json({ error: 'Invalid schedule data' }, { status: 502 });
    }
    const completed = activities.filter((activity) => activity.status === 'done');
    const remaining = activities.filter((activity) => activity.status !== 'done');
    return NextResponse.json({
      total: activities.length,
      completed: completed.length,
      remaining: remaining.length,
      completedActivities: completed.map(({ id, name }) => ({ id, name })),
      missingRecordIds: remaining.map((activity) => activity.id),
      message: activities.length === 0
        ? 'No activities are scheduled today.'
        : remaining.length === 0
        ? 'All scheduled activities are recorded.'
        : `${completed.length} of ${activities.length} activities are recorded.`,
      source: 'schedule',
    });
  } catch {
    return NextResponse.json({ error: 'Summary unavailable' }, { status: 503 });
  }
}
