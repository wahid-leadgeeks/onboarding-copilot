'use client';

import { useEffect, useState } from 'react';
import {
  ACTIVE_SESSION_STORAGE_KEY,
  DIARY_STORAGE_KEY,
  QUICK_NOTES_STORAGE_KEY,
  SESSION_HISTORY_STORAGE_KEY,
  convertQuickNote,
  editDiary,
  readDiary,
  readQuickNotes,
  readSessions,
  removeDiary,
  removeQuickNote,
  type StoredDiary,
  type StoredQuickNote,
  type StoredSession,
} from '@/lib/local-records';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import { mergeCompletedCount } from '@/lib/session/presentation';
import {
  IMPORTED_SCHEDULE_STORAGE_KEY,
  clipboardRowForSchedule,
  readImportedSchedule,
} from '@/lib/imported-schedule';
import { ExportNotes } from '@/app/components/ExportNotes';
import { LearningsFilters } from '@/app/components/LearningsFilters';
import { LearningRecordCard } from '@/app/components/LearningRecordCard';
import {
  activityFilterOptions,
  buildDiaryViews,
  buildQuickNoteViews,
  emptyRecordFilter,
  filterLearningRecords,
  isFilterActive,
  pruneSelection,
  toSelectableNotes,
  type LearningRecordFilter,
} from '@/lib/learning-records-view';
import type { Activity } from '@/lib/types/activity';
import { isActivityList } from '@/lib/sheets/types';
import {
  FEEDBACK_STORAGE_KEY,
  calculateFeedbackProgress,
  clipboardRowForFeedback,
  readFeedbackEntries,
  upsertFeedbackEntry,
  writeFeedbackEntries,
  type FeedbackEntry,
  type FeedbackSession,
} from '@/lib/feedback';
import { FeedbackModal } from '@/app/components/FeedbackModal';
import {
  DIARY_COCKPIT_STORAGE_KEY,
  calculateDiaryCockpitProgress,
  clipboardRowForDiary,
  readDiaryCockpitEntries,
  upsertDiaryCockpitEntry,
  writeDiaryCockpitEntries,
  type DiaryEntryRecord,
  type DiaryTopicItem,
} from '@/lib/diary-cockpit';
import { DiaryModal } from '@/app/components/DiaryModal';

export default function HistoryPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [diary, setDiary] = useState<StoredDiary[]>([]);
  const [quickNotes, setQuickNotes] = useState<StoredQuickNote[]>([]);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set<string>());
  const [exportMessage, setExportMessage] = useState('');
  const [filter, setFilter] = useState<LearningRecordFilter>(emptyRecordFilter());
  const [summary, setSummary] = useState<{
    completed: number;
    total: number;
    remaining: number;
    message: string;
    source?: string;
  } | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Feedback State
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [activeFeedbackSession, setActiveFeedbackSession] = useState<FeedbackSession | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [copiedScheduleId, setCopiedScheduleId] = useState<string | null>(null);

  // Diary Cockpit State
  const [diaryCockpitEntries, setDiaryCockpitEntries] = useState<DiaryEntryRecord[]>([]);
  const [activeDiaryTopic, setActiveDiaryTopic] = useState<DiaryTopicItem | null>(null);
  const [copiedDiaryRowNumber, setCopiedDiaryRowNumber] = useState<number | null>(null);
  const [diaryStatusFilter, setDiaryStatusFilter] = useState<'all' | 'needs-notes' | 'todo' | 'completed'>('all');
  const [diarySearchQuery, setDiarySearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      setSessions(
        readSessions(
          localStorage.getItem(SESSION_HISTORY_STORAGE_KEY) ??
            localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
        )
      );
      setDiary(readDiary(localStorage.getItem(DIARY_STORAGE_KEY)));
      setQuickNotes(readQuickNotes(localStorage.getItem(QUICK_NOTES_STORAGE_KEY)));
      setFeedbackEntries(readFeedbackEntries(localStorage.getItem(FEEDBACK_STORAGE_KEY)));
      setDiaryCockpitEntries(readDiaryCockpitEntries(localStorage.getItem(DIARY_COCKPIT_STORAGE_KEY)));
    } catch {
      /* ignore malformed local state */
    }

    fetch('/api/summary', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: unknown) => {
        if (!value || typeof value !== 'object') return;
        const data = value as Record<string, unknown>;
        if (
          typeof data.completed === 'number' &&
          typeof data.total === 'number' &&
          typeof data.remaining === 'number' &&
          typeof data.message === 'string'
        ) {
          setSummary({
            completed: data.completed,
            total: data.total,
            remaining: data.remaining,
            message: data.message,
            source: typeof data.source === 'string' ? data.source : undefined,
          });
        }
      })
      .catch(() => undefined);

    const imported = readImportedSchedule(localStorage.getItem(IMPORTED_SCHEDULE_STORAGE_KEY));
    if (imported) {
      setActivities(imported.activities);
    } else {
      fetch('/api/schedule', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((value: unknown) => {
          if (isActivityList(value)) setActivities(value);
        })
        .catch(() => undefined);
    }
  }, []);

  const completedIds = new Set(sessions.map((session) => session.activityId));
  const summaryCompleted = summary ? mergeCompletedCount(summary.completed, completedIds.size) : 0;
  const summaryRemaining = summary ? Math.max(0, summary.total - summaryCompleted) : 0;
  const summaryMessage = !summary
    ? ''
    : summary.total === 0
      ? 'No activities are scheduled today.'
      : summaryRemaining === 0
        ? 'All scheduled activities are recorded.'
        : `${summaryCompleted} of ${summary.total} activities are recorded.`;

  const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(
    new Date()
  );
  const diaryViews = buildDiaryViews(diary);
  const quickViews = buildQuickNoteViews(quickNotes);
  const filteredDiary = filterLearningRecords(diaryViews, filter);
  const filteredQuickNotes = filterLearningRecords(quickViews, filter);
  const visibleViews = [...filteredDiary, ...filteredQuickNotes];
  const visibleNotes = toSelectableNotes(visibleViews);
  const selection = pruneSelection(selectedIds, visibleViews);
  const filterActive = isFilterActive(filter);
  const totalNotes = diaryViews.length + quickViews.length;
  const allSelected = visibleViews.length > 0 && selection.size === visibleViews.length;

  function toggleNote(id: string) {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    setSelectedIds(
      allSelected ? new Set<string>() : new Set(visibleViews.map((view) => view.id))
    );
  }

  function clearSelection() {
    setSelectedIds(new Set<string>());
  }

  function handleExported(count: number) {
    setExportMessage(`Exported ${count} notes · check your downloads`);
  }

  function persistDiary(next: StoredDiary[]) {
    setDiary(next);
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(next));
  }

  function persistQuickNotes(next: StoredQuickNote[]) {
    setQuickNotes(next);
    localStorage.setItem(QUICK_NOTES_STORAGE_KEY, JSON.stringify(next));
  }

  function handleSaveEdit(id: string, content: string) {
    persistDiary(editDiary(diary, { id, content, updatedAt: new Date().toISOString() }));
  }

  function handleDeleteDiary(id: string) {
    persistDiary(removeDiary(diary, id));
  }

  function handleDeleteQuickNote(id: string) {
    persistQuickNotes(removeQuickNote(quickNotes, id));
  }

  function handleConvert(id: string) {
    const next = convertQuickNote(quickNotes, diary, id);
    persistDiary(next.diary);
    persistQuickNotes(next.quickNotes);
  }

  // Feedback Handlers
  function persistFeedback(next: FeedbackEntry[]) {
    setFeedbackEntries(next);
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, writeFeedbackEntries(next));
    } catch {
      /* ignore localStorage quota/write errors */
    }
  }

  function handleSaveFeedback(entry: FeedbackEntry) {
    const next = upsertFeedbackEntry(feedbackEntries, entry);
    persistFeedback(next);
    setActiveFeedbackSession(null);
  }

  async function handleCopyFeedbackRow(entry: FeedbackEntry) {
    const row = clipboardRowForFeedback(entry);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedSessionId(entry.sessionId);
        setTimeout(() => setCopiedSessionId(null), 2500);
      }
    } catch {
      /* ignore clipboard write errors */
    }
  }

  async function handleCopyScheduleRow(activity: Activity) {
    const session = sessions.find((s) => s.activityId === activity.id);
    let resolvedActivity = activity;
    if (session) {
      const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      resolvedActivity = {
        ...activity,
        status: 'done',
        actualStart: activity.actualStart || formatTime(session.startedAt),
        actualEnd: activity.actualEnd || formatTime(session.finishedAt),
      };
    }
    const row = clipboardRowForSchedule(resolvedActivity);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedScheduleId(activity.id);
        setTimeout(() => setCopiedScheduleId(null), 2500);
      }
    } catch {
      /* ignore clipboard write errors */
    }
  }

  function persistDiaryCockpit(next: DiaryEntryRecord[]) {
    setDiaryCockpitEntries(next);
    try {
      localStorage.setItem(DIARY_COCKPIT_STORAGE_KEY, writeDiaryCockpitEntries(next));
    } catch {
      /* ignore */
    }
  }

  function handleSaveDiaryTopic(entry: DiaryEntryRecord) {
    const next = upsertDiaryCockpitEntry(diaryCockpitEntries, entry);
    persistDiaryCockpit(next);
  }

  async function handleCopyDiaryRow(topic: DiaryTopicItem, entry?: DiaryEntryRecord) {
    const learned = entry ? entry.learned : (topic.defaultLearned || '');
    const notes = entry ? entry.notes : (topic.defaultNotes || '');
    const row = clipboardRowForDiary(topic.rowNumber, learned, notes);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedDiaryRowNumber(topic.rowNumber);
        setTimeout(() => setCopiedDiaryRowNumber(null), 2500);
      }
    } catch {
      /* ignore clipboard write errors */
    }
  }

  const feedbackProgress = calculateFeedbackProgress(feedbackEntries);
  const diaryCockpitProgress = calculateDiaryCockpitProgress(diaryCockpitEntries);

  const filteredDiaryTopics = diaryCockpitProgress.rowStatuses.filter(({ topic, status }) => {
    if (diaryStatusFilter === 'needs-notes' && status !== 'needs-notes') return false;
    if (diaryStatusFilter === 'todo' && status !== 'todo') return false;
    if (diaryStatusFilter === 'completed' && status !== 'completed') return false;

    if (diarySearchQuery.trim()) {
      const q = diarySearchQuery.toLowerCase();
      return (
        topic.topic.toLowerCase().includes(q) ||
        topic.pic.toLowerCase().includes(q) ||
        topic.day.toLowerCase().includes(q) ||
        `row ${topic.rowNumber}`.includes(q)
      );
    }
    return true;
  });

  const nextPendingDiaryTopic = diaryCockpitProgress.rowStatuses.find(
    (s) => s.status === 'needs-notes'
  )?.topic;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Learnings" />

      <header className="animate-fade-up pb-8">
        <p className="text-sm font-medium text-stone-500">Your learning record</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Learnings
        </h1>
        <p className="mt-3 text-lg text-stone-600">Everything you've captured, in your words.</p>
      </header>

      {summary && (
        <section className="animate-fade-up stagger-1 mt-8 rounded-card bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="text-5xl font-semibold tracking-tight text-stone-900">
                {summaryCompleted}{' '}
                <span className="font-normal text-stone-400">of</span> {summary.total}
              </p>
              <p className="mt-2 text-sm text-stone-500">activities recorded today</p>
            </div>
            <p
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                summaryRemaining === 0
                  ? 'bg-mint-50 text-mint-700'
                  : 'bg-peach-50 text-peach-700'
              }`}
            >
              {summary.total === 0
                ? 'Nothing scheduled today.'
                : summaryRemaining === 0
                  ? 'All recorded. Nothing missing. 🌿'
                  : `${summaryRemaining} still to write ✍️`}
            </p>
          </div>
          <div className="mt-6 h-2.5 rounded-full bg-stone-200">
            <div
              className="bar-gradient progress-shimmer h-2.5 rounded-full transition-[width]"
              style={{
                width: `${summary.total === 0 ? 0 : Math.round((summaryCompleted / summary.total) * 100)}%`,
              }}
            />
          </div>
          <p className="sr-only" role="status">
            {summaryMessage}
          </p>
        </section>
      )}

      {/* Immediate Attention Callout Banner if a topic needs notes */}
      {nextPendingDiaryTopic && (
        <section className="animate-fade-up stagger-1 mt-6 rounded-card border-l-4 border-peach-400 bg-peach-50/60 p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-peach-200 text-base">
                ✍️
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-peach-200 px-2.5 py-0.5 text-xs font-semibold text-peach-900">
                    Action Required
                  </span>
                  <span className="text-xs font-medium text-stone-500">
                    Row {nextPendingDiaryTopic.rowNumber} · {nextPendingDiaryTopic.day}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-semibold text-stone-900">
                  {nextPendingDiaryTopic.topic}
                </h3>
                <p className="mt-0.5 text-xs text-stone-600">
                  Learnings are recorded in Column G, but your personal notes in Column H are still empty.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveDiaryTopic(nextPendingDiaryTopic)}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:self-center shrink-0"
            >
              Fill Notes & Sync 🚀
            </button>
          </div>
        </section>
      )}

      {/* Onboarding Diary Cockpit Section */}
      <section
        className="animate-fade-up stagger-2 mt-10"
        aria-labelledby="diary-cockpit-heading"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="diary-cockpit-heading"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            <span aria-hidden="true" className="inline-block size-2 rounded-full bg-lavender-400" />
            Onboarding Diary Cockpit
          </h2>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {diaryCockpitProgress.completedCount} of {diaryCockpitProgress.totalCount} documented
          </span>
        </div>

        <div className="rounded-card bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
                {diaryCockpitProgress.completedCount}{' '}
                <span className="font-normal text-stone-400">of</span> {diaryCockpitProgress.totalCount}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                syllabus topics documented across 3 onboarding weeks
              </p>
            </div>
            <p
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                diaryCockpitProgress.isComplete
                  ? 'bg-mint-50 text-mint-700'
                  : diaryCockpitProgress.needsNotesCount > 0
                    ? 'bg-peach-50 text-peach-700'
                    : 'bg-stone-100 text-stone-700'
              }`}
            >
              {diaryCockpitProgress.isComplete
                ? 'All 28 topics documented! 🌿'
                : diaryCockpitProgress.needsNotesCount > 0
                  ? `${diaryCockpitProgress.needsNotesCount} topic needs your notes ✍️`
                  : `${diaryCockpitProgress.todoCount} topics remaining 🌱`}
            </p>
          </div>

          <div
            className="mt-6 h-2.5 rounded-full bg-stone-200"
            role="progressbar"
            aria-valuenow={diaryCockpitProgress.completedCount}
            aria-valuemin={0}
            aria-valuemax={diaryCockpitProgress.totalCount}
            aria-label="Onboarding diary completion progress"
          >
            <div
              className="bar-gradient progress-shimmer h-2.5 rounded-full transition-[width]"
              style={{ width: `${diaryCockpitProgress.percentage}%` }}
            />
          </div>

          {/* Filters & Search */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter diary topics">
              <button
                type="button"
                role="tab"
                aria-selected={diaryStatusFilter === 'all'}
                onClick={() => setDiaryStatusFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  diaryStatusFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All ({diaryCockpitProgress.totalCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={diaryStatusFilter === 'needs-notes'}
                onClick={() => setDiaryStatusFilter('needs-notes')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  diaryStatusFilter === 'needs-notes'
                    ? 'bg-peach-500 text-white'
                    : diaryCockpitProgress.needsNotesCount > 0
                      ? 'bg-peach-50 text-peach-800 hover:bg-peach-100 font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Needs Notes ({diaryCockpitProgress.needsNotesCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={diaryStatusFilter === 'todo'}
                onClick={() => setDiaryStatusFilter('todo')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  diaryStatusFilter === 'todo'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                To Do ({diaryCockpitProgress.todoCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={diaryStatusFilter === 'completed'}
                onClick={() => setDiaryStatusFilter('completed')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  diaryStatusFilter === 'completed'
                    ? 'bg-mint-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Completed ({diaryCockpitProgress.completedCount})
              </button>
            </div>

            <div className="w-full sm:w-auto">
              <input
                type="search"
                placeholder="Search topics, PIC..."
                value={diarySearchQuery}
                onChange={(e) => setDiarySearchQuery(e.target.value)}
                className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none sm:w-56"
              />
            </div>
          </div>

          {/* Topics List */}
          <ul className="mt-4 divide-y divide-stone-100" role="list">
            {filteredDiaryTopics.map(({ topic, status, entry }) => {
              const isCompleted = status === 'completed';
              const isNeedsNotes = status === 'needs-notes';
              const isCopied = copiedDiaryRowNumber === topic.rowNumber;

              const learned = (entry ? entry.learned : topic.defaultLearned || '').trim();
              const notes = (entry ? entry.notes : topic.defaultNotes || '').trim();

              return (
                <li
                  key={topic.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      role="img"
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isCompleted
                          ? 'bg-mint-100 text-mint-700'
                          : isNeedsNotes
                            ? 'bg-peach-100 text-peach-700'
                            : 'bg-stone-100 text-stone-400'
                      }`}
                      aria-label={status}
                    >
                      {isCompleted ? '✓' : isNeedsNotes ? '✍️' : '○'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-medium text-stone-900 leading-snug">
                          {topic.topic.split('\n')[0]}
                        </h3>
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                          Row {topic.rowNumber}
                        </span>
                        <span className="text-xs text-stone-400">
                          Week {topic.week} · {topic.day}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">PIC: {topic.pic}</p>

                      {learned && (
                        <p className="mt-1.5 line-clamp-1 text-xs text-stone-600">
                          <span className="font-semibold text-stone-500">Learnings:</span>{' '}
                          {learned.replace(/\n/g, ' · ')}
                        </p>
                      )}

                      {notes ? (
                        <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                          <span className="font-semibold text-stone-400">Notes:</span>{' '}
                          {notes.replace(/\n/g, ' · ')}
                        </p>
                      ) : isNeedsNotes ? (
                        <p className="mt-1 text-xs font-medium text-peach-700">
                          Pending notes entry (Column H)...
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyDiaryRow(topic, entry)}
                      className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-400"
                      aria-label={`Copy TSV row for ${topic.topic}`}
                    >
                      {isCopied ? '✓ Copied! 🌿' : '📋 Copy TSV'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDiaryTopic(topic)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 ${
                        isNeedsNotes
                          ? 'bg-peach-500 text-white hover:bg-peach-600 focus-visible:outline-peach-500 font-semibold'
                          : isCompleted
                            ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 focus-visible:outline-stone-400'
                            : 'bg-stone-900 text-white hover:bg-stone-800 focus-visible:outline-stone-900'
                      }`}
                    >
                      {isNeedsNotes ? 'Fill Notes' : isCompleted ? 'Edit' : 'Document'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {filteredDiaryTopics.length === 0 && (
            <p className="py-12 text-center text-sm text-stone-400">
              No diary topics match your current filter.
            </p>
          )}
        </div>
      </section>

      {/* Session Feedback Section */}
      <section
        className="animate-fade-up stagger-3 mt-10"
        aria-labelledby="session-feedback-heading"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="session-feedback-heading"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500"
          >
            <span aria-hidden="true" className="inline-block size-2 rounded-full bg-sun-400" />
            Session Feedback
          </h2>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {feedbackProgress.evaluatedCount} of {feedbackProgress.totalCount} evaluated
          </span>
        </div>

        <div className="rounded-card bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
                {feedbackProgress.evaluatedCount}{' '}
                <span className="font-normal text-stone-400">of</span> {feedbackProgress.totalCount}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                required session evaluations completed
              </p>
            </div>
            <p
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                feedbackProgress.isComplete
                  ? 'bg-mint-50 text-mint-700'
                  : 'bg-peach-50 text-peach-700'
              }`}
            >
              {feedbackProgress.isComplete
                ? 'All 13 evaluated · Feedback complete! 🌿'
                : `${feedbackProgress.remainingCount} still to evaluate ✍️`}
            </p>
          </div>

          <div
            className="mt-6 h-2.5 rounded-full bg-stone-200"
            role="progressbar"
            aria-valuenow={feedbackProgress.evaluatedCount}
            aria-valuemin={0}
            aria-valuemax={feedbackProgress.totalCount}
            aria-label="Session feedback completion progress"
          >
            <div
              className="bar-gradient progress-shimmer h-2.5 rounded-full transition-[width]"
              style={{ width: `${feedbackProgress.percentage}%` }}
            />
          </div>

          <ul className="mt-8 divide-y divide-stone-100" role="list">
            {feedbackProgress.sessionStatuses.map(({ session, status, entry }) => {
              const isEvaluated = status === 'evaluated';
              const isCopied = copiedSessionId === session.id;

              return (
                <li
                  key={session.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      role="img"
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isEvaluated
                          ? 'bg-mint-100 text-mint-700'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                      aria-label={isEvaluated ? 'Evaluated' : 'Pending'}
                    >
                      {isEvaluated ? '✓' : '○'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-medium text-stone-900 leading-snug">
                          {session.title}
                        </h3>
                        <span className="text-xs text-stone-400">Row {session.rowNumber}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-stone-500">PIC: {session.pic}</p>
                      {entry && (
                        <p className="mt-1 text-xs text-stone-400">
                          Evaluated on {entry.date} · Overall rating: {entry.ratings.overall}/5
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isEvaluated && entry && (
                      <button
                        type="button"
                        onClick={() => handleCopyFeedbackRow(entry)}
                        className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-400"
                        aria-label={`Copy 13-column TSV row for ${session.title}`}
                      >
                        {isCopied ? '✓ Copied! 🌿' : '📋 Copy TSV'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveFeedbackSession(session)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 ${
                        isEvaluated
                          ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 focus-visible:outline-stone-400'
                          : 'bg-stone-900 text-white hover:bg-stone-800 focus-visible:outline-stone-900'
                      }`}
                    >
                      {isEvaluated ? 'Edit' : 'Evaluate'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="mt-10">
        <LearningsFilters
          filter={filter}
          activityOptions={activityFilterOptions(diaryViews)}
          onFilterChange={setFilter}
          onClear={() => setFilter(emptyRecordFilter())}
        />
      </div>

      {filterActive && (
        <p className="mt-3 text-sm text-stone-600" role="status">
          Showing {visibleViews.length} of {totalNotes} notes.
        </p>
      )}

      {visibleNotes.length > 0 && (
        <div className="mt-8">
          <ExportNotes
            notes={visibleNotes}
            selectedIds={selection}
            onToggleSelectAll={toggleSelectAll}
            onClearSelection={clearSelection}
            onExported={handleExported}
          />
        </div>
      )}

      {exportMessage && (
        <p className="mt-3 text-sm text-stone-600" role="status">
          {exportMessage}
        </p>
      )}

      {/* Today's Activities List */}
      <section className="animate-fade-up stagger-3 mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            {dateLabel}
          </h2>
          <span className="text-sm text-stone-500">
            {Math.max(
              sessions.length,
              activities.filter((a) => a.status === 'done').length
            )}{' '}
            completed
          </span>
        </div>
        <div className="rounded-card bg-white p-2 shadow-soft sm:p-4">
          <ul className="divide-y divide-stone-100">
            {activities.map((activity) => {
              const isCompleted = completedIds.has(activity.id) || activity.status === 'done';
              const status = isCompleted
                ? {
                    indicator: '✓',
                    label: 'Completed',
                    circle: 'bg-mint-100 text-mint-700',
                    text: 'text-mint-700',
                  }
                : {
                    indicator: '○',
                    label: 'Not started',
                    circle: 'bg-stone-100 text-stone-400',
                    text: 'text-stone-500',
                  };
              const session = sessions.find((s) => s.activityId === activity.id);
              const duration = session
                ? Math.floor((session.finishedAt - session.startedAt) / 60000)
                : (activity.durationMinutes ?? 0);
              const timeLabel =
                isCompleted && session
                  ? `${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(session.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${duration} min`
                  : activity.plannedStart === 'TBD'
                    ? activity.durationMinutes
                      ? `${activity.durationMinutes} min · Flexible`
                      : 'Flexible'
                    : `${activity.plannedStart} – ${activity.plannedEnd}${duration > 0 ? ` · ${duration} min` : ''}`;
              return (
                <li
                  key={activity.id}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-4 sm:px-5"
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${status.circle}`}
                    aria-label={status.label}
                  >
                    {status.indicator}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-stone-900">{activity.name}</h3>
                    <p className="mt-1 text-sm text-stone-500">{timeLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => void handleCopyScheduleRow(activity)}
                        className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-400"
                        aria-label={`Copy Schedule TSV row for ${activity.name}`}
                      >
                        {copiedScheduleId === activity.id ? '✓ Copied! 🌿' : '📋 Copy TSV'}
                      </button>
                    )}
                    <span className={`text-right text-sm font-medium ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Learning Diary */}
      <section className="animate-fade-up stagger-4 mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            <span aria-hidden="true" className="inline-block size-2 rounded-full bg-lavender-300" />
            Learning diary
          </h2>
          <span className="text-sm text-stone-500">
            {filterActive
              ? `${filteredDiary.length} of ${diaryViews.length} entries`
              : `${diaryViews.length} entries`}
          </span>
        </div>
        <div className="rounded-card bg-white p-6 shadow-soft sm:p-8">
          {filteredDiary.length ? (
            <div className="space-y-6">
              {filteredDiary
                .slice()
                .reverse()
                .map((view) => (
                  <LearningRecordCard
                    key={view.id}
                    view={view}
                    selected={selection.has(view.id)}
                    onToggleSelect={toggleNote}
                    onEdit={handleSaveEdit}
                    onDelete={handleDeleteDiary}
                  />
                ))}
            </div>
          ) : (
            <p className="px-4 py-14 text-center text-stone-400">
              {diaryViews.length === 0
                ? 'Nothing here yet. Your day is still unwritten.'
                : 'Nothing matches your search or filters.'}
            </p>
          )}
        </div>
      </section>

      {/* Quick Notes */}
      <section className="animate-fade-up stagger-5 mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            <span aria-hidden="true" className="inline-block size-2 rounded-full bg-peach-300" />
            Quick notes
          </h2>
          <span className="text-sm text-stone-500">
            {filterActive
              ? `${filteredQuickNotes.length} of ${quickViews.length} drafts`
              : `${quickViews.length} drafts`}
          </span>
        </div>
        <div className="rounded-card bg-white p-6 shadow-soft sm:p-8">
          {filteredQuickNotes.length ? (
            <div className="space-y-6">
              {filteredQuickNotes
                .slice()
                .reverse()
                .map((view) => (
                  <LearningRecordCard
                    key={view.id}
                    view={view}
                    selected={selection.has(view.id)}
                    onToggleSelect={toggleNote}
                    onConvert={handleConvert}
                    onDelete={handleDeleteQuickNote}
                  />
                ))}
            </div>
          ) : (
            <p className="px-4 py-14 text-center text-stone-400">
              {quickViews.length === 0
                ? 'Capture a thought on Today — drafts wait here for you.'
                : 'No quick notes match your search or filters.'}
            </p>
          )}
        </div>
      </section>

      {/* Feedback Modal Dialog */}
      {activeFeedbackSession && (
        <FeedbackModal
          session={activeFeedbackSession}
          existingEntry={feedbackEntries.find(
            (e) =>
              e.sessionId === activeFeedbackSession.id ||
              e.sessionId === `row-${activeFeedbackSession.rowNumber}`
          )}
          onSave={handleSaveFeedback}
          onClose={() => setActiveFeedbackSession(null)}
        />
      )}

      {/* Diary Topic Modal Dialog */}
      {activeDiaryTopic && (
        <DiaryModal
          topic={activeDiaryTopic}
          existingEntry={diaryCockpitEntries.find(
            (e) => e.rowNumber === activeDiaryTopic.rowNumber
          )}
          onSave={handleSaveDiaryTopic}
          onClose={() => setActiveDiaryTopic(null)}
        />
      )}
    </main>
  );
}
