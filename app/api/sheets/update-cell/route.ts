import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/session';
import { updateSheetCell, updateSheetRange, getSheetRange } from '@/lib/sheets/extractor';
import {
  findFeedbackSession,
  formatFeedbackRowValues,
  type FeedbackClipboardInput,
  type FeedbackEntry,
  type FeedbackRatings,
} from '@/lib/feedback';

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
    sheet?: 'Schedule' | 'Onboarding Diary' | 'Feedback Sheet' | 'Feedback' | string;
    range?: string;
    value?: string;
    values?: string[][];
    rowNumber?: number;
    learned?: string;
    notes?: string;
    durationMinutes?: number | string;
    startTime?: string;
    endTime?: string;
    progress?: string;
    spreadsheetId?: string;
    feedback?: FeedbackEntry | FeedbackClipboardInput;
    entries?: Array<FeedbackEntry | (FeedbackClipboardInput & { rowNumber?: number; sessionId?: string })>;
    date?: string;
    pic?: string;
    topic?: string;
    sessionTitle?: string;
    ratings?: FeedbackRatings | Record<string, unknown>;
    hasQuestions?: boolean;
    questionExplanation?: string;
    questionAddressing?: string;
    suggestions?: string;
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
    const isFeedbackSheet =
      Boolean(body?.sheet && body.sheet.toLowerCase().includes('feedback')) ||
      Boolean(body?.feedback) ||
      (typeof body?.rowNumber === 'number' && body?.ratings !== undefined);

    // 1. If updating Schedule sheet (G: Duration, H: Start, I: End, J: Progress, K: Notes)
    if (body?.sheet === 'Schedule' && typeof body?.rowNumber === 'number') {
      const row = body.rowNumber;
      if (row < 2 || row > 200) {
        return NextResponse.json({ error: 'Invalid schedule rowNumber' }, { status: 400 });
      }
      // Google Sheets Column J dropdown strictly accepts: 'Done', 'In Progress', 'On-Hold', 'Reschedule', or '' (empty for unstarted).
      // Writing 'Not Started' triggers Google Sheets data validation rejection.
      const rawProgress = body.progress !== undefined ? String(body.progress).trim() : 'Done';
      const progressValue = (rawProgress === 'Not Started' || !rawProgress) ? '' : rawProgress;

      const range = `'Schedule'!G${row}:K${row}`;
      const values = [
        [
          body.durationMinutes !== undefined ? String(body.durationMinutes) : '',
          body.startTime ?? '',
          body.endTime ?? '',
          progressValue,
          body.notes ?? '',
        ],
      ];
      const result = await updateSheetRange(spreadsheetId, range, values, { accessToken });
      return NextResponse.json({
        success: true,
        sheet: 'Schedule',
        rowNumber: row,
        range,
        ...result,
        durationMinutes: body.durationMinutes,
        startTime: body.startTime,
        endTime: body.endTime,
        progress: progressValue,
        notes: body.notes,
      });
    }

    // 2. If updating Feedback Sheet in batch (multiple entries)
    if (isFeedbackSheet && Array.isArray(body?.entries) && body.entries.length > 0) {
      const primarySheet = body?.sheet === 'Feedback' ? 'Feedback' : 'Feedback Sheet';
      const updatedRows: number[] = [];

      for (const item of body.entries) {
        const session = item.sessionId ? findFeedbackSession(item.sessionId) : undefined;
        const row =
          ('rowNumber' in item && typeof item.rowNumber === 'number'
            ? item.rowNumber
            : undefined) ||
          session?.rowNumber ||
          (item.sessionId ? parseInt(item.sessionId.replace(/\D/g, ''), 10) : undefined);

        if (typeof row === 'number' && row >= 3 && row <= 50) {
          const rowValues = formatFeedbackRowValues(item);
          const range = `'${primarySheet}'!A${row}:M${row}`;
          try {
            await updateSheetRange(spreadsheetId, range, [rowValues], { accessToken });
            updatedRows.push(row);
          } catch {
            const altSheet = primarySheet === 'Feedback Sheet' ? 'Feedback' : 'Feedback Sheet';
            const altRange = `'${altSheet}'!A${row}:M${row}`;
            await updateSheetRange(spreadsheetId, altRange, [rowValues], { accessToken });
            updatedRows.push(row);
          }
        }
      }

      return NextResponse.json({
        success: true,
        sheet: primarySheet,
        updatedCount: updatedRows.length,
        updatedRows,
      });
    }

    // 3. If updating Feedback Sheet for a single row (Cols A–M: Date, PIC, Topic, Likert 1-6, Questions?, Explanation, Addressing, Suggestions)
    if (isFeedbackSheet && typeof body?.rowNumber === 'number') {
      const row = body.rowNumber;
      if (row < 3 || row > 50) {
        return NextResponse.json({ error: 'Invalid feedback rowNumber (expected 3-50)' }, { status: 400 });
      }

      let rowValues: string[];
      if (Array.isArray(body?.values?.[0]) && body.values[0].length > 0) {
        rowValues = body.values[0];
      } else {
        const feedbackInput: FeedbackClipboardInput = body?.feedback || {
          date: body?.date,
          pic: body?.pic,
          topic: body?.topic || body?.sessionTitle,
          ratings: body?.ratings,
          hasQuestions: body?.hasQuestions,
          questionExplanation: body?.questionExplanation,
          questionAddressing: body?.questionAddressing,
          suggestions: body?.suggestions,
        };
        rowValues = formatFeedbackRowValues(feedbackInput);
      }

      const primarySheet = body?.sheet === 'Feedback' ? 'Feedback' : 'Feedback Sheet';
      const range = `'${primarySheet}'!A${row}:M${row}`;

      try {
        const result = await updateSheetRange(spreadsheetId, range, [rowValues], { accessToken });
        return NextResponse.json({
          success: true,
          sheet: primarySheet,
          rowNumber: row,
          range,
          ...result,
          values: [rowValues],
        });
      } catch (primaryErr: unknown) {
        // Fallback: If 'Feedback Sheet' failed, try alternative worksheet name 'Feedback'
        const altSheet = primarySheet === 'Feedback Sheet' ? 'Feedback' : 'Feedback Sheet';
        const altRange = `'${altSheet}'!A${row}:M${row}`;
        try {
          const result = await updateSheetRange(spreadsheetId, altRange, [rowValues], { accessToken });
          return NextResponse.json({
            success: true,
            sheet: altSheet,
            rowNumber: row,
            range: altRange,
            ...result,
            values: [rowValues],
          });
        } catch {
          throw primaryErr;
        }
      }
    }

    // 3. If rowNumber is specified for Onboarding Diary (G: Learned, H: Notes)
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
