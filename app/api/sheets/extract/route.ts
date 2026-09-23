import { NextResponse } from 'next/server';
import fs from 'fs';
import {
  NOVA_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  resolveActiveSession,
  serializeSessionCookie,
} from '@/lib/auth/session';
import {
  extractGoogleSpreadsheet,
  extractContentFromWorkbookBytes,
  type ExtractedFeedbackItem,
  type ExtractedTimelineItem,
  type ExtractedSpreadsheetContent,
} from '@/lib/sheets/extractor';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc } from 'drizzle-orm';
import { scheduleActivityToActivity, type ScheduleActivity } from '@/lib/schedule-catalog';
import type { StoredDiary } from '@/lib/local-records';
import type { FeedbackRatings } from '@/lib/feedback';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get('id') || process.env.GOOGLE_SHEETS_ID;
  const source = url.searchParams.get('source');

  // Allow explicit testing against local united file
  if (source === 'local') {
    const localPath = 'fixtures/onboarding-kit.xlsx';
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      const result = extractContentFromWorkbookBytes(
        new Uint8Array(buf),
        spreadsheetId || 'sample-spreadsheet-id',
        'United Onboarding Kit (Local Test File)'
      );
      return NextResponse.json({
        success: true,
        source: 'local_file',
        data: result,
      });
    }
  }

  if (source !== 'sheets' && isDbConfigured()) {
    const [dbActivities, dbDiaryTopics, dbDiaryEntries, dbFeedbackSessions, dbFeedbackEntries, dbTimelineStages] =
      await Promise.all([
        db.select().from(schema.activities).orderBy(asc(schema.activities.rowNumber)),
        db.select().from(schema.diaryTopics).orderBy(asc(schema.diaryTopics.rowNumber)),
        db.select().from(schema.diaryEntries).orderBy(asc(schema.diaryEntries.rowNumber)),
        db.select().from(schema.feedbackSessions).orderBy(asc(schema.feedbackSessions.rowNumber)),
        db.select().from(schema.feedbackEntries).orderBy(asc(schema.feedbackEntries.rowNumber)),
        db.select().from(schema.timelineStages).orderBy(asc(schema.timelineStages.stageNumber)),
      ]);

    const scheduleActivities = dbActivities.map((row) => {
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
      const act = scheduleActivityToActivity(item);
      if (row.actualStart) act.actualStart = row.actualStart;
      if (row.actualEnd) act.actualEnd = row.actualEnd;
      if (row.durationMinutes) act.durationMinutes = row.durationMinutes;
      return act;
    });

    const feedbackItems: ExtractedFeedbackItem[] = dbFeedbackSessions.map((fs) => {
      const entry = dbFeedbackEntries.find((e) => e.sessionId === fs.id || e.rowNumber === fs.rowNumber);
      return {
        rowNumber: fs.rowNumber,
        sessionTitle: fs.title,
        pic: fs.pic,
        topic: fs.topic,
        department: fs.department,
        ratings: (entry?.ratings as Partial<FeedbackRatings>) || undefined,
        hasQuestions: entry?.hasQuestions ?? false,
        questionExplanation: entry?.questionExplanation ?? '',
        questionAddressing: entry?.questionAddressing ?? '',
        suggestions: entry?.suggestions ?? '',
        isEvaluated: Boolean(entry && entry.ratings && Object.keys(entry.ratings).length > 0),
      };
    });

    const diaryEntriesList: StoredDiary[] = dbDiaryEntries.map((e) => ({
      id: e.id,
      content: e.notes || e.learned,
      createdAt: e.updatedAt,
      topic: dbDiaryTopics.find((t) => t.rowNumber === e.rowNumber)?.topic,
      day: dbDiaryTopics.find((t) => t.rowNumber === e.rowNumber)?.day,
      week: dbDiaryTopics.find((t) => t.rowNumber === e.rowNumber)?.week,
      date: dbDiaryTopics.find((t) => t.rowNumber === e.rowNumber)?.date,
      pic: dbDiaryTopics.find((t) => t.rowNumber === e.rowNumber)?.pic,
      activityCount: dbDiaryTopics.find((t) => t.rowNumber === e.rowNumber)?.activityCount || undefined,
      notes: e.notes,
    }));

    const timelineList: ExtractedTimelineItem[] = dbTimelineStages.map((st) => ({
      stageNumber: st.stageNumber,
      stageName: st.stageName,
      start: st.startDate,
      end: st.endDate,
      objective: st.objective,
      keyActivities: st.keyActivities,
      outputsEvidence: st.outputsEvidence,
      minimumDuration: st.minimumDuration,
    }));

    const data: ExtractedSpreadsheetContent = {
      spreadsheetId: 'nova-db',
      title: 'NOVA Onboarding Database (nova-clone)',
      extractedAt: new Date().toISOString(),
      sheets: [
        { title: 'Schedule', rowCount: scheduleActivities.length, columnCount: 11 },
        { title: 'Onboarding Diary', rowCount: dbDiaryTopics.length, columnCount: 9 },
        { title: 'Feedback Sheet', rowCount: dbFeedbackSessions.length, columnCount: 13 },
        { title: 'Timeline', rowCount: dbTimelineStages.length, columnCount: 9 },
      ],
      schedule: {
        activities: scheduleActivities,
        count: scheduleActivities.length,
        skipped: 0,
        warnings: [],
      },
      diary: {
        entries: diaryEntriesList,
        count: diaryEntriesList.length,
        topics: dbDiaryTopics.map((dt) => ({
          rowNumber: dt.rowNumber,
          day: dt.day,
          week: dt.week,
          date: dt.date,
          activityCount: dt.activityCount ?? undefined,
          pic: dt.pic,
          topic: dt.topic,
          learned: dbDiaryEntries.find((e) => e.rowNumber === dt.rowNumber)?.learned || dt.defaultLearned || '',
          notes: dbDiaryEntries.find((e) => e.rowNumber === dt.rowNumber)?.notes || dt.defaultNotes || '',
          status: dbDiaryEntries.find((e) => e.rowNumber === dt.rowNumber)?.learned ? 'completed' : 'needs-notes',
        })),
        totalTopics: dbDiaryTopics.length,
      },
      timeline: {
        stages: timelineList,
        count: timelineList.length,
      },
      feedback: {
        sessions: feedbackItems,
        entries: dbFeedbackEntries.map((e) => ({
          sessionId: e.sessionId,
          sessionTitle: e.topic || e.sessionId,
          pic: e.pic || '',
          date: e.date || '',
          ratings: (e.ratings || {}) as FeedbackRatings,
          hasQuestions: e.hasQuestions ?? false,
          questionExplanation: e.questionExplanation || '',
          questionAddressing: (e.questionAddressing || '') as any,
          suggestions: e.suggestions || '',
          createdAt: e.updatedAt,
          updatedAt: e.updatedAt,
        })),
        count: dbFeedbackSessions.length,
        evaluatedCount: dbFeedbackEntries.filter((e) => e.ratings && Object.keys(e.ratings).length > 0).length,
      },
    };

    return NextResponse.json({
      success: true,
      source: 'postgresql_database',
      authenticated: true,
      user: { name: 'Onboarding Employee', email: 'employee@leadgeeks.com' },
      data,
    });
  }

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEETS_ID is not configured in .env.local and no id param was provided' },
      { status: 400 }
    );
  }

  // Check user authentication
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = new Map(
    cookieHeader.split(';').map((pair) => {
      const [k, ...v] = pair.trim().split('=');
      return [k, decodeURIComponent(v.join('='))] as const;
    })
  );

  const sessionCookie = cookies.get(NOVA_SESSION_COOKIE);
  const { session, refreshed } = await resolveActiveSession(sessionCookie);

  if (!session || !session.tokens?.accessToken) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        spreadsheetId,
        loginUrl: '/api/auth/login',
        message:
          'Google OAuth authentication is required to access your Google Sheet. Please sign in with Google at /api/auth/login or on Settings.',
      },
      { status: 401 }
    );
  }

  try {
    const data = await extractGoogleSpreadsheet(spreadsheetId, {
      accessToken: session.tokens.accessToken,
    });

    const response = NextResponse.json({
      success: true,
      source: 'google_sheets_api',
      user: session.user,
      data,
    });

    if (refreshed) {
      response.cookies.set(
        NOVA_SESSION_COOKIE,
        serializeSessionCookie(session),
        SESSION_COOKIE_OPTIONS
      );
    }

    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to extract Google Sheet';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        spreadsheetId,
      },
      { status: 502 }
    );
  }
}
