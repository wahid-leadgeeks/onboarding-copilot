import type { Activity } from '@/lib/types/activity';
import { isActivity } from './types';
import { extractGoogleSpreadsheet } from './extractor';
import { OFFICIAL_SCHEDULE_ACTIVITIES, scheduleActivityToActivity, type ScheduleActivity } from '@/lib/schedule-catalog';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';

const fallback: Activity[] = OFFICIAL_SCHEDULE_ACTIVITIES.map(scheduleActivityToActivity);

export async function readSchedule(accessToken?: string): Promise<Activity[]> {
  // 0. Database primary source when PostgreSQL is configured
  if (isDbConfigured()) {
    try {
      const rows = await db.select().from(schema.activities).orderBy(asc(schema.activities.rowNumber));
      if (rows && rows.length > 0) {
        return rows.map((row) => {
          const item: ScheduleActivity = {
            id: row.id,
            rowNumber: row.rowNumber,
            week: row.week,
            day: row.day,
            date: row.date,
            activityCount: row.activityCount,
            pic: row.pic,
            topic: row.topic,
            mainMedia: row.mainMedia,
            durationMinutes: row.durationMinutes ?? undefined,
            startTime: row.startTime ?? undefined,
            endTime: row.endTime ?? undefined,
            progress: row.progress || '',
            notes: row.notes || '',
          };
          const activity = scheduleActivityToActivity(item);
          if (row.actualStart) activity.actualStart = row.actualStart;
          if (row.actualEnd) activity.actualEnd = row.actualEnd;
          if (row.durationMinutes) activity.durationMinutes = row.durationMinutes;
          return activity;
        });
      }
    } catch (err) {
      console.warn('Database schedule read failed:', err);
    }
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) return fallback;

  // 1. Direct Google Sheets API v4 using authenticated user's access token
  if (accessToken) {
    try {
      const extracted = await extractGoogleSpreadsheet(spreadsheetId, { accessToken });
      if (extracted.schedule?.activities && extracted.schedule.activities.length > 0) {
        return extracted.schedule.activities;
      }
    } catch (err) {
      console.warn('Google Sheets API direct extraction failed:', err);
    }
  }

  // 2. Custom webhook / proxy endpoint if configured
  const endpoint = process.env.SHEETS_SCHEDULE_URL;
  if (endpoint) {
    try {
      const parsedEndpoint = new URL(endpoint);
      const localDevelopment = parsedEndpoint.hostname === 'localhost' || parsedEndpoint.hostname === '127.0.0.1';
      if (parsedEndpoint.protocol === 'https:' || localDevelopment) {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (response.ok) {
          const payload: unknown = await response.json();
          if (Array.isArray(payload) && payload.every(isActivity)) {
            return payload;
          }
        }
      }
    } catch (err) {
      console.warn('Google Sheets schedule endpoint failed:', err);
    }
  }

  // 3. Graceful fallback
  return fallback;
}

export async function writeSession(activityId: string, session: Pick<Activity, 'actualStart' | 'actualEnd' | 'durationMinutes'>): Promise<boolean> {
  if (isDbConfigured()) {
    try {
      await db
        .update(schema.activities)
        .set({
          actualStart: session.actualStart,
          actualEnd: session.actualEnd,
          durationMinutes: session.durationMinutes,
          progress: 'Done',
          updatedAt: new Date(),
        })
        .where(eq(schema.activities.id, activityId));

      await db.insert(schema.sessionLogs).values({
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        activityId,
        name: activityId,
        startedAt: session.actualStart ? new Date(session.actualStart).getTime() : Date.now(),
        finishedAt: session.actualEnd ? new Date(session.actualEnd).getTime() : Date.now(),
        durationMinutes: session.durationMinutes || 0,
      });
      return true;
    } catch (err) {
      console.warn('Database writeSession error:', err);
    }
  }

  const endpoint = process.env.SHEETS_WRITE_URL;
  if (!process.env.GOOGLE_SHEETS_ID || !endpoint) return false;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.SHEETS_WRITE_TOKEN) headers.authorization = `Bearer ${process.env.SHEETS_WRITE_TOKEN}`;
  const parsedEndpoint = new URL(endpoint);
  const localDevelopment = parsedEndpoint.hostname === 'localhost' || parsedEndpoint.hostname === '127.0.0.1';
  if (parsedEndpoint.protocol !== 'https:' && !localDevelopment) throw new Error('Write endpoint must use HTTPS');
  const response = await fetch(parsedEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ activityId, ...session }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Session write failed: ${response.status}`);
  const payload: unknown = await response.json().catch(() => ({ synced: true }));
  if (payload && typeof payload === 'object' && 'synced' in payload && typeof (payload as Record<string, unknown>).synced !== 'boolean') throw new Error('Invalid session write response');
  return true;
}

export async function writeDiary(content: string): Promise<boolean> {
  if (isDbConfigured()) {
    return true;
  }
  const endpoint = process.env.SHEETS_DIARY_URL;
  if (!process.env.GOOGLE_SHEETS_ID || !endpoint) return false;
  const parsedEndpoint = new URL(endpoint);
  const localDevelopment = parsedEndpoint.hostname === 'localhost' || parsedEndpoint.hostname === '127.0.0.1';
  if (parsedEndpoint.protocol !== 'https:' && !localDevelopment) throw new Error('Diary endpoint must use HTTPS');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.SHEETS_WRITE_TOKEN) headers.authorization = `Bearer ${process.env.SHEETS_WRITE_TOKEN}`;
  const response = await fetch(parsedEndpoint, { method: 'POST', headers, body: JSON.stringify({ content, createdAt: new Date().toISOString() }), cache: 'no-store' });
  if (!response.ok) throw new Error(`Diary write failed: ${response.status}`);
  return true;
}

