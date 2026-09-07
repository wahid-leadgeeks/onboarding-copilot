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
import { DiaryModal } from '@/app/components/DiaryModal';
import { useToast } from '@/app/components/Toast';

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
    toast.success(`Saved notes for Row ${entry.rowNumber}! 🌿`);
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

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Diary" />

      {/* Header */}
      <header className="animate-fade-up pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Worksheet: Onboarding Diary (Columns G &amp; H)
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Onboarding Diary
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              28 syllabus topics · Document 3 things you learned (Col G) &amp; your personal notes (Col H).
            </p>
          </div>
          <span className="rounded-full bg-lavender-50 px-3.5 py-1 text-xs font-semibold text-lavender-800">
            {progress.completedCount} / {progress.totalCount} Documented
          </span>
        </div>
      </header>

      {/* Attention Callout if notes pending */}
      {nextPendingTopic && (
        <section className="animate-fade-up stagger-1 mb-6 rounded-2xl border-l-4 border-peach-400 bg-peach-50/70 p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-peach-200 text-base">
                ✍️
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
                <h3 className="mt-1 text-sm font-semibold text-stone-900 sm:text-base">
                  {nextPendingTopic.topic}
                </h3>
                <p className="text-xs text-stone-600">
                  Learnings are saved, but Column H notes are still empty.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTopic(nextPendingTopic)}
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:self-center shrink-0"
            >
              Fill Notes &amp; Sync 🚀
            </button>
          </div>
        </section>
      )}

      {/* Progress & Filters Card (Single-View Cockpit) */}
      <section className="animate-fade-up stagger-2 rounded-3xl bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-3xl font-semibold text-stone-900 sm:text-4xl">
              {progress.completedCount} <span className="font-normal text-stone-400 text-xl sm:text-2xl">/ {progress.totalCount}</span>
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                progress.isComplete
                  ? 'bg-mint-50 text-mint-700'
                  : progress.needsNotesCount > 0
                    ? 'bg-peach-50 text-peach-700'
                    : 'bg-stone-100 text-stone-600'
              }`}
            >
              {progress.isComplete
                ? 'All complete! 🌿'
                : progress.needsNotesCount > 0
                  ? `${progress.needsNotesCount} needs notes ✍️`
                  : `${progress.todoCount} to do 🌱`}
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="search"
              placeholder="Search topic, PIC, day..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 rounded-full bg-stone-100">
          <div
            className="bar-gradient progress-shimmer h-2 rounded-full transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-5 flex flex-wrap gap-1.5 border-b border-stone-100 pb-4">
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

        {/* Topics List */}
        <ul className="mt-3 divide-y divide-stone-100" role="list">
          {filteredTopics.map(({ topic, status, entry }) => {
            const isCompleted = status === 'completed';
            const isNeedsNotes = status === 'needs-notes';
            const isCopied = copiedRowNumber === topic.rowNumber;

            const learned = (entry ? entry.learned : topic.defaultLearned || '').trim();
            const notes = (entry ? entry.notes : topic.defaultNotes || '').trim();

            return (
              <li
                key={topic.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isCompleted
                        ? 'bg-mint-100 text-mint-700'
                        : isNeedsNotes
                          ? 'bg-peach-100 text-peach-700'
                          : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {isCompleted ? '✓' : isNeedsNotes ? '✍️' : '○'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-stone-900 sm:text-base leading-snug">
                        {topic.topic.split('\n')[0]}
                      </h3>
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
                        Row {topic.rowNumber}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {topic.day} · Week {topic.week}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">PIC: {topic.pic}</p>

                    {learned && (
                      <p className="mt-1 line-clamp-1 text-xs text-stone-600">
                        <span className="font-semibold text-stone-500">Learnings:</span>{' '}
                        {learned.replace(/\n/g, ' · ')}
                      </p>
                    )}

                    {notes ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                        <span className="font-semibold text-stone-400">Notes:</span>{' '}
                        {notes.replace(/\n/g, ' · ')}
                      </p>
                    ) : isNeedsNotes ? (
                      <p className="mt-0.5 text-xs font-medium text-peach-700">
                        Pending notes entry (Column H)...
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyRow(topic, entry)}
                    className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95 focus-visible:outline focus-visible:outline-2"
                  >
                    {isCopied ? '✓ Copied!' : '📋 Copy TSV'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTopic(topic)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      isNeedsNotes
                        ? 'bg-peach-500 text-white font-semibold hover:bg-peach-600'
                        : isCompleted
                          ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    {isNeedsNotes ? 'Fill Notes' : isCompleted ? 'Edit' : 'Document'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {filteredTopics.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-400">
            No diary topics match your search or filter.
          </p>
        )}
      </section>

      {/* Diary Modal */}
      {activeTopic && (
        <DiaryModal
          topic={activeTopic}
          existingEntry={diaryEntries.find((e) => e.rowNumber === activeTopic.rowNumber)}
          onSave={handleSaveTopic}
          onClose={() => setActiveTopic(null)}
        />
      )}
    </main>
  );
}
