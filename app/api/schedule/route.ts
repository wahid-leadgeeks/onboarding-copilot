import { NextResponse } from 'next/server';
import { readSchedule } from '@/lib/sheets/client';
import { isActivity } from '@/lib/sheets/types';
import { getSessionAccessToken } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const accessToken = await getSessionAccessToken(request);
    const activities = await readSchedule(accessToken);
    if (!Array.isArray(activities) || !activities.every(isActivity)) {
      return NextResponse.json({ error: 'Invalid schedule data' }, { status: 502 });
    }
    const mode = accessToken ? 'connected' : process.env.GOOGLE_SHEETS_ID ? 'configured' : 'demo';
    return NextResponse.json(activities, {
      headers: {
        'x-schedule-mode': mode,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Schedule route error:', err);
    return NextResponse.json({ error: 'Schedule unavailable' }, { status: 503 });
  }
}
