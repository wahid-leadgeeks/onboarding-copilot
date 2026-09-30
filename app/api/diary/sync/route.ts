import { NextResponse } from 'next/server';
import { getSessionAccessToken } from '@/lib/auth/session';
import { updateSheetRange } from '@/lib/sheets/extractor';
import {
  OFFICIAL_DIARY_TOPICS,
  type DiaryEntryRecord,
  type DiaryTopicItem,
} from '@/lib/diary-cockpit';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      spreadsheetId?: string;
      maxRow?: number;
      scope?: 'official' | 'all';
      entries?: DiaryEntryRecord[];
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
          message: 'Google OAuth authentication is required to sync diary entries to Google Sheets.',
        },
        { status: 401 }
      );
    }

    // 1. Fetch entries from body, database, or fallback catalog defaults
    let entriesMap = new Map<number, { learned: string; notes: string }>();

    // Seed defaults from catalog
    for (const dt of OFFICIAL_DIARY_TOPICS) {
      entriesMap.set(dt.rowNumber, {
        learned: dt.defaultLearned || '',
        notes: dt.defaultNotes || '',
      });
    }

    // If DB is configured, overlay live database entries
    if (isDbConfigured()) {
      try {
        const dbEntries = await db
          .select()
          .from(schema.diaryEntries)
          .orderBy(asc(schema.diaryEntries.rowNumber));

        for (const e of dbEntries) {
          const existing = entriesMap.get(e.rowNumber) || { learned: '', notes: '' };
          entriesMap.set(e.rowNumber, {
            learned: e.learned || existing.learned,
            notes: e.notes || existing.notes,
          });
        }
      } catch (dbErr) {
        console.warn('Database diary read error in sync route, using catalog overlay:', dbErr);
      }
    }

    // If caller passed entries in body, overlay them
    if (Array.isArray(body.entries) && body.entries.length > 0) {
      for (const e of body.entries) {
        const existing = entriesMap.get(e.rowNumber) || { learned: '', notes: '' };
        entriesMap.set(e.rowNumber, {
          learned: e.learned || existing.learned,
          notes: e.notes || existing.notes,
        });
      }
    }

    // 2. Determine target row range
    // 'official' corresponds to rows 2-25 (the 24 syllabus topics in the official spreadsheet)
    // 'all' includes extended topics up to row 29
    const maxRow = body.maxRow || (body.scope === 'all' ? 29 : 25);
    const targetTopics: readonly DiaryTopicItem[] = OFFICIAL_DIARY_TOPICS.filter(
      (t) => t.rowNumber >= 2 && t.rowNumber <= maxRow
    );

    const values: string[][] = targetTopics.map((topic) => {
      const entry = entriesMap.get(topic.rowNumber) || {
        learned: topic.defaultLearned || '',
        notes: topic.defaultNotes || '',
      };
      return [entry.learned, entry.notes];
    });

    // Safety gates: this route writes a whole G:H block, so it must never write
    // blanks (which would erase sheet content) or rows that are not aligned with
    // their sheet row. Both fail closed with zero Sheets calls.
    const isAligned =
      Number.isInteger(maxRow) &&
      values.length > 0 &&
      values.length === maxRow - 1 &&
      targetTopics.every((topic, i) => topic.rowNumber === i + 2);
    if (!isAligned) {
      return NextResponse.json(
        {
          success: false,
          error: `Refusing to sync: diary rows are not aligned with sheet rows 2-${maxRow}. Nothing was written.`,
        },
        { status: 409 }
      );
    }

    const emptyRows: number[] = [];
    targetTopics.forEach((topic, i) => {
      const [learned, notes] = values[i];
      if (
        typeof learned !== 'string' ||
        typeof notes !== 'string' ||
        learned.trim() === '' ||
        notes.trim() === ''
      ) {
        emptyRows.push(topic.rowNumber);
      }
    });
    if (emptyRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Refusing to sync: ${emptyRows.length} row(s) have an empty learned or notes value (rows ${emptyRows.join(', ')}). Fill them in first; nothing was written.`,
          emptyRows,
        },
        { status: 409 }
      );
    }

    const range = `'Onboarding Diary'!G2:H${maxRow}`;

    // 3. Push to Google Sheets API
    const result = await updateSheetRange(spreadsheetId, range, values, { accessToken });

    return NextResponse.json({
      success: true,
      range,
      startRow: 2,
      endRow: maxRow,
      totalUpdatedRows: values.length,
      totalUpdatedCells: values.length * 2,
      apiResult: result,
      message: `Successfully synchronized ${values.length} diary topics (${values.length * 2} cells: Columns G & H) to worksheet 'Onboarding Diary'.`,
    });
  } catch (error) {
    console.error('Error in POST /api/diary/sync:', error);
    const message = error instanceof Error ? error.message : 'Unknown synchronization error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
