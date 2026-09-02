import type { Activity } from '@/lib/types/activity';
import { isActivity } from './types';

const fallback: Activity[] = [
  { id: 'intro-it', name: 'Introduction to IT Systems', type: 'learning', plannedStart: '09:00', plannedEnd: '11:00', status: 'not-started' },
  { id: 'security', name: 'Security & Access Setup', type: 'setup', plannedStart: '11:30', plannedEnd: '12:30', status: 'not-started' },
  { id: 'welcome', name: 'Team Welcome', type: 'welcome', plannedStart: '14:00', plannedEnd: '15:00', status: 'not-started' },
];

export async function readSchedule(): Promise<Activity[]> {
  // Sheets credentials are intentionally server-only and optional during local development.
  if (!process.env.GOOGLE_SHEETS_ID) return fallback;
  const endpoint = process.env.SHEETS_SCHEDULE_URL;
  if (!endpoint) throw new Error('Google Sheets schedule endpoint is not configured');
  const parsedEndpoint = new URL(endpoint);
  const localDevelopment = parsedEndpoint.hostname === 'localhost' || parsedEndpoint.hostname === '127.0.0.1';
  if (parsedEndpoint.protocol !== 'https:' && !localDevelopment) throw new Error('Schedule endpoint must use HTTPS');
  const response = await fetch(endpoint, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('Schedule response must be an array');
  if (!payload.every(isActivity)) throw new Error('Schedule contains invalid activity rows');
  return payload;
}

export async function writeSession(activityId: string, session: Pick<Activity, 'actualStart' | 'actualEnd' | 'durationMinutes'>): Promise<boolean> {
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
