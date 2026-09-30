import { NextResponse } from 'next/server';
import { readSchedule } from '@/lib/sheets/client';
import { isActivity } from '@/lib/sheets/types';
import { getSessionAccessToken } from '@/lib/auth/session';
import { OFFICIAL_SCHEDULE_ACTIVITIES, type ScheduleActivity } from '@/lib/schedule-catalog';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const wantsCatalog = url.searchParams.get('format') === 'catalog' || url.searchParams.get('catalog') === 'true';

    const { isDbConfigured, db, schema } = await import('@/lib/db');
    const { asc } = await import('drizzle-orm');

    if (wantsCatalog) {
      if (isDbConfigured()) {
        try {
          const rows = await db.select().from(schema.activities).orderBy(asc(schema.activities.rowNumber));
          if (rows && rows.length > 0) {
            const catalogActivities: ScheduleActivity[] = rows.map((row) => ({
              id: row.id,
              rowNumber: row.rowNumber,
              week: row.week,
              day: row.day,
              date: row.date,
              activityCount: row.activityCount ?? undefined,
              pic: row.pic,
              topic: row.topic,
              mainMedia: row.mainMedia,
              durationMinutes: row.durationMinutes ?? undefined,
              startTime: row.startTime ?? undefined,
              endTime: row.endTime ?? undefined,
              progress: row.progress || '',
              materialsLink: row.materialsLink || '',
              notes: row.notes || '',
            }));

            return NextResponse.json(
              {
                activities: catalogActivities,
                count: catalogActivities.length,
                source: 'database',
              },
              {
                headers: {
                  'x-schedule-mode': 'database',
                  'Cache-Control': 'no-store',
                },
              }
            );
          }
        } catch (dbErr) {
          console.warn('Database schedule catalog read error:', dbErr);
        }
      }

      return NextResponse.json(
        {
          activities: OFFICIAL_SCHEDULE_ACTIVITIES,
          count: OFFICIAL_SCHEDULE_ACTIVITIES.length,
          source: 'catalog',
        },
        {
          headers: {
            'x-schedule-mode': 'catalog',
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const accessToken = await getSessionAccessToken(request);
    const activities = await readSchedule(accessToken);
    if (!Array.isArray(activities) || !activities.every(isActivity)) {
      return NextResponse.json({ error: 'Invalid schedule data' }, { status: 502 });
    }
    const mode = isDbConfigured() ? 'connected' : accessToken ? 'connected' : process.env.GOOGLE_SHEETS_ID ? 'configured' : 'demo';
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
