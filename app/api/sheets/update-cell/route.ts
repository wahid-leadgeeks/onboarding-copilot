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
import { db, schema, isDbConfigured } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get('id') || process.env.GOOGLE_SHEETS_ID;
  const range = url.searchParams.get('range') || "'Onboarding Diary'!H15";

  const isDb = isDbConfigured();

  if (!isDb) {
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

  // Database mode: read cell from PostgreSQL
  try {
    const match = range.match(/(?:'([^']+)'|([^!]+))!([A-Z]+)(\d+)/i);
    if (match) {
      const sheetName = match[1] || match[2];
      const col = match[3].toUpperCase();
      const row = parseInt(match[4], 10);
      if (sheetName.toLowerCase().includes('diary')) {
        const entries = await db.select().from(schema.diaryEntries).where(eq(schema.diaryEntries.rowNumber, row));
        const entry = entries[0];
        const cellValue = col === 'G' ? entry?.learned || '' : entry?.notes || '';
        return NextResponse.json({ success: true, range, value: cellValue });
      }
    }
    return NextResponse.json({ success: true, range, value: '' });
  } catch {
    return NextResponse.json({ success: true, range, value: '' });
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

  const isDb = isDbConfigured();

  if (!isDb && !spreadsheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID is not configured' }, { status: 400 });
  }

  const accessToken = await getSessionAccessToken(request);
  if (!isDb && !accessToken) {
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

    const targetSpreadsheetId = spreadsheetId as string | undefined;

    // 0. Direct Database Persistence when PostgreSQL is configured
    if (isDb) {
      if (body?.sheet === 'Schedule' && typeof body?.rowNumber === 'number') {
        const row = body.rowNumber;
        const rawProgress = body.progress !== undefined ? String(body.progress).trim() : 'Done';
        const progressValue = (rawProgress === 'Not Started' || !rawProgress) ? '' : rawProgress;
        const duration = body.durationMinutes !== undefined && body.durationMinutes !== '' ? Number(body.durationMinutes) : null;
        await db
          .update(schema.activities)
          .set({
            durationMinutes: duration,
            startTime: body.startTime || null,
            endTime: body.endTime || null,
            progress: progressValue,
            notes: body.notes || '',
            updatedAt: new Date(),
          })
          .where(eq(schema.activities.rowNumber, row));

        let syncedToSheets = false;
        if (targetSpreadsheetId && accessToken) {
          try {
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
            await updateSheetRange(targetSpreadsheetId, range, values, { accessToken });
            syncedToSheets = true;
          } catch (syncErr) {
            console.warn('Google Sheets Schedule sync error:', syncErr);
          }
        }

        return NextResponse.json({
          success: true,
          sheet: 'Schedule',
          rowNumber: row,
          range: `'Schedule'!G${row}:K${row}`,
          durationMinutes: body.durationMinutes,
          startTime: body.startTime,
          endTime: body.endTime,
          progress: progressValue,
          notes: body.notes,
          syncedToSheets,
        });
      }

      if (isFeedbackSheet && Array.isArray(body?.entries) && body.entries.length > 0) {
        const primarySheet = body?.sheet === 'Feedback' ? 'Feedback' : 'Feedback Sheet';
        const updatedRows: number[] = [];
        for (const item of body.entries) {
          const session = item.sessionId ? findFeedbackSession(item.sessionId) : undefined;
          const row = ('rowNumber' in item && typeof item.rowNumber === 'number' ? item.rowNumber : undefined) ||
            session?.rowNumber ||
            (item.sessionId ? parseInt(item.sessionId.replace(/\D/g, ''), 10) : undefined) || 3;
          const sessionId = item.sessionId || `row-${row}`;
          const itemTopic = ('topic' in item ? (item as any).topic : 'sessionTitle' in item ? item.sessionTitle : '') || '';
          await db
            .insert(schema.feedbackEntries)
            .values({
              id: `fb-${sessionId}`,
              sessionId,
              rowNumber: row,
              date: item.date || new Date().toISOString().slice(0, 10),
              pic: item.pic || '',
              topic: itemTopic,
              ratings: item.ratings as any,
              hasQuestions: item.hasQuestions ?? false,
              questionExplanation: item.questionExplanation || '',
              questionAddressing: item.questionAddressing || '',
              suggestions: item.suggestions || '',
              updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: schema.feedbackEntries.sessionId,
              set: {
                date: item.date || undefined,
                pic: item.pic || undefined,
                topic: itemTopic || undefined,
                ratings: item.ratings as any,
                hasQuestions: item.hasQuestions ?? false,
                questionExplanation: item.questionExplanation || '',
                questionAddressing: item.questionAddressing || '',
                suggestions: item.suggestions || '',
                updatedAt: new Date().toISOString(),
              },
            });
          updatedRows.push(row);

          if (targetSpreadsheetId && accessToken) {
            try {
              const rowValues = formatFeedbackRowValues(item);
              const range = `'${primarySheet}'!A${row}:M${row}`;
              await updateSheetRange(targetSpreadsheetId, range, [rowValues], { accessToken });
            } catch {
              const altSheet = primarySheet === 'Feedback Sheet' ? 'Feedback' : 'Feedback Sheet';
              const altRange = `'${altSheet}'!A${row}:M${row}`;
              try {
                const rowValues = formatFeedbackRowValues(item);
                await updateSheetRange(targetSpreadsheetId, altRange, [rowValues], { accessToken });
              } catch (altErr) {
                console.warn('Google Sheets Feedback batch sync error:', altErr);
              }
            }
          }
        }
        return NextResponse.json({
          success: true,
          sheet: primarySheet,
          updatedCount: updatedRows.length,
          updatedRows,
          syncedToSheets: Boolean(targetSpreadsheetId && accessToken),
        });
      }

      if (isFeedbackSheet && typeof body?.rowNumber === 'number') {
        const row = body.rowNumber;
        const sessionId = `row-${row}`;
        const ratings = body.ratings || (body.feedback?.ratings) || {};
        const feedbackTopic = ('topic' in (body?.feedback || {}) ? (body?.feedback as any).topic : body?.feedback?.sessionTitle) || body?.topic || body?.sessionTitle || '';
        await db
          .insert(schema.feedbackEntries)
          .values({
            id: `fb-${sessionId}`,
            sessionId,
            rowNumber: row,
            date: body.date || body.feedback?.date || new Date().toISOString().slice(0, 10),
            pic: body.pic || body.feedback?.pic || '',
            topic: feedbackTopic,
            ratings: ratings as any,
            hasQuestions: body.hasQuestions ?? body.feedback?.hasQuestions ?? false,
            questionExplanation: body.questionExplanation || body.feedback?.questionExplanation || '',
            questionAddressing: body.questionAddressing || body.feedback?.questionAddressing || '',
            suggestions: body.suggestions || body.feedback?.suggestions || '',
            updatedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.feedbackEntries.sessionId,
            set: {
              date: body.date || body.feedback?.date || undefined,
              pic: body.pic || body.feedback?.pic || undefined,
              topic: feedbackTopic || undefined,
              ratings: ratings as any,
              hasQuestions: body.hasQuestions ?? body.feedback?.hasQuestions ?? false,
              questionExplanation: body.questionExplanation || body.feedback?.questionExplanation || '',
              questionAddressing: body.questionAddressing || body.feedback?.questionAddressing || '',
              suggestions: body.suggestions || body.feedback?.suggestions || '',
              updatedAt: new Date().toISOString(),
            },
          });

        let syncedToSheets = false;
        if (targetSpreadsheetId && accessToken) {
          const feedbackInput: FeedbackClipboardInput = body?.feedback || {
            date: body?.date,
            pic: body?.pic,
            topic: feedbackTopic,
            ratings,
            hasQuestions: body?.hasQuestions,
            questionExplanation: body?.questionExplanation,
            questionAddressing: body?.questionAddressing,
            suggestions: body?.suggestions,
          };
          const rowValues = Array.isArray(body?.values?.[0]) && body.values[0].length > 0
            ? body.values[0]
            : formatFeedbackRowValues(feedbackInput);
          const primarySheet = body?.sheet === 'Feedback' ? 'Feedback' : 'Feedback Sheet';
          const range = `'${primarySheet}'!A${row}:M${row}`;
          try {
            await updateSheetRange(targetSpreadsheetId, range, [rowValues], { accessToken });
            syncedToSheets = true;
          } catch {
            const altSheet = primarySheet === 'Feedback Sheet' ? 'Feedback' : 'Feedback Sheet';
            const altRange = `'${altSheet}'!A${row}:M${row}`;
            try {
              await updateSheetRange(targetSpreadsheetId, altRange, [rowValues], { accessToken });
              syncedToSheets = true;
            } catch (err) {
              console.warn('Google Sheets Feedback single sync error:', err);
            }
          }
        }

        return NextResponse.json({
          success: true,
          sheet: 'Feedback Sheet',
          rowNumber: row,
          range: `'Feedback Sheet'!A${row}:M${row}`,
          syncedToSheets,
        });
      }

      if (typeof body?.rowNumber === 'number' && (body.learned !== undefined || body.notes !== undefined)) {
        const row = body.rowNumber;
        await db
          .insert(schema.diaryEntries)
          .values({
            id: `entry-${row}`,
            rowNumber: row,
            learned: body.learned ?? '',
            notes: body.notes ?? '',
            updatedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.diaryEntries.rowNumber,
            set: {
              learned: body.learned ?? '',
              notes: body.notes ?? '',
              updatedAt: new Date().toISOString(),
            },
          });

        let syncedToSheets = false;
        if (targetSpreadsheetId && accessToken) {
          try {
            const range = `'Onboarding Diary'!G${row}:H${row}`;
            const values = [[body.learned ?? '', body.notes ?? '']];
            await updateSheetRange(targetSpreadsheetId, range, values, { accessToken });
            syncedToSheets = true;
          } catch (syncErr) {
            console.warn('Google Sheets Diary sync error:', syncErr);
          }
        }

        return NextResponse.json({
          success: true,
          rowNumber: row,
          learned: body.learned ?? '',
          notes: body.notes ?? '',
          syncedToSheets,
        });
      }
    }

    const nonDbSpreadsheetId = targetSpreadsheetId || '';

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
      const result = await updateSheetRange(nonDbSpreadsheetId, range, values, { accessToken });
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
            await updateSheetRange(nonDbSpreadsheetId, range, [rowValues], { accessToken });
            updatedRows.push(row);
          } catch {
            const altSheet = primarySheet === 'Feedback Sheet' ? 'Feedback' : 'Feedback Sheet';
            const altRange = `'${altSheet}'!A${row}:M${row}`;
            await updateSheetRange(nonDbSpreadsheetId, altRange, [rowValues], { accessToken });
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
        const result = await updateSheetRange(nonDbSpreadsheetId, range, [rowValues], { accessToken });
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
          const result = await updateSheetRange(nonDbSpreadsheetId, altRange, [rowValues], { accessToken });
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
      const result = await updateSheetRange(nonDbSpreadsheetId, range, values, { accessToken });
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
      const result = await updateSheetRange(nonDbSpreadsheetId, body.range, body.values, { accessToken });
      return NextResponse.json({
        success: true,
        ...result,
        values: body.values,
      });
    }

    // 3. If single cell value is specified
    if (typeof body?.value === 'string') {
      const range = body.range || "'Onboarding Diary'!H15";
      const result = await updateSheetCell(nonDbSpreadsheetId, range, body.value, { accessToken });
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
