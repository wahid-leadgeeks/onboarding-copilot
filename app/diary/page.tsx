'use client';

import { useEffect, useState } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
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
import { DiaryDetailSheet } from '@/app/components/DiaryDetailSheet';
import { useToast } from '@/app/components/Toast';
import {
  IconCheck,
  IconEdit,
} from '@/app/components/Icons';

export default function DiaryPage() {
  const { toast } = useToast();
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryRecord[]>([]);
  const [activeTopic, setActiveTopic] = useState<DiaryTopicItem | null>(null);
  const [copiedRowNumber, setCopiedRowNumber] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs-notes' | 'todo' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      setDiaryEntries(readDiaryCockpitEntries(localStorage.getItem(DIARY_COCKPIT_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: DiaryEntryRecord[]) {
    setDiaryEntries(next);
    try {
      localStorage.setItem(DIARY_COCKPIT_STORAGE_KEY, writeDiaryCockpitEntries(next));
    } catch {
      /* ignore */
    }
  }

  function handleSaveTopic(entry: DiaryEntryRecord) {
    const next = upsertDiaryCockpitEntry(diaryEntries, entry);
    persist(next);
    toast.success(`Saved notes for Row ${entry.rowNumber}!`);
  }

  async function handleCopyRow(topic: DiaryTopicItem, entry?: DiaryEntryRecord) {
    const learned = entry ? entry.learned : (topic.defaultLearned || '');
    const notes = entry ? entry.notes : (topic.defaultNotes || '');
    const row = clipboardRowForDiary(topic.rowNumber, learned, notes);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedRowNumber(topic.rowNumber);
        toast.success(`Copied Row ${topic.rowNumber} TSV! Paste into Google Sheets.`);
        setTimeout(() => setCopiedRowNumber(null), 2500);
      }
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  }

  const progress = calculateDiaryCockpitProgress(diaryEntries);

  const filteredTopics = progress.rowStatuses.filter(({ topic, status }) => {
    if (statusFilter === 'needs-notes' && status !== 'needs-notes') return false;
    if (statusFilter === 'todo' && status !== 'todo') return false;
    if (statusFilter === 'completed' && status !== 'completed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        topic.topic.toLowerCase().includes(q) ||
        topic.pic.toLowerCase().includes(q) ||
        topic.day.toLowerCase().includes(q) ||
        `row ${topic.rowNumber}`.includes(q)
      );
    }
    return true;
  });

  const nextPendingTopic = progress.rowStatuses.find(
    (s) => s.status === 'needs-notes'
  )?.topic;

  // Previous & Next navigation inside the drawer
  const allTopics = progress.rowStatuses.map((r) => r.topic);
  const currentIndex = activeTopic ? allTopics.findIndex((t) => t.id === activeTopic.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allTopics.length - 1;
  const onPrevTopic = hasPrev ? () => setActiveTopic(allTopics[currentIndex - 1]) : undefined;
  const onNextTopic = hasNext ? () => setActiveTopic(allTopics[currentIndex + 1]) : undefined;

  const activeEntry = activeTopic
    ? diaryEntries.find((e) => e.rowNumber === activeTopic.rowNumber)
    : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Diary" />

      {/* Header */}
      <header className="animate-fade-up pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Worksheet: Onboarding Diary (Columns G &amp; H)
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Onboarding Diary
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              28 syllabus topics · Document 3 things you learned (Col G) &amp; personal notes (Col H).
            </p>
          </div>
          <span className="rounded-full bg-lavender-50 px-3.5 py-1 text-xs font-semibold text-lavender-800">
            {progress.completedCount} / {progress.totalCount} Documented
          </span>
        </div>
      </header>

      {/* Attention Callout if notes pending */}
      {nextPendingTopic && (
        <section className="animate-fade-up stagger-1 mb-5 rounded-2xl border-l-4 border-peach-400 bg-peach-50/70 p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-peach-200 text-peach-800">
                <IconEdit className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-peach-200 px-2 py-0.5 text-[11px] font-semibold text-peach-900">
                    Action Required
                  </span>
                  <span className="text-xs font-medium text-stone-500">
                    Row {nextPendingTopic.rowNumber} · {nextPendingTopic.day}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-stone-900">
                  {nextPendingTopic.topic}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTopic(nextPendingTopic)}
              className="inline-flex min-h-8 items-center justify-center rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:self-center shrink-0"
            >
              Fill Notes &amp; Sync
            </button>
          </div>
        </section>
      )}

      {/* Minimal Pulse Bar & Filter Cockpit */}
      <section className="animate-fade-up stagger-2 rounded-3xl bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {progress.completedCount}{' '}
              <span className="font-normal text-stone-400 text-lg sm:text-xl">
                / {progress.totalCount}
              </span>
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                progress.isComplete
                  ? 'bg-mint-50 text-mint-700'
                  : progress.needsNotesCount > 0
                  ? 'bg-peach-50 text-peach-700'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {progress.isComplete
                ? 'All complete! 🎉'
                : progress.needsNotesCount > 0
                ? `${progress.needsNotesCount} needs notes`
                : `${progress.todoCount} to do`}
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="search"
              placeholder="Search topic or PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 rounded-full bg-stone-100">
          <div
            className="bar-gradient progress-shimmer h-1.5 rounded-full transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-stone-100 pb-3">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All ({progress.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('needs-notes')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === 'needs-notes'
                ? 'bg-peach-500 text-white shadow-xs'
                : progress.needsNotesCount > 0
                ? 'bg-peach-50 text-peach-800 font-semibold hover:bg-peach-100'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Needs Notes ({progress.needsNotesCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('todo')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === 'todo'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            To Do ({progress.todoCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === 'completed'
                ? 'bg-mint-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Completed ({progress.completedCount})
          </button>
        </div>

        {/* Clean 1-Line Topic Rows */}
        <div className="mt-3 space-y-2">
          {filteredTopics.map(({ topic, status, entry }) => {
            const isCompleted = status === 'completed';
            const isNeedsNotes = status === 'needs-notes';

            return (
              <div
                key={topic.id}
                onClick={() => setActiveTopic(topic)}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border p-3 sm:px-4 sm:py-2.5 cursor-pointer transition-all ${
                  isCompleted
                    ? 'border-stone-100 bg-white/70 hover:border-stone-200 hover:bg-white'
                    : isNeedsNotes
                    ? 'border-peach-200 bg-peach-50/30 hover:border-peach-300 hover:bg-peach-50/60 shadow-2xs'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status Indicator */}
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isCompleted
                        ? 'bg-mint-100 text-mint-700'
                        : isNeedsNotes
                        ? 'bg-peach-100 text-peach-700'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {isCompleted ? (
                      <IconCheck className="h-3.5 w-3.5" />
                    ) : isNeedsNotes ? (
                      <IconEdit className="h-3 w-3" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-stone-300" />
                    )}
                  </span>

                  {/* Row Badge */}
                  <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-bold text-stone-700 shrink-0">
                    Row {topic.rowNumber}
                  </span>

                  {/* Topic Title */}
                  <h3 className="text-sm font-medium text-stone-900 truncate">
                    {topic.topic.split('\n')[0]}
                  </h3>
                </div>

                {/* Right side: PIC chip + Action badge */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-9 sm:pl-0">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                    {topic.pic}
                  </span>

                  {isCompleted ? (
                    <span className="text-xs font-semibold text-mint-700 px-2 py-0.5">
                      Done ✓
                    </span>
                  ) : isNeedsNotes ? (
                    <span className="rounded-full bg-peach-100 px-2.5 py-1 text-xs font-semibold text-peach-800">
                      Add Notes
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-100 hover:bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 transition">
                      Write Notes
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredTopics.length === 0 && (
            <p className="py-8 text-center text-xs text-stone-400">
              No diary topics match your filter.
            </p>
          )}
        </div>
      </section>

      {/* Slide-over Diary Detail & Inline Edit Drawer */}
      <DiaryDetailSheet
        topic={activeTopic}
        existingEntry={activeEntry}
        isOpen={Boolean(activeTopic)}
        onClose={() => setActiveTopic(null)}
        onSave={handleSaveTopic}
        onCopyTsv={handleCopyRow}
        onPrevTopic={onPrevTopic}
        onNextTopic={onNextTopic}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isCopied={Boolean(activeTopic && copiedRowNumber === activeTopic.rowNumber)}
      />
    </main>
  );
}
