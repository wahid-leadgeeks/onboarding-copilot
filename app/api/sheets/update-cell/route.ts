import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/session';
import { updateSheetCell, updateSheetRange, getSheetRange } from '@/lib/sheets/extractor';

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
    values?: string[][];
    rowNumber?: number;
    learned?: string;
    notes?: string;
    spreadsheetId?: string;
  } | null;

  const spreadsheetId = body?.spreadsheetId || process.env.GOOGLE_SHEETS_ID;

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
    // 1. If rowNumber is specified for Onboarding Diary (G: Learned, H: Notes)
    if (typeof body?.rowNumber === 'number') {
      const row = body.rowNumber;
      if (row < 2 || row > 100) {
        return NextResponse.json({ error: 'Invalid diary rowNumber' }, { status: 400 });
      }
      const range = `'Onboarding Diary'!G${row}:H${row}`;
      const values = [[body.learned ?? '', body.notes ?? '']];
      const result = await updateSheetRange(spreadsheetId, range, values, { accessToken });
      return NextResponse.json({
        success: true,
        rowNumber: row,
        ...result,
        learned: body.learned ?? '',
        notes: body.notes ?? '',
      });
    }

    // 2. If 2D values array is specified
    if (Array.isArray(body?.values) && typeof body?.range === 'string') {
      const result = await updateSheetRange(spreadsheetId, body.range, body.values, { accessToken });
      return NextResponse.json({
        success: true,
        ...result,
        values: body.values,
      });
    }

    // 3. If single cell value is specified
    if (typeof body?.value === 'string') {
      const range = body.range || "'Onboarding Diary'!H15";
      const result = await updateSheetCell(spreadsheetId, range, body.value, { accessToken });
      return NextResponse.json({
        success: true,
        ...result,
        value: body.value,
      });
    }

    return NextResponse.json({ error: 'value, values, or rowNumber with learned/notes is required' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update cell';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
