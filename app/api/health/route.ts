import { NextResponse } from 'next/server';
import { summarizeConfigured } from '@/lib/ai/providers';
import { isGoogleAuthConfigured } from '@/lib/auth/config';

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID || null;
  const sheetsReadConfigured = Boolean(process.env.GOOGLE_SHEETS_ID && process.env.SHEETS_SCHEDULE_URL);
  const sheetsWriteConfigured = Boolean(process.env.GOOGLE_SHEETS_ID && process.env.SHEETS_WRITE_URL);
  const diaryWriteConfigured = Boolean(process.env.GOOGLE_SHEETS_ID && process.env.SHEETS_DIARY_URL);
  const oauthConfigured = isGoogleAuthConfigured();
  const aiConfigured = summarizeConfigured();
  return NextResponse.json({
    status: 'ok',
    mode: (sheetsReadConfigured || oauthConfigured) && spreadsheetId ? 'connected' : 'local',
    spreadsheetId,
    integrations: {
      sheets: Boolean(spreadsheetId && (oauthConfigured || (sheetsReadConfigured && sheetsWriteConfigured && diaryWriteConfigured))),
      sheetsRead: sheetsReadConfigured || Boolean(spreadsheetId && oauthConfigured),
      sheetsWrite: sheetsWriteConfigured,
      diaryWrite: diaryWriteConfigured,
      oauth: oauthConfigured,
      ai: aiConfigured,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
