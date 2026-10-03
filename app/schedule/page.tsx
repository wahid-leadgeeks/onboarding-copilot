'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScheduleCard } from '@/app/components/ScheduleCard';
import { ScheduleCompletedRow } from '@/app/components/ScheduleCompletedRow';
import { ActivityDetailSheet } from '@/app/components/ActivityDetailSheet';
import { ScheduleFillModal } from '@/app/components/ScheduleFillModal';
import { BulkSyncModal, type BulkSyncModalRow } from '@/app/components/BulkSyncModal';
import { SheetToolsMenu, type SheetToolsMenuItem } from '@/app/components/SheetToolsMenu';
import { LearningModal } from '@/app/components/LearningModal';
import type { LearningActivityContext, LearningSubmission } from '@/app/components/LearningModal';
import { useToast } from '@/app/components/Toast';
import { IconLightbulb, IconCalendar, IconX, IconZap, IconChevronDown } from '@/app/components/Icons';
import {
  OFFICIAL_SCHEDULE_ACTIVITIES,
  SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY,
  readScheduleCustomizations,
  writeScheduleCustomizations,
  clipboardRowForScheduleGtoL,
  clipboardRowForScheduleFull,
  getMergedScheduleActivities,
  type ScheduleActivity,
} from '@/lib/schedule-catalog';
import { DIARY_STORAGE_KEY, appendDiary, readDiary } from '@/lib/local-records';
import { diarySyncPayload, learningDiaryEntry } from '@/lib/learning-capture';
import { buildScheduleSyncBody, scheduleBulkSyncPlan, scheduleChunkClipboard } from '@/lib/bulk-sync';
import { markSynced, notifySyncChanged } from '@/lib/sync-status';
import { topicTitle } from '@/lib/today-view';
import {
  DEFAULT_SCHEDULE_FILTERS,
  HIDE_COMPLETED_STORAGE_KEY,
  SCHEDULE_WEEK_TABS,
  activeFilterCount,
  activityAnchorId,
  activityIdFromHash,
  filterScheduleActivities,
  filtersRevealing,
  groupScheduleByWeek,
  matchesWeekTab,
  nextUpActivity,
  readHideCompleted,
  reflectedActivityIds,
  splitCompletedRuns,
  weekGroupHeading,
  writeHideCompleted,
  type ScheduleFilters,
} from '@/lib/schedule-view';

const TIP_DISMISSED_STORAGE_KEY = 'onboarding-schedule-tip-dismissed';
const STANDARD_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

type PendingScroll = { id: string; focus: boolean; smooth: boolean };

export default function MasterSchedulePage() {
  const { toast } = useToast();
  const [scheduleCatalog, setScheduleCatalog] = useState<ScheduleActivity[]>(() => [...OFFICIAL_SCHEDULE_ACTIVITIES]);
  const [dataSource, setDataSource] = useState<'loading' | 'database' | 'catalog'>('loading');
  const [filters, setFilters] = useState<ScheduleFilters>(DEFAULT_SCHEDULE_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleActivity | null>(null);
  const [detailActivity, setDetailActivity] = useState<ScheduleActivity | null>(null);
  const [copiedRowToast, setCopiedRowToast] = useState<{ rowNumber: number; type: 'G-K' | 'G-L' | 'Full' } | null>(null);
  const [scheduleTipDismissed, setScheduleTipDismissed] = useState(true);
  const [syncHelpOpen, setSyncHelpOpen] = useState(false);
  const [isSyncingRow, setIsSyncingRow] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [copiedChunk, setCopiedChunk] = useState<number | null>(null);
  const [reflectedIds, setReflectedIds] = useState<Set<string>>(() => new Set());
  const [selectedActivityForLearning, setSelectedActivityForLearning] = useState<ScheduleActivity | null>(null);
  const [showLearningCapture, setShowLearningCapture] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<PendingScroll | null>(null);
  const initialScrollDone = useRef(false);
  const catalogRef = useRef(scheduleCatalog);

  useEffect(() => {
    catalogRef.current = scheduleCatalog;
  }, [scheduleCatalog]);

  // Per-device preferences and reflections: read once on mount.
  useEffect(() => {
    setScheduleTipDismissed(readStorage(TIP_DISMISSED_STORAGE_KEY) === 'true');
    const hide = readHideCompleted(readStorage(HIDE_COMPLETED_STORAGE_KEY));
    if (hide !== null) setFilters((current) => ({ ...current, hideCompleted: hide }));
    setReflectedIds(reflectedActivityIds(readDiary(readStorage(DIARY_STORAGE_KEY))));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      try {
        const res = await fetch('/api/schedule?catalog=true', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.activities) && data.activities.length > 0) {
            setScheduleCatalog(data.activities);
            setDataSource(data.source === 'database' ? 'database' : 'catalog');
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load live schedule from database, using local catalog:', err);
      }

      if (isMounted) {
        const savedCustoms = readScheduleCustomizations(readStorage(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
        setScheduleCatalog(getMergedScheduleActivities(savedCustoms));
        setDataSource('catalog');
      }
    }

    loadSchedule();

    return () => {
      isMounted = false;
    };
  }, []);

  /** Shows an activity: clears filters that hide it, then scrolls to it once rendered. */
  const focusActivity = useCallback((id: string, options: { focus: boolean; smooth: boolean }) => {
    const item = catalogRef.current.find((activity) => activity.id === id);
    if (!item) return;
    setFilters((current) => filtersRevealing(item, current, new Date()));
    setPendingScroll({ id, ...options });
  }, []);

  // After the schedule loads: follow a #activity-{id} link, otherwise bring the next activity into view once.
  useEffect(() => {
    if (dataSource === 'loading' || initialScrollDone.current) return;
    initialScrollDone.current = true;
    const hashId = activityIdFromHash(window.location.hash);
    if (hashId) {
      focusActivity(hashId, { focus: true, smooth: false });
      return;
    }
    if (window.location.hash) return;
    const next = nextUpActivity(catalogRef.current, new Date());
    if (next) setPendingScroll({ id: next.id, focus: false, smooth: false });
  }, [dataSource, focusActivity]);

  // Later hash changes and the global search palette (which dispatches nova:focus-activity on this page).
  useEffect(() => {
    function onHashChange() {
      const id = activityIdFromHash(window.location.hash);
      if (id) focusActivity(id, { focus: true, smooth: true });
    }
    function onFocusActivity(event: Event) {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id !== 'string' || !id) return;
      try {
        window.history.replaceState(null, '', `#${activityAnchorId(id)}`);
      } catch {
        /* URL update is cosmetic */
      }
      focusActivity(id, { focus: true, smooth: true });
    }
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('nova:focus-activity', onFocusActivity);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('nova:focus-activity', onFocusActivity);
    };
  }, [focusActivity]);

  useEffect(() => {
    if (!pendingScroll) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(activityAnchorId(pendingScroll.id));
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: pendingScroll.smooth ? 'smooth' : 'auto' });
        if (pendingScroll.focus) target.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
      }
      setPendingScroll(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingScroll, filters]);

  function updateFilters(patch: Partial<ScheduleFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function handleToggleHideCompleted() {
    const next = !filters.hideCompleted;
    updateFilters({ hideCompleted: next });
    writeHideCompleted(safeStorage(), next);
  }

  function handleDismissScheduleTip() {
    setScheduleTipDismissed(true);
    try {
      localStorage.setItem(TIP_DISMISSED_STORAGE_KEY, 'true');
    } catch {
      /* preference only */
    }
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through */
    }
    toast.error('Could not access the clipboard.');
    return false;
  }

  async function handleCopyGtoK(item: ScheduleActivity) {
    if (await copyText(clipboardRowForScheduleGtoL(item))) {
      setCopiedRowToast({ rowNumber: item.rowNumber, type: 'G-L' });
      toast.success(`Copied “${topicTitle(item.topic)}” for the spreadsheet.`);
      setTimeout(() => setCopiedRowToast(null), 3000);
    }
  }

  async function handleCopyFullRow(item: ScheduleActivity) {
    if (await copyText(clipboardRowForScheduleFull(item))) {
      setCopiedRowToast({ rowNumber: item.rowNumber, type: 'Full' });
      toast.success(`Copied the full row for “${topicTitle(item.topic)}”.`);
      setTimeout(() => setCopiedRowToast(null), 3000);
    }
  }

  async function handleSyncRowDirectly(item: ScheduleActivity) {
    setIsSyncingRow(true);
    try {
      const response = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'Schedule',
          rowNumber: item.rowNumber,
          durationMinutes: item.durationMinutes,
          startTime: item.startTime,
          endTime: item.endTime,
          progress: item.progress || 'Done',
          materialsLink: item.materialsLink,
          notes: item.notes,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'API sync failed');
      }

      markSynced(safeStorage());
      notifySyncChanged();
      toast.success(`Synced “${topicTitle(item.topic)}” to the spreadsheet.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'The spreadsheet could not be updated';
      toast.error(`Couldn't sync: ${msg}. You can copy the row from Sheet tools instead.`);
    } finally {
      setIsSyncingRow(false);
    }
  }

  function handleSaveScheduleCustomization(updated: ScheduleActivity) {
    const nextCatalog = scheduleCatalog.map((s) => (s.id === updated.id ? updated : s));
    setScheduleCatalog(nextCatalog);
    if (detailActivity?.id === updated.id) {
      setDetailActivity(updated);
    }

    try {
      const existing = readScheduleCustomizations(localStorage.getItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
      const nextCustoms = { ...existing, [updated.id]: updated };
      localStorage.setItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY, writeScheduleCustomizations(nextCustoms));
    } catch {
      toast.error('Saved for now, but this device could not store the change.');
    }
    toast.success(`Saved your changes to “${topicTitle(updated.topic)}”.`);
    setEditingScheduleItem(null);
  }

  function openReflection(act: ScheduleActivity) {
    setSelectedActivityForLearning(act);
    setShowLearningCapture(true);
  }

  async function handleLearningSave(submission: LearningSubmission) {
    if (!selectedActivityForLearning) return;
    const item = selectedActivityForLearning;
    const activityCtx = {
      activityId: item.id,
      activityName: item.topic.split('\n')[0],
    };
    const baseEntry = learningDiaryEntry(submission, activityCtx, new Date().toISOString());
    const entry = {
      ...baseEntry,
      ...(submission.takeaways ? { takeaways: submission.takeaways } : {}),
      ...(submission.topic ? { topic: submission.topic } : {}),
      ...(submission.day ? { day: submission.day } : {}),
      ...(submission.date ? { date: submission.date } : {}),
      ...(submission.week !== undefined ? { week: submission.week } : {}),
      ...(submission.pic ? { pic: submission.pic } : {}),
      ...(submission.activityCount !== undefined ? { activityCount: submission.activityCount } : {}),
      ...(submission.notes ? { notes: submission.notes } : {}),
    };

    const existing = readDiary(localStorage.getItem(DIARY_STORAGE_KEY));
    const nextDiary = appendDiary(existing, entry);
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(nextDiary));
    setReflectedIds(reflectedActivityIds(nextDiary));

    await fetch('/api/diary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(diarySyncPayload(entry)),
    }).catch(() => null);

    toast.success('Reflection saved to your diary.');
    setShowLearningCapture(false);
    setSelectedActivityForLearning(null);
  }

  // Statistics (computed from whatever is loaded)
  const now = new Date();
  const overallTotalCount = scheduleCatalog.length;
  const overallCompletedCount = scheduleCatalog.filter((a) => a.progress === 'Done').length;
  const overallProgressPercent = overallTotalCount > 0 ? Math.round((overallCompletedCount / overallTotalCount) * 100) : 0;
  const nextUp = nextUpActivity(scheduleCatalog, now);

  const weekCounts: Record<string, number> = {};
  for (const tab of SCHEDULE_WEEK_TABS) {
    weekCounts[tab] = scheduleCatalog.filter((a) => matchesWeekTab(a, tab, now)).length;
  }

  const currentWeekActivities = scheduleCatalog.filter((a) => matchesWeekTab(a, filters.week, now));
  const dayCounts: Record<string, number> = {};
  currentWeekActivities.forEach((a) => {
    if (a.day && a.day !== 'TBD') {
      dayCounts[a.day] = (dayCounts[a.day] || 0) + 1;
    }
  });
  const availableDays = STANDARD_DAYS.filter((d) => (dayCounts[d] || 0) > 0);
  const showDayPills = filters.week !== 'Today' && availableDays.length > 1;

  const filteredScheduleActivities = filterScheduleActivities(scheduleCatalog, filters, now);
  const visibleGroups = groupScheduleByWeek(filteredScheduleActivities);
  const weekTotals = new Map(groupScheduleByWeek(scheduleCatalog).map((g) => [g.key, g]));
  const hiddenFilterCount = activeFilterCount(filters);

  // Bulk sync: plan from exactly the list that is posted (all weeks, rows with data only).
  const syncPlan = useMemo(() => scheduleBulkSyncPlan(scheduleCatalog), [scheduleCatalog]);
  const syncRows: BulkSyncModalRow[] = useMemo(
    () =>
      [
        ...syncPlan.rowsWithData.map((a) => ({ rowNumber: a.rowNumber, label: topicTitle(a.topic), status: 'ready' as const })),
        ...syncPlan.skipped.map((a) => ({ rowNumber: a.rowNumber, label: topicTitle(a.topic), status: 'skipped' as const })),
      ].sort((a, b) => a.rowNumber - b.rowNumber),
    [syncPlan]
  );
  const syncDisabledReason =
    dataSource === 'loading'
      ? 'Your schedule is still loading. Syncing unlocks once it has loaded.'
      : syncPlan.rowsWithData.length === 0
        ? 'No activities have details to sync yet.'
        : null;
  const chunkToolItems: SheetToolsMenuItem[] = syncPlan.chunks.map((chunk) => ({
    id: `chunk-${chunk.startRow}`,
    label: chunk.startRow === chunk.endRow ? `Copy row ${chunk.startRow}` : `Copy rows ${chunk.startRow}–${chunk.endRow}`,
    hint: `Paste at G${chunk.startRow}`,
    state: copiedChunk === chunk.startRow ? 'done' : 'idle',
    doneLabel: 'Copied',
    onSelect: async () => {
      if (await copyText(scheduleChunkClipboard(chunk))) {
        setCopiedChunk(chunk.startRow);
        setTimeout(() => setCopiedChunk(null), 3000);
      }
    },
  }));

  const pageToolItems: SheetToolsMenuItem[] = [
    {
      id: 'sync-all',
      label: 'Sync all to spreadsheet…',
      hint: dataSource === 'loading' ? 'Available once your schedule has loaded' : 'Review the rows before anything is written',
      disabled: dataSource === 'loading',
      onSelect: () => setIsSyncModalOpen(true),
    },
    {
      id: 'how-sync-works',
      label: 'How spreadsheet sync works',
      onSelect: () => setSyncHelpOpen(true),
    },
  ];

  const learningActivityContext: LearningActivityContext | null = selectedActivityForLearning
    ? {
        id: selectedActivityForLearning.id,
        topic: selectedActivityForLearning.topic.split('\n')[0],
        pic: selectedActivityForLearning.pic,
        day: selectedActivityForLearning.day,
        date: selectedActivityForLearning.date,
        week: selectedActivityForLearning.week,
        activityCount: selectedActivityForLearning.activityCount,
      }
    : null;

  const pillClass = (active: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition sm:min-h-9 ${
      active ? 'bg-stone-900 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900'
    }`;
  const dayPillClass = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium transition sm:min-h-8 ${
      active ? 'bg-mint-700 text-white shadow-2xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
    }`;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="animate-fade-up pb-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Your 90-day schedule</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">Onboarding Schedule</h1>
            <p className="mt-1 text-sm text-stone-500" aria-live="polite">
              {dataSource === 'loading'
                ? 'Loading your schedule…'
                : `${overallCompletedCount} of ${overallTotalCount} activities done (${overallProgressPercent}%).`}
            </p>
          </div>

          <SheetToolsMenu items={pageToolItems} />
        </div>

        <div
          role="progressbar"
          aria-label="Schedule progress"
          aria-valuemin={0}
          aria-valuemax={overallTotalCount}
          aria-valuenow={overallCompletedCount}
          className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100"
        >
          <div className="bar-gradient progress-shimmer h-full rounded-full transition-all" style={{ width: `${overallProgressPercent}%` }} />
        </div>

        {nextUp && dataSource !== 'loading' && (
          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="min-w-0 truncate text-stone-600">
              <span className="font-semibold text-stone-900">Next up:</span> {topicTitle(nextUp.topic)}
            </span>
            <button
              type="button"
              onClick={() => focusActivity(nextUp.id, { focus: true, smooth: true })}
              className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 sm:min-h-8"
            >
              Jump to next
            </button>
          </div>
        )}
      </header>

      {syncHelpOpen && (
        <section
          aria-labelledby="sync-help-title"
          className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-950 shadow-2xs"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="sync-help-title" className="font-semibold">
              How spreadsheet sync works
            </h2>
            <button
              type="button"
              onClick={() => setSyncHelpOpen(false)}
              aria-label="Close sync help"
              className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-sky-100 hover:text-stone-800 sm:size-9"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sky-900">
            <li>Your time, progress, links and notes are saved on this device first.</li>
            <li>
              To update the company spreadsheet for one activity, open its Sheet tools menu and choose Sync this row.
            </li>
            <li>To update every activity that has details, choose Sync all to spreadsheet from the Sheet tools menu above. You can review the rows before anything is written.</li>
            <li>If syncing isn&apos;t available, copy from the same menu and paste into the spreadsheet yourself.</li>
          </ul>
        </section>
      )}

      {!scheduleTipDismissed && (
        <div className="mb-6 rounded-2xl border border-sky-100/80 bg-sky-50/70 p-3.5 text-sm text-sky-900 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <IconLightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <p className="font-medium text-sky-950">
                Tap any activity to see its outline, log your time, or write a reflection.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissScheduleTip}
              className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-sky-100/60 hover:text-stone-700 sm:size-9"
              aria-label="Dismiss tip"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Week tabs: one scrollable row */}
      <div
        data-tour="schedule-toolbar"
        role="group"
        aria-label="Show week"
        className="-mx-5 mb-4 flex gap-1.5 overflow-x-auto border-b border-stone-100 px-5 pb-3 sm:mx-0 sm:px-0"
      >
        {SCHEDULE_WEEK_TABS.map((w) => {
          const active = filters.week === w;
          return (
            <button
              key={w}
              type="button"
              aria-pressed={active}
              onClick={() => updateFilters({ week: w, day: 'All' })}
              className={pillClass(active)}
            >
              {w === 'Today' && <IconZap className="h-3 w-3 text-amber-400" />}
              <span className="whitespace-nowrap">{w}</span>
              <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-stone-800 text-stone-200' : 'bg-stone-200 text-stone-700'}`}>
                {weekCounts[w] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {filters.week === 'Week 1' && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 text-sm text-amber-900">
          <IconCalendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <span>
            Onboarding started on <strong>Tue 1 Sep 2026</strong>, so Week 1 has no Monday. Monday activities start in Week 2.
          </span>
        </div>
      )}

      {/* Search + filters */}
      <div className="mb-5 space-y-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 grow sm:max-w-xs">
            <label htmlFor="schedule-search" className="sr-only">
              Search activities
            </label>
            <input
              id="schedule-search"
              type="search"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Search topic or leader…"
              className="min-h-11 w-full rounded-full border border-stone-200 bg-stone-50 py-1.5 pl-3.5 pr-11 text-sm text-stone-800 placeholder-stone-500 focus:border-mint-500 focus:bg-white sm:min-h-9 sm:text-xs [&::-webkit-search-cancel-button]:hidden"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => updateFilters({ search: '' })}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 hover:text-stone-800 sm:size-9"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="schedule-filters"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 sm:hidden"
          >
            <span>Filters{hiddenFilterCount > 0 ? ` (${hiddenFilterCount} active)` : ''}</span>
            <IconChevronDown className={`h-3.5 w-3.5 text-stone-500 transition ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div id="schedule-filters" className={`${filtersOpen ? 'flex' : 'hidden'} flex-wrap items-center gap-2 sm:flex`}>
          {showDayPills && (
            <div role="group" aria-label="Day" className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                aria-pressed={filters.day === 'All'}
                onClick={() => updateFilters({ day: 'All' })}
                className={dayPillClass(filters.day === 'All')}
              >
                All days ({currentWeekActivities.length})
              </button>
              {availableDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={filters.day === d}
                  onClick={() => updateFilters({ day: d })}
                  className={dayPillClass(filters.day === d)}
                >
                  {d} ({dayCounts[d] || 0})
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <label htmlFor="schedule-progress" className="sr-only">
              Progress
            </label>
            <select
              id="schedule-progress"
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="min-h-11 rounded-full border border-stone-200 bg-white px-3 text-xs text-stone-700 shadow-2xs focus:border-stone-900 sm:min-h-9"
            >
              <option value="All">All progress ({currentWeekActivities.length})</option>
              <option value="Done">Done</option>
              <option value="In Progress">In Progress</option>
              <option value="On-Hold">On-Hold</option>
              <option value="Reschedule">Reschedule</option>
              <option value="Not Started">Not Started</option>
            </select>

            <button
              type="button"
              role="switch"
              aria-checked={filters.hideCompleted}
              onClick={handleToggleHideCompleted}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-2xs transition hover:bg-stone-50 sm:min-h-9"
            >
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 shrink-0 rounded-full transition ${filters.hideCompleted ? 'bg-mint-700' : 'bg-stone-300'}`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white shadow-2xs transition-all ${
                    filters.hideCompleted ? 'left-4.5' : 'left-0.5'
                  }`}
                />
              </span>
              <span>Hide completed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activities, grouped by week */}
      {filteredScheduleActivities.length === 0 ? (
        <div className="rounded-2xl border border-stone-100 bg-white p-8 text-center shadow-soft">
          <p className="text-sm font-medium text-stone-600">
            {dataSource === 'loading' ? 'Loading your schedule…' : 'No activities match your filters.'}
          </p>
          {dataSource !== 'loading' && (
            <button
              type="button"
              onClick={() => setFilters({ ...DEFAULT_SCHEDULE_FILTERS })}
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-stone-100 px-4 text-xs font-semibold text-stone-800 transition hover:bg-stone-200 sm:min-h-9"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const totals = weekTotals.get(group.key);
            const headingId = `week-${group.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            return (
              <section key={group.key} aria-labelledby={headingId}>
                <h2
                  id={headingId}
                  className="sticky top-14 z-10 -mx-5 bg-cream/95 px-5 py-2 text-sm font-semibold text-stone-800 backdrop-blur-sm sm:-mx-8 sm:px-8 md:top-0"
                >
                  {weekGroupHeading(group.title, totals?.doneCount ?? group.doneCount, totals?.items.length ?? group.items.length)}
                </h2>
                <div className="mt-2 space-y-3">
                  {splitCompletedRuns(group.items).map((run) =>
                    run.kind === 'done' ? (
                      <ul
                        key={`done-${run.items[0].id}`}
                        className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-2xs"
                      >
                        {run.items.map((item) => (
                          <ScheduleCompletedRow
                            key={item.id}
                            item={item}
                            hasReflection={reflectedIds.has(item.id)}
                            onOpen={(act) => setDetailActivity(act)}
                          />
                        ))}
                      </ul>
                    ) : (
                      <ScheduleCard
                        key={run.item.id}
                        item={run.item}
                        isCurrentTimer={false}
                        isTimerRunning={false}
                        isTimerPaused={false}
                        elapsedSeconds={0}
                        startedAt={null}
                        hasReflection={reflectedIds.has(run.item.id)}
                        onViewDetails={(act) => setDetailActivity(act)}
                        onStartTimer={() => {
                          window.location.href = '/';
                        }}
                        onFillRow={(act) => setEditingScheduleItem(act)}
                        onSyncRow={(act) => void handleSyncRowDirectly(act)}
                        onCopyGtoK={(act) => void handleCopyGtoK(act)}
                        onCopyFullRow={(act) => void handleCopyFullRow(act)}
                        onWriteReflection={openReflection}
                        copiedToast={copiedRowToast}
                      />
                    )
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Slide-Over Detail Sheet */}
      <ActivityDetailSheet
        activity={detailActivity}
        isOpen={Boolean(detailActivity)}
        onClose={() => setDetailActivity(null)}
        onEdit={(act) => setEditingScheduleItem(act)}
        onCopyGtoK={(act) => void handleCopyGtoK(act)}
        onCopyFullRow={(act) => void handleCopyFullRow(act)}
        onSyncRow={(act) => void handleSyncRowDirectly(act)}
        copiedToast={copiedRowToast}
        isSyncing={isSyncingRow}
        onWriteReflection={openReflection}
      />

      {editingScheduleItem && (
        <ScheduleFillModal
          activity={editingScheduleItem}
          onClose={() => setEditingScheduleItem(null)}
          onSave={handleSaveScheduleCustomization}
        />
      )}

      <LearningModal
        open={showLearningCapture}
        activity={learningActivityContext}
        onSave={(submission) => void handleLearningSave(submission)}
        onSkip={() => {
          setShowLearningCapture(false);
          setSelectedActivityForLearning(null);
        }}
      />

      <BulkSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sync all to the spreadsheet"
        description="Writes the time, progress, link and notes you've logged for every activity that has details."
        warning={
          <>
            <p className="font-semibold">
              This overwrites {syncPlan.rowsWithData.length} rows in the shared &lsquo;Schedule&rsquo; sheet. What&apos;s there now will be replaced.
            </p>
            {syncPlan.ranges.length > 0 && (
              <p className="mt-1 break-words">Cells written: {syncPlan.ranges.join(', ')}.</p>
            )}
            <p className="mt-1">
              Activities with only some details filled in will have their other cells cleared.
              {syncPlan.skipped.length > 0 &&
                ` ${syncPlan.skipped.length} ${syncPlan.skipped.length === 1 ? 'activity has' : 'activities have'} no details and ${syncPlan.skipped.length === 1 ? 'is' : 'are'} left unchanged.`}
            </p>
          </>
        }
        rows={syncRows}
        writeCount={syncPlan.rowsWithData.length}
        endpoint="/api/schedule/sync"
        buildBody={() => buildScheduleSyncBody(syncPlan, dataSource)}
        disabledReason={syncDisabledReason}
        formatSuccess={(data) => {
          const updated = typeof data.totalUpdatedRows === 'number' ? data.totalUpdatedRows : syncPlan.rowsWithData.length;
          return `Updated ${updated} activities in the spreadsheet.`;
        }}
        onSyncSuccess={() => toast.success('Schedule synced to the spreadsheet.')}
        toolsItems={chunkToolItems}
      />
    </main>
  );
}
