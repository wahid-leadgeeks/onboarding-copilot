import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/session';
import { updateSheetCell, getSheetRange } from '@/lib/sheets/extractor';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get('id') || process.env.GOOGLE_SHEETS_ID;
  const range = url.searchParams.get('range') || "'Onboarding Diary'!H15";

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID is not configured' }, { status: 400 });
  }

  const accessToken = await getSessionAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        loginUrl: '/api/auth/login',
        message: 'Google OAuth authentication is required to read spreadsheet cells.',
      },
      { status: 401 }
    );
  }

  try {
    const values = await getSheetRange(spreadsheetId, range, { accessToken });
    const cellValue = values[0]?.[0] || '';
    return NextResponse.json({
      success: true,
      range,
      value: cellValue,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read cell';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    range?: string;
    value?: string;
    spreadsheetId?: string;
  } | null;

  const range = body?.range || "'Onboarding Diary'!H15";
  const value = body?.value;
  const spreadsheetId = body?.spreadsheetId || process.env.GOOGLE_SHEETS_ID;

  if (typeof value !== 'string') {
    return NextResponse.json({ error: 'Value is required' }, { status: 400 });
  }

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID is not configured' }, { status: 400 });
  }

  const accessToken = await getSessionAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        loginUrl: '/api/auth/login',
        message: 'Google OAuth authentication is required to update spreadsheet cells.',
      },
      { status: 401 }
    );
  }

  try {
    const result = await updateSheetCell(spreadsheetId, range, value, { accessToken });
    return NextResponse.json({
      success: true,
      ...result,
      value,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update cell';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
