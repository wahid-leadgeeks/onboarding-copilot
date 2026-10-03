'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DIARY_COCKPIT_STORAGE_KEY,
  calculateDiaryCockpitProgress,
  clipboardAllDiaryFullTable,
  clipboardAllDiaryGtoH,
  clipboardRowForDiary,
  readDiaryCockpitEntries,
  upsertDiaryCockpitEntry,
  writeDiaryCockpitEntries,
  OFFICIAL_DIARY_TOPICS,
  type DiaryEntryRecord,
  type DiaryTopicItem,
} from '@/lib/diary-cockpit';
import { DiaryDetailSheet } from '@/app/components/DiaryDetailSheet';
import { BulkSyncModal, type BulkSyncModalRow } from '@/app/components/BulkSyncModal';
import { RowTag } from '@/app/components/RowTag';
import { SheetToolsMenu, type SheetToolsMenuItem } from '@/app/components/SheetToolsMenu';
import { useToast } from '@/app/components/Toast';
import { IconCheck, IconEdit } from '@/app/components/Icons';
import {
  buildDiarySyncBody,
  effectiveSyncSource,
  DIARY_SHEET_NAME,
  diaryBulkSyncPlan,
  diaryScopeSummaries,
  type DiarySyncScope,
} from '@/lib/bulk-sync';

const DIARY_SHEET_GID = '592196667';
const SCOPE_SUMMARIES = diaryScopeSummaries(OFFICIAL_DIARY_TOPICS);

function topicTitle(topic: DiaryTopicItem): string {
  return topic.topic.split('\n')[0];
}

export default function DiaryPage() {
  const { toast } = useToast();
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryRecord[]>([]);
  const [activeTopic, setActiveTopic] = useState<DiaryTopicItem | null>(null);
  const [copiedRowNumber, setCopiedRowNumber] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs-notes' | 'todo' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncScope, setSyncScope] = useState<DiarySyncScope>('official');
  const [copiedAll, setCopiedAll] = useState<'notes' | 'table' | null>(null);
  const [dataSource, setDataSource] = useState<'database' | 'local' | 'loading'>('loading');
  // True once /api/diary has answered (or failed). Local entries show at once but are never synced before this.
  const [remoteSettled, setRemoteSettled] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data?.spreadsheetId) {
          setSpreadsheetId(data.spreadsheetId);
        }
      })
      .catch(() => {});

    try {
      const local = readDiaryCockpitEntries(localStorage.getItem(DIARY_COCKPIT_STORAGE_KEY));
      setDiaryEntries(local);
      if (local.length > 0) setDataSource('local');
    } catch {
      /* ignore */
    }

    fetch('/api/diary')
      .then((res) => res.json())
      .then((data) => {
        if (data?.entries && Array.isArray(data.entries) && data.entries.length > 0) {
          setDataSource('database');
          setRemoteSettled(true);
          setDiaryEntries((prev) => {
            let merged = [...prev];
            for (const item of data.entries) {
              merged = upsertDiaryCockpitEntry(merged, item);
            }
            try {
              localStorage.setItem(DIARY_COCKPIT_STORAGE_KEY, writeDiaryCockpitEntries(merged));
            } catch {
              /* ignore */
            }
            return merged;
          });
        } else {
          setDataSource((prev) => (prev === 'loading' ? 'local' : prev));
          setRemoteSettled(true);
        }
      })
      .catch(() => {
        setDataSource((prev) => (prev === 'loading' ? 'local' : prev));
        setRemoteSettled(true);
      });
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
    fetch('/api/diary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
    const saved = OFFICIAL_DIARY_TOPICS.find((t) => t.rowNumber === entry.rowNumber);
    toast.success(saved ? `Saved your notes for “${topicTitle(saved)}”.` : 'Saved your notes.');
  }

  async function handleCopyRow(topic: DiaryTopicItem, entry?: DiaryEntryRecord) {
    const learned = entry ? entry.learned : (topic.defaultLearned || '');
    const notes = entry ? entry.notes : (topic.defaultNotes || '');
    const row = clipboardRowForDiary(topic.rowNumber, learned, notes);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedRowNumber(topic.rowNumber);
        toast.success('Copied. Paste it into the spreadsheet.');
        setTimeout(() => setCopiedRowNumber(null), 2500);
      }
    } catch {
      toast.error('Could not access the clipboard.');
    }
  }

  async function handleCopyAll(kind: 'notes' | 'table', maxRow: number) {
    const text =
      kind === 'notes'
        ? clipboardAllDiaryGtoH(diaryEntries, OFFICIAL_DIARY_TOPICS, maxRow)
        : clipboardAllDiaryFullTable(diaryEntries, OFFICIAL_DIARY_TOPICS, maxRow);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedAll(kind);
        toast.success('Copied. Paste it into the spreadsheet.');
        setTimeout(() => setCopiedAll(null), 2500);
        return;
      }
    } catch {
      /* fall through */
    }
    toast.error('Could not access the clipboard.');
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
        `row ${topic.rowNumber}`.includes(q) ||
        `#${topic.rowNumber}` === q.trim()
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

  // Bulk sync: the plan states exactly what POST /api/diary/sync would write for the chosen scope.
  const scopeSummary = SCOPE_SUMMARIES[syncScope];
  const syncPlan = useMemo(
    () => diaryBulkSyncPlan(diaryEntries, OFFICIAL_DIARY_TOPICS, scopeSummary.maxRow),
    [diaryEntries, scopeSummary.maxRow]
  );
  const syncRows: BulkSyncModalRow[] = useMemo(() => {
    const titles = new Map(OFFICIAL_DIARY_TOPICS.map((t) => [t.rowNumber, topicTitle(t)]));
    return syncPlan.rows.map((row) => ({
      rowNumber: row.rowNumber,
      label: titles.get(row.rowNumber) ?? row.label,
      status: row.ready ? 'ready' : 'blocking',
    }));
  }, [syncPlan]);
  const syncSource = effectiveSyncSource(remoteSettled, dataSource);
  const syncDisabledReason =
    syncSource === 'loading'
      ? 'Your notes are still loading. Syncing unlocks once they have loaded.'
      : !syncPlan.aligned
        ? 'Some topics are missing from this range, so it cannot be synced.'
        : null;
  const sheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${DIARY_SHEET_GID}#gid=${DIARY_SHEET_GID}`
    : null;
  const rowRange = `rows 2–${scopeSummary.maxRow}`;

  const copyItems: SheetToolsMenuItem[] = [
    {
      id: 'copy-all-notes',
      label: 'Copy all notes (G–H)',
      hint: `${rowRange} · paste at G2`,
      onSelect: () => handleCopyAll('notes', scopeSummary.maxRow),
      state: copiedAll === 'notes' ? 'done' : 'idle',
      doneLabel: 'Copied all notes',
    },
    {
      id: 'copy-full-table',
      label: 'Copy full table (A–H)',
      hint: `${rowRange} · paste at A2`,
      onSelect: () => handleCopyAll('table', scopeSummary.maxRow),
      state: copiedAll === 'table' ? 'done' : 'idle',
      doneLabel: 'Copied full table',
    },
    ...(sheetUrl
      ? [{ id: 'open-sheet', label: 'Open Google Sheet', hint: `The '${DIARY_SHEET_NAME}' tab`, href: sheetUrl }]
      : []),
  ];

  const pageToolItems: SheetToolsMenuItem[] = [
    {
      id: 'sync-all',
      label: 'Sync all to spreadsheet…',
      hint: syncSource === 'loading' ? 'Available once your notes have loaded' : 'Review the topics before anything is written',
      disabled: syncSource === 'loading',
      onSelect: () => setIsSyncModalOpen(true),
    },
    ...copyItems,
  ];

  function handleFillFromSync(rowNumber: number) {
    const topic = OFFICIAL_DIARY_TOPICS.find((t) => t.rowNumber === rowNumber);
    if (topic) setActiveTopic(topic);
  }

  const pillClass = (active: boolean, activeClass: string, idleClass: string) =>
    `inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium transition sm:min-h-8 ${
      active ? `${activeClass} shadow-xs` : idleClass
    }`;
  const idlePill = 'bg-stone-100 text-stone-700 hover:bg-stone-200';

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="animate-fade-up relative z-10 pb-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Your learning notes</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Onboarding Diary
            </h1>
            <p className="mt-1 text-sm text-stone-600" aria-live="polite">
              {dataSource === 'loading'
                ? 'Loading…'
                : `${progress.totalCount} topics · Write three things you learned and your own notes for each.`}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-lavender-50 px-3.5 py-1 text-xs font-semibold text-lavender-800">
              {progress.completedCount} of {progress.totalCount} documented
            </span>
            <SheetToolsMenu items={pageToolItems} />
          </div>
        </div>
      </header>

      {/* Attention Callout if notes pending */}
      {nextPendingTopic && (
        <section
          aria-labelledby="diary-next-pending"
          className="animate-fade-up stagger-1 mb-5 rounded-2xl border-l-4 border-peach-400 bg-peach-50/70 p-4 shadow-2xs"
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-peach-200 text-peach-800">
                <IconEdit className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-peach-200 px-2 py-0.5 text-xs font-semibold text-peach-900">
                    Needs notes
                  </span>
                  <span className="text-xs font-medium text-stone-600">{nextPendingTopic.day}</span>
                  <RowTag rowNumber={nextPendingTopic.rowNumber} />
                </div>
                <h2 id="diary-next-pending" className="text-sm font-semibold text-stone-900">
                  {topicTitle(nextPendingTopic)}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTopic(nextPendingTopic)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-stone-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:min-h-8 sm:self-center"
            >
              Add notes
            </button>
          </div>
        </section>
      )}

      {/* Progress & filters */}
      <section
        data-tour="diary-topics-list"
        aria-label="Diary topics"
        className="animate-fade-up stagger-2 rounded-3xl bg-white p-4 sm:p-5 shadow-soft"
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {progress.completedCount}{' '}
              <span className="font-normal text-stone-500 text-lg sm:text-xl">
                / {progress.totalCount}
              </span>
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                progress.isComplete
                  ? 'bg-mint-50 text-mint-800'
                  : progress.needsNotesCount > 0
                  ? 'bg-peach-50 text-peach-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {progress.isComplete
                ? 'All complete! 🎉'
                : progress.needsNotesCount > 0
                ? `${progress.needsNotesCount} ${progress.needsNotesCount === 1 ? 'needs' : 'need'} notes`
                : `${progress.todoCount} to do`}
            </span>
          </div>

          <div className="w-full sm:w-64">
            <label htmlFor="diary-search" className="sr-only">
              Search topics
            </label>
            <input
              id="diary-search"
              type="search"
              placeholder="Search topic or leader…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 text-xs text-stone-800 placeholder:text-stone-500 focus:border-stone-900 focus:bg-white focus:outline-none sm:min-h-9"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-label="Topics documented"
          aria-valuemin={0}
          aria-valuemax={progress.totalCount}
          aria-valuenow={progress.completedCount}
          className="mt-3 h-1.5 rounded-full bg-stone-100"
        >
          <div
            className="bar-gradient progress-shimmer h-1.5 rounded-full transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-stone-100 pb-3" role="group" aria-label="Filter topics">
          <button
            type="button"
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            className={pillClass(statusFilter === 'all', 'bg-stone-900 text-white', idlePill)}
          >
            All ({progress.totalCount})
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === 'needs-notes'}
            onClick={() => setStatusFilter('needs-notes')}
            className={pillClass(
              statusFilter === 'needs-notes',
              'bg-peach-700 text-white',
              progress.needsNotesCount > 0 ? 'bg-peach-50 font-semibold text-peach-800 hover:bg-peach-100' : idlePill
            )}
          >
            Needs notes ({progress.needsNotesCount})
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === 'todo'}
            onClick={() => setStatusFilter('todo')}
            className={pillClass(statusFilter === 'todo', 'bg-stone-900 text-white', idlePill)}
          >
            To do ({progress.todoCount})
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === 'completed'}
            onClick={() => setStatusFilter('completed')}
            className={pillClass(statusFilter === 'completed', 'bg-mint-700 text-white', idlePill)}
          >
            Completed ({progress.completedCount})
          </button>
        </div>

        {/* One-line topic rows */}
        <ul className="mt-3 space-y-2">
          {filteredTopics.map(({ topic, status }) => {
            const isCompleted = status === 'completed';
            const isNeedsNotes = status === 'needs-notes';

            return (
              <li key={topic.id}>
                <button
                  type="button"
                  onClick={() => setActiveTopic(topic)}
                  className={`group flex min-h-11 w-full min-w-0 flex-col justify-between gap-2.5 rounded-2xl border p-3 text-left transition-all sm:flex-row sm:items-center sm:px-4 sm:py-2.5 ${
                    isCompleted
                      ? 'border-stone-100 bg-white/70 hover:border-stone-200 hover:bg-white'
                      : isNeedsNotes
                      ? 'border-peach-200 bg-peach-50/30 hover:border-peach-300 hover:bg-peach-50/60 shadow-2xs'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-2xs'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {/* Status Indicator */}
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isCompleted
                          ? 'bg-mint-100 text-mint-800'
                          : isNeedsNotes
                          ? 'bg-peach-100 text-peach-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                      aria-hidden="true"
                    >
                      {isCompleted ? (
                        <IconCheck className="h-3.5 w-3.5" />
                      ) : isNeedsNotes ? (
                        <IconEdit className="h-3 w-3" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-stone-300" />
                      )}
                    </span>

                    <RowTag rowNumber={topic.rowNumber} />

                    <span className="min-w-0 truncate text-sm font-medium text-stone-900">
                      {topicTitle(topic)}
                    </span>
                  </span>

                  {/* Right side: leader + status */}
                  <span className="flex min-w-0 shrink-0 items-center justify-between gap-2 pl-9 sm:justify-end sm:pl-0">
                    <span className="min-w-0 truncate rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                      <span className="sr-only">Led by </span>
                      {topic.pic}
                    </span>

                    {isCompleted ? (
                      <span className="px-2 py-0.5 text-xs font-semibold text-mint-800">Done ✓</span>
                    ) : isNeedsNotes ? (
                      <span className="rounded-full bg-peach-100 px-2.5 py-1 text-xs font-semibold text-peach-800">
                        Add notes
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 transition group-hover:bg-stone-200">
                        Write notes
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {filteredTopics.length === 0 && (
          <p className="py-8 text-center text-xs text-stone-500">
            {dataSource === 'loading' ? 'Loading…' : 'No diary topics match your filter.'}
          </p>
        )}
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

      <BulkSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sync all to the spreadsheet"
        description="Writes your learnings and notes for every topic in the range you choose."
        warning={
          <p className="font-semibold">
            This replaces the learnings and notes cells for {syncPlan.count} rows ({rowRange}, cells {syncPlan.range}) in
            the shared &lsquo;{DIARY_SHEET_NAME}&rsquo; sheet. What&apos;s there now will be overwritten.
          </p>
        }
        controls={({ busy }) => (
          <fieldset className="space-y-2" disabled={busy}>
            <legend className="text-sm font-semibold text-stone-900">Which topics?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['official', 'all'] as const).map((scope) => {
                const summary = SCOPE_SUMMARIES[scope];
                return (
                  <label key={scope} className="relative flex min-h-11 cursor-pointer">
                    <input
                      type="radio"
                      name="diary-sync-scope"
                      value={scope}
                      checked={syncScope === scope}
                      disabled={busy}
                      onChange={() => setSyncScope(scope)}
                      className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                    <span className="flex w-full items-center gap-2.5 rounded-2xl border border-stone-200 px-3 py-2 text-sm text-stone-700 transition peer-checked:border-stone-900 peer-checked:bg-stone-50 peer-checked:font-semibold peer-checked:text-stone-900 peer-focus-visible:ring-2 peer-focus-visible:ring-stone-900 peer-focus-visible:ring-offset-2">
                      <span
                        aria-hidden="true"
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          syncScope === scope ? 'border-stone-900' : 'border-stone-400'
                        }`}
                      >
                        {syncScope === scope && <span className="size-2 rounded-full bg-stone-900" />}
                      </span>
                      {summary.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-stone-600">
              Counting the {syncScope === 'official' ? 'official range' : 'all-topics range'}: {scopeSummary.count} topics,{' '}
              {rowRange}. Topics outside it are left unchanged in the sheet.
            </p>
          </fieldset>
        )}
        rows={syncRows}
        writeCount={syncPlan.count}
        blockingLabel="Needs notes"
        blockingCountLabel="not filled in yet"
        blockingHelp="Add learnings and notes to these topics before syncing:"
        onFill={handleFillFromSync}
        endpoint="/api/diary/sync"
        buildBody={() => buildDiarySyncBody(syncScope, scopeSummary.maxRow, diaryEntries, syncSource)}
        disabledReason={syncDisabledReason}
        formatSuccess={(data) => {
          const updated = typeof data.totalUpdatedRows === 'number' ? data.totalUpdatedRows : syncPlan.count;
          return `Updated ${updated} topics in the spreadsheet.`;
        }}
        onSyncSuccess={() => toast.success('Diary synced to the spreadsheet.')}
        toolsItems={copyItems}
        sheetUrl={sheetUrl}
      />
    </main>
  );
}
