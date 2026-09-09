'use client';

import { useEffect, useState } from 'react';
import { ScheduleCard } from '@/app/components/ScheduleCard';
import { ActivityDetailSheet } from '@/app/components/ActivityDetailSheet';
import { ScheduleFillModal } from '@/app/components/ScheduleFillModal';
import { LearningModal } from '@/app/components/LearningModal';
import type { LearningActivityContext, LearningSubmission } from '@/app/components/LearningModal';
import { useToast } from '@/app/components/Toast';
import {
  IconSearch,
  IconLightbulb,
  IconCalendar,
  IconX,
  IconZap,
} from '@/app/components/Icons';
import {
  OFFICIAL_SCHEDULE_ACTIVITIES,
  SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY,
  readScheduleCustomizations,
  writeScheduleCustomizations,
  clipboardRowForScheduleGtoK,
  clipboardRowForScheduleFull,
  getMergedScheduleActivities,
  isSameDate,
  type ScheduleActivity,
} from '@/lib/schedule-catalog';
import { DIARY_STORAGE_KEY, appendDiary, readDiary } from '@/lib/local-records';
import { diarySyncPayload, learningDiaryEntry } from '@/lib/learning-capture';

export default function MasterSchedulePage() {
  const { toast } = useToast();
  const [scheduleCatalog, setScheduleCatalog] = useState<ScheduleActivity[]>(() => [...OFFICIAL_SCHEDULE_ACTIVITIES]);
  const [selectedWeek, setSelectedWeek] = useState<string>('All');
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [scheduleSearch, setScheduleSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleActivity | null>(null);
  const [detailActivity, setDetailActivity] = useState<ScheduleActivity | null>(null);
  const [copiedRowToast, setCopiedRowToast] = useState<{ rowNumber: number; type: 'G-K' | 'Full' } | null>(null);
  const [scheduleTipDismissed, setScheduleTipDismissed] = useState(false);
  const [syncHelpExpanded, setSyncHelpExpanded] = useState(false);
  const [isSyncingRow, setIsSyncingRow] = useState(false);
  const [selectedActivityForLearning, setSelectedActivityForLearning] = useState<ScheduleActivity | null>(null);
  const [showLearningCapture, setShowLearningCapture] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScheduleTipDismissed(localStorage.getItem('onboarding-schedule-tip-dismissed') === 'true');
      const savedCustoms = readScheduleCustomizations(localStorage.getItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
      setScheduleCatalog(getMergedScheduleActivities(savedCustoms));
    }
  }, []);

  function handleDismissScheduleTip() {
    setScheduleTipDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-schedule-tip-dismissed', 'true');
    }
  }

  async function handleCopyGtoK(item: ScheduleActivity) {
    const tsv = clipboardRowForScheduleGtoK(item);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedRowToast({ rowNumber: item.rowNumber, type: 'G-K' });
        toast.success(`Copied G–K TSV for Row ${item.rowNumber} (${item.pic})!`);
        setTimeout(() => setCopiedRowToast(null), 3000);
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  }

  async function handleCopyFullRow(item: ScheduleActivity) {
    const tsv = clipboardRowForScheduleFull(item);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedRowToast({ rowNumber: item.rowNumber, type: 'Full' });
        toast.success(`Copied Full Row ${item.rowNumber} TSV!`);
        setTimeout(() => setCopiedRowToast(null), 3000);
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  }

  async function handleSyncRowDirectly(item: ScheduleActivity) {
    setIsSyncingRow(true);
    try {
      const response = await fetch('/api/sheets/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowNumber: item.rowNumber,
          durationMinutes: item.durationMinutes,
          startTime: item.startTime,
          endTime: item.endTime,
          progress: item.progress || 'Done',
          notes: item.notes,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'API sync failed');
      }

      toast.success(`Successfully synced Row ${item.rowNumber} to Google Sheets!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync to Google Sheets';
      toast.error(`Sync error: ${msg}. You can use "Copy G–K TSV" as a fallback.`);
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

    if (typeof window !== 'undefined') {
      const existing = readScheduleCustomizations(localStorage.getItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
      const nextCustoms = { ...existing, [updated.id]: updated };
      localStorage.setItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY, writeScheduleCustomizations(nextCustoms));
    }
    toast.success(`Updated Row ${updated.rowNumber}!`);
    setEditingScheduleItem(null);
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
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(appendDiary(existing, entry)));

    await fetch('/api/diary', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(diarySyncPayload(entry)),
    }).catch(() => null);

    toast.success('Diary reflection saved & queued for sync!');
    setShowLearningCapture(false);
    setSelectedActivityForLearning(null);
  }

  // Calculate statistics
  const now = new Date();
  const overallTotalCount = scheduleCatalog.length;
  const overallCompletedCount = scheduleCatalog.filter((a) => a.progress === 'Done').length;
  const overallProgressPercent = overallTotalCount > 0 ? Math.round((overallCompletedCount / overallTotalCount) * 100) : 0;

  const weekCounts: Record<string, number> = {
    'All': scheduleCatalog.length,
    'Today': scheduleCatalog.filter((a) => isSameDate(a.date, now)).length,
    'Week 1': scheduleCatalog.filter((a) => a.week === 'Week 1').length,
    'Week 2': scheduleCatalog.filter((a) => a.week === 'Week 2').length,
    'Week 3': scheduleCatalog.filter((a) => a.week === 'Week 3').length,
    'Week 4': scheduleCatalog.filter((a) => a.week === 'Week 4').length,
    'Month 2 & 3': scheduleCatalog.filter((a) => a.week === 'Month 2' || a.week === 'Month 3').length,
  };

  const currentWeekActivities = scheduleCatalog.filter((a) => {
    if (selectedWeek === 'Today') return isSameDate(a.date, now);
    if (selectedWeek === 'All') return true;
    if (selectedWeek === 'Month 2 & 3') return a.week === 'Month 2' || a.week === 'Month 3';
    return a.week === selectedWeek;
  });

  const standardDaysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayCounts: Record<string, number> = {};
  currentWeekActivities.forEach((a) => {
    if (a.day && a.day !== 'TBD') {
      dayCounts[a.day] = (dayCounts[a.day] || 0) + 1;
    }
  });
  const availableDays = standardDaysOrder.filter((d) => (dayCounts[d] || 0) > 0);

  const filteredScheduleActivities = currentWeekActivities.filter((item) => {
    if (selectedDay !== 'All' && item.day !== selectedDay) return false;

    if (statusFilter !== 'All') {
      if (statusFilter === 'Done' && item.progress !== 'Done') return false;
      if (statusFilter === 'In Progress' && item.progress !== 'In Progress') return false;
      if (statusFilter === 'On-Hold' && item.progress !== 'On-Hold') return false;
      if (statusFilter === 'Reschedule' && item.progress !== 'Reschedule') return false;
      if (statusFilter === 'Not Started' && item.progress !== 'Not Started' && item.progress !== '' && item.progress !== undefined) return false;
    }

    if (scheduleSearch.trim()) {
      const q = scheduleSearch.toLowerCase().trim();
      const matchTopic = item.topic.toLowerCase().includes(q);
      const matchPic = item.pic.toLowerCase().includes(q);
      const matchMedia = item.mainMedia.toLowerCase().includes(q);
      const matchRow = `row ${item.rowNumber}`.includes(q) || String(item.rowNumber) === q;
      if (!matchTopic && !matchPic && !matchMedia && !matchRow) return false;
    }

    return true;
  });

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

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="animate-fade-up pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <span>90-Day Master Roadmap</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                <span>{overallCompletedCount} of {overallTotalCount} done</span>
                <span className="text-stone-400">({overallProgressPercent}%)</span>
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Onboarding Schedule
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Browse, filter, and sync all 59 activities across Weeks 1–4 and Months 2 & 3.
            </p>
          </div>

          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95"
          >
            <span>← Back to Today</span>
          </a>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 h-2 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="bar-gradient progress-shimmer h-full rounded-full transition-all"
            style={{ width: `${overallProgressPercent}%` }}
          />
        </div>
      </header>

      {/* Quick tip & sync guide banner */}
      {!scheduleTipDismissed && (
        <div className="mb-6 rounded-2xl bg-sky-50/70 border border-sky-100/80 p-3.5 text-xs text-sky-900 shadow-2xs transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <IconLightbulb className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sky-950">
                  Click any activity to open the detail sheet, log time, or sync with Google Sheets.
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSyncHelpExpanded((prev) => !prev)}
                    className="text-[11px] font-medium text-sky-700 hover:text-sky-950 underline underline-offset-2 transition"
                  >
                    {syncHelpExpanded ? 'Hide sync guide ▴' : 'How spreadsheet sync works ▾'}
                  </button>
                </div>
                {syncHelpExpanded && (
                  <div className="mt-2.5 space-y-1.5 rounded-xl bg-white/80 p-3 text-[11px] text-sky-900 border border-sky-100">
                    <p>
                      <strong>1-Click Direct Sync:</strong> Open an activity to sync Duration, Start Time, End Time, Progress, and Notes straight to your Google Sheet.
                    </p>
                    <p>
                      <strong>Clipboard Fallback:</strong> Click <code className="bg-sky-100 px-1 py-0.5 rounded font-mono font-semibold">Copy G–K</code> to copy tab-separated values, then paste into cell <code className="bg-sky-100 px-1 py-0.5 rounded font-mono font-bold">G&#123;row&#125;</code> in Google Sheets.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissScheduleTip}
              className="text-stone-400 hover:text-stone-700 p-1 transition rounded-md hover:bg-sky-100/60"
              aria-label="Dismiss tip"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Week Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
        {(['All', 'Today', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Month 2 & 3'] as const).map((w) => {
          const active = selectedWeek === w;
          const count = weekCounts[w] || 0;
          return (
            <button
              key={w}
              type="button"
              onClick={() => {
                setSelectedWeek(w);
                setSelectedDay('All');
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {w === 'Today' && <IconZap className="h-3 w-3 text-amber-400" />}
              <span>{w}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${active ? 'bg-stone-800 text-stone-200' : 'bg-stone-200 text-stone-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Why no Monday in Week 1 note */}
      {selectedWeek === 'Week 1' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50/90 border border-amber-200/70 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              <strong>Note:</strong> Day 1 of onboarding started on <strong>Tuesday, September 1st, 2026</strong>. Monday activities appear in Week 2 (07/09), Week 3, and Week 4!
            </span>
          </div>
        </div>
      )}

      {/* Filter Toolbar: Day pills, Status dropdown, and Search */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Day filter pills */}
        {selectedWeek !== 'Today' && availableDays.length > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDay('All')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                selectedDay === 'All'
                  ? 'bg-mint-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Days ({currentWeekActivities.length})
            </button>
            {availableDays.map((d) => {
              const count = dayCounts[d] || 0;
              const active = selectedDay === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    active
                      ? 'bg-mint-700 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {d} ({count})
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto w-full sm:w-auto">
          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-2xs focus:border-stone-900 focus:outline-none"
          >
            <option value="All">All Progress ({currentWeekActivities.length})</option>
            <option value="Done">Done</option>
            <option value="In Progress">In Progress</option>
            <option value="On-Hold">On-Hold</option>
            <option value="Reschedule">Reschedule</option>
            <option value="Not Started">Not Started</option>
          </select>

          {/* Search box */}
          <div className="relative min-w-44 max-w-xs grow">
            <input
              type="text"
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              placeholder="Search topic, PIC, row..."
              className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-mint-500 focus:bg-white focus:outline-hidden"
            />
            {scheduleSearch && (
              <button
                type="button"
                onClick={() => setScheduleSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
              >
                <IconX className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Activities List */}
      <div className="space-y-3">
        {filteredScheduleActivities.length === 0 ? (
          <div className="rounded-2xl border border-stone-100 bg-white p-8 text-center shadow-soft">
            <p className="text-sm font-medium text-stone-600">No activities match your filter.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedWeek('All');
                setSelectedDay('All');
                setStatusFilter('All');
                setScheduleSearch('');
              }}
              className="mt-3 rounded-full bg-stone-100 px-4 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-200 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredScheduleActivities.map((item) => (
            <ScheduleCard
              key={item.id}
              item={item}
              isCurrentTimer={false}
              isTimerRunning={false}
              isTimerPaused={false}
              elapsedSeconds={0}
              startedAt={null}
              onViewDetails={(act) => setDetailActivity(act)}
              onStartTimer={() => {
                window.location.href = '/';
              }}
              onFillRow={(act) => setEditingScheduleItem(act)}
              onSyncRow={(act) => void handleSyncRowDirectly(act)}
              onCopyGtoK={(act) => void handleCopyGtoK(act)}
              onCopyFullRow={(act) => void handleCopyFullRow(act)}
              onWriteReflection={(act) => {
                setSelectedActivityForLearning(act);
                setShowLearningCapture(true);
              }}
              copiedToast={copiedRowToast}
            />
          ))
        )}
      </div>

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
        onWriteReflection={(act) => {
          setSelectedActivityForLearning(act);
          setShowLearningCapture(true);
        }}
      />

      {/* Fill Schedule Modal */}
      {editingScheduleItem && (
        <ScheduleFillModal
          activity={editingScheduleItem}
          onClose={() => setEditingScheduleItem(null)}
          onSave={handleSaveScheduleCustomization}
        />
      )}

      {/* Learning Diary Reflection Modal */}
      <LearningModal
        open={showLearningCapture}
        activity={learningActivityContext}
        onSave={(submission) => void handleLearningSave(submission)}
        onSkip={() => {
          setShowLearningCapture(false);
          setSelectedActivityForLearning(null);
        }}
      />
    </main>
  );
}
