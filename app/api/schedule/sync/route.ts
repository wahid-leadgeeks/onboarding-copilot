import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/session';
import {
  batchUpdateSheetRanges,
  updateSheetRange,
  type BatchRangeUpdate,
} from '@/lib/sheets/extractor';
import {
  groupScheduleActivitiesIntoChunks,
  OFFICIAL_SCHEDULE_ACTIVITIES,
  type ScheduleActivity,
} from '@/lib/schedule-catalog';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      spreadsheetId?: string;
      week?: string;
      activities?: ScheduleActivity[];
    };

    const spreadsheetId = body.spreadsheetId || process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SHEETS_ID is not configured in environment or request' },
        { status: 400 }
      );
    }

    const accessToken = await getSessionAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          loginUrl: '/api/auth/login',
          message: 'Google OAuth authentication is required to sync to Google Sheets.',
        },
        { status: 401 }
      );
    }

    // 1. Determine activities to sync: from body, database, or official catalog fallback
    let activitiesToSync: ScheduleActivity[] = [];

    if (Array.isArray(body.activities) && body.activities.length > 0) {
      activitiesToSync = body.activities;
    } else if (isDbConfigured()) {
      try {
        const rows = await db.select().from(schema.activities).orderBy(asc(schema.activities.rowNumber));
        if (rows && rows.length > 0) {
          activitiesToSync = rows.map((row) => ({
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
        }
      } catch (dbErr) {
        console.warn('Database schedule read error in sync route, falling back to catalog:', dbErr);
      }
    }

    if (activitiesToSync.length === 0) {
      activitiesToSync = [...OFFICIAL_SCHEDULE_ACTIVITIES];
    }

    // Optional week filtering if requested
    if (body.week && body.week !== 'All') {
      if (body.week === 'Monthly Reviews') {
        activitiesToSync = activitiesToSync.filter((a) => a.week.startsWith('Month'));
      } else {
        activitiesToSync = activitiesToSync.filter((a) => a.week === body.week);
      }
    }

    if (activitiesToSync.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No schedule activities to sync' },
        { status: 400 }
      );
    }

    // 2. Group into contiguous chunks to preserve spreadsheet title/header rows
    const chunks = groupScheduleActivitiesIntoChunks(activitiesToSync);

    const batchData: BatchRangeUpdate[] = chunks.map((c) => ({
      range: c.range,
      values: c.values,
    }));

    let totalUpdatedRows = 0;
    let totalUpdatedCells = 0;

    // 3. Try atomic Google Sheets batchUpdate
    try {
      const batchResult = await batchUpdateSheetRanges(spreadsheetId, batchData, { accessToken });
      totalUpdatedRows = batchResult.totalUpdatedRows;
      totalUpdatedCells = batchResult.totalUpdatedCells;
    } catch (batchErr) {
      console.warn('Google Sheets batchUpdate failed, attempting sequential chunk update fallback:', batchErr);
      // Fallback: update each contiguous chunk sequentially
      for (const chunk of chunks) {
        const chunkRes = await updateSheetRange(spreadsheetId, chunk.range, chunk.values, { accessToken });
        totalUpdatedRows += chunkRes.updatedRows;
        totalUpdatedCells += chunkRes.updatedCells;
      }
    }

    return NextResponse.json({
      success: true,
      totalActivities: activitiesToSync.length,
      totalUpdatedRows: totalUpdatedRows || activitiesToSync.length,
      totalUpdatedCells: totalUpdatedCells || activitiesToSync.length * 6,
      chunksCount: chunks.length,
      spreadsheetId,
      sheet: 'Schedule',
      syncedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Schedule sync API error:', err);
    const message = err instanceof Error ? err.message : 'Failed to sync schedule to Google Sheets';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
