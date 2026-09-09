'use client';

import { useEffect, useState } from 'react';
import { isActivityList } from '@/lib/sheets/types';
import type { Activity } from '@/lib/types/activity';
import { QuickNote } from '@/app/components/QuickNote';
import { LearningModal } from '@/app/components/LearningModal';
import type { LearningActivityContext, LearningSubmission } from '@/app/components/LearningModal';
import { ScheduleFillModal } from '@/app/components/ScheduleFillModal';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { ActivityDetailSheet } from '@/app/components/ActivityDetailSheet';
import { CommandPalette } from '@/app/components/CommandPalette';
import { StopwatchCard } from '@/app/components/StopwatchCard';
import { FloatingTimer } from '@/app/components/FloatingTimer';
import {
  IconEdit,
  IconSearch,
  IconClipboard,
  IconCheck,
  IconLightbulb,
  IconCalendar,
  IconX,
  IconTrophy,
  IconSprout,
  IconTree,
  IconClock,
  IconZap,
  IconExternalLink,
  IconRocket,
  IconPause,
} from '@/app/components/Icons';
import {
  calculateElapsedSeconds,
  calculateStopwatchDurationMinutes,
  formatTimeHHMM,
} from '@/lib/session/stopwatch';
import {
  OFFICIAL_SCHEDULE_ACTIVITIES,
  SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY,
  readScheduleCustomizations,
  writeScheduleCustomizations,
  clipboardRowForScheduleGtoK,
  clipboardRowForScheduleFull,
  scheduleActivityToActivity,
  getMergedScheduleActivities,
  calculateDurationFromTimes,
  isSameDate,
  getTodayScheduleActivities,
  type ScheduleActivity,
} from '@/lib/schedule-catalog';
import { IMPORTED_SCHEDULE_STORAGE_KEY, clipboardRowForSchedule, readImportedSchedule } from '@/lib/imported-schedule';
import { ACTIVE_SESSION_STORAGE_KEY, DIARY_STORAGE_KEY, QUICK_NOTES_STORAGE_KEY, SESSION_HISTORY_STORAGE_KEY, appendDiary, appendQuickNote, appendSession, completedActivityIds, readDiary, readQuickNotes, readSessions, type StoredSession } from '@/lib/local-records';
import { diarySyncPayload, learningDiaryEntry } from '@/lib/learning-capture';
import { selectCurrentActivity } from '@/lib/session/activity-selection';
import { enqueueSync, pendingSyncStorageKey, readPendingSyncs, writePendingSyncs } from '@/lib/sync-queue';
import { formatStartedAt, getProgressLabel, mergeCompletedCount } from '@/lib/session/presentation';

const fallback: Activity[] = OFFICIAL_SCHEDULE_ACTIVITIES.map(scheduleActivityToActivity);

const activityDot = (type: string) =>
  type === 'learning' ? 'bg-lavender-300' : type === 'setup' ? 'bg-sky-300' : 'bg-peach-300';

const getProgressBadge = (progress: string) => {
  const p = progress?.toLowerCase();
  if (p === 'done') return 'bg-mint-50 text-mint-700 border-mint-200';
  if (p === 'in progress') return 'bg-peach-50 text-peach-700 border-peach-200';
  if (p === 'reschedule') return 'bg-sun-50 text-sun-700 border-sun-200';
  return 'bg-stone-50 text-stone-600 border-stone-200';
};

const getPicBadge = (pic: string) => {
  const p = pic?.toLowerCase();
  if (p.includes('it manager')) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (p.includes('hrd')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (p.includes('ceo')) return 'bg-peach-50 text-peach-700 border-peach-200';
  if (p.includes('experience')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (p.includes('md')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-stone-50 text-stone-700 border-stone-200';
};

const seedlingStage = (percent: number) =>
  percent <= 0
    ? { label: 'Just planted', stage: 'sprout' as const }
    : percent < 50
    ? { label: 'Growing', stage: 'sprout' as const }
    : percent < 100
    ? { label: 'Almost there', stage: 'tree' as const }
    : { label: 'Day complete', stage: 'trophy' as const };

const formatClock = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function TodayPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>(fallback);
  const [scheduleCatalog, setScheduleCatalog] = useState<ScheduleActivity[]>(() => [...OFFICIAL_SCHEDULE_ACTIVITIES]);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleActivity | null>(null);
  const [detailActivity, setDetailActivity] = useState<ScheduleActivity | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [copiedRowToast, setCopiedRowToast] = useState<{ rowNumber: number; type: 'G-K' | 'Full' } | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState<number>(0);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [finishedActivityName, setFinishedActivityName] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<StoredSession[]>([]);
  const [sync, setSync] = useState('');
  const [now, setNow] = useState(Date.now());
  const [progress, setProgress] = useState<{ completed: number; total: number; remaining: number } | null>(null);
  const [scheduleState, setScheduleState] = useState<'demo' | 'connected' | 'error' | 'imported'>('demo');
  const [deviation, setDeviation] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [showLearningCapture, setShowLearningCapture] = useState(false);
  const [selectedActivityForLearning, setSelectedActivityForLearning] = useState<Activity | null>(null);
  const [copiedScheduleId, setCopiedScheduleId] = useState<string | null>(null);
  const [isSyncingDirectSheets, setIsSyncingDirectSheets] = useState(false);

  useEffect(() => {
    function handleOpenPalette() {
      setCommandPaletteOpen(true);
    }
    window.addEventListener('open-command-palette', handleOpenPalette);
    return () => window.removeEventListener('open-command-palette', handleOpenPalette);
  }, []);

  useEffect(() => {
    const custom = readScheduleCustomizations(localStorage.getItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
    if (Object.keys(custom).length > 0) {
      const merged = getMergedScheduleActivities(custom);
      setScheduleCatalog(merged);
      const imported = readImportedSchedule(localStorage.getItem(IMPORTED_SCHEDULE_STORAGE_KEY));
      if (!imported) {
        setActivities(merged.map(scheduleActivityToActivity));
      }
    }
    const imported = readImportedSchedule(localStorage.getItem(IMPORTED_SCHEDULE_STORAGE_KEY));
    if (imported) {
      setActivities(imported.activities);
      setScheduleState('imported');
      return;
    }
    fetch('/api/schedule', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) { setScheduleState('error'); throw new Error('schedule'); }
        const mode = response.headers.get('x-schedule-mode');
        if (mode === 'demo') setScheduleState('demo');
        else setScheduleState('connected');
        return response.json() as Promise<unknown>;
      })
      .then((value: unknown) => {
        if (isActivityList(value)) setActivities(value);
        else throw new Error('schedule');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setHistorySessions(readSessions(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY)));
    const value = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (value) {
      try {
        const data = JSON.parse(value) as {
          activityId?: string;
          name?: string;
          startedAt?: number;
          finishedAt?: number;
          pausedAt?: number;
          accumulatedMs?: number;
        };
        if (data.startedAt) setStartedAt(data.startedAt);
        if (data.finishedAt) setFinishedAt(data.finishedAt);
        if (data.pausedAt) setPausedAt(data.pausedAt);
        if (typeof data.accumulatedMs === 'number') setAccumulatedMs(data.accumulatedMs);
        if (data.activityId) setActiveActivityId(data.activityId);
        const finishedName = data.name ?? readSessions(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY)).find((session) => session.activityId === data.activityId)?.name;
        if (finishedName) setFinishedActivityName(finishedName);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (startedAt) {
      localStorage.setItem(
        ACTIVE_SESSION_STORAGE_KEY,
        JSON.stringify({
          activityId: activeActivityId,
          name: finishedActivityName,
          startedAt,
          finishedAt,
          pausedAt,
          accumulatedMs,
        })
      );
    }
  }, [startedAt, finishedAt, pausedAt, accumulatedMs, activeActivityId, finishedActivityName]);

  useEffect(() => {
    fetch('/api/progress')
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (typeof data?.completed === 'number' && typeof data?.total === 'number' && typeof data?.remaining === 'number')
          setProgress({ completed: data.completed, total: data.total, remaining: data.remaining });
      })
      .catch(() => undefined);
  }, [finishedAt]);

  const completedIds = completedActivityIds(historySessions);

  const isScheduleItemDone = (item: ScheduleActivity) =>
    item.progress === 'Done' ||
    completedIds.has(item.id) ||
    activities.find((a) => a.id === item.id)?.status === 'done';

  const todayActivities = getTodayScheduleActivities(scheduleCatalog, new Date(now));
  const todayCompletedCount = todayActivities.filter(isScheduleItemDone).length;
  const todayTotalCount = todayActivities.length;

  const currentActivity: Activity | null = (() => {
    if (activeActivityId) {
      const match =
        activities.find((item) => item.id === activeActivityId) ??
        (() => {
          const s = scheduleCatalog.find((cat) => cat.id === activeActivityId) ?? OFFICIAL_SCHEDULE_ACTIVITIES.find((cat) => cat.id === activeActivityId);
          return s ? scheduleActivityToActivity(s) : null;
        })();
      if (match) return match;
    }
    // Prefer today's first incomplete activity if available
    const todayIncomplete = todayActivities.find((item) => !isScheduleItemDone(item));
    if (todayIncomplete) {
      const match = activities.find((a) => a.id === todayIncomplete.id) || scheduleActivityToActivity(todayIncomplete);
      return match;
    }
    const auto = selectCurrentActivity(activities, completedIds);
    if (auto) return auto;
    const fallbackSched = scheduleCatalog.find((s) => s.progress !== 'Done') || scheduleCatalog[0];
    return fallbackSched ? scheduleActivityToActivity(fallbackSched) : null;
  })();

  const isActivityDone = (activity: Activity) => completedIds.has(activity.id) || activity.status === 'done';
  const doneActivitiesCount = activities.filter(isActivityDone).length;
  const overallCompletedCount = Math.max(doneActivitiesCount, mergeCompletedCount(progress?.completed ?? null, completedIds.size));
  const overallTotalCount = progress?.total ?? activities.length;
  const overallProgressPercent = overallTotalCount > 0 ? Math.round((overallCompletedCount / overallTotalCount) * 100) : 0;

  const todayInProgressCount =
    startedAt && !finishedAt && currentActivity && todayActivities.some((a) => a.id === currentActivity.id) ? 1 : 0;
  const todayRemainingCount = Math.max(0, todayTotalCount - todayCompletedCount - todayInProgressCount);
  const todayProgressPercent = todayTotalCount > 0 ? Math.round((todayCompletedCount / todayTotalCount) * 100) : 0;
  const todayProgressLabel =
    todayTotalCount > 0
      ? getProgressLabel({ completed: todayCompletedCount, inProgress: todayInProgressCount, total: todayTotalCount })
      : 'No scheduled activities for today';

  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
  const hour = new Date(now).getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening';

  // Calculate day of 90 (placeholder: start from September 1, 2026)
  const startDate = new Date(2026, 8, 1);
  const nowDate = new Date(now);
  const dayNumber = Math.floor((nowDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = 90;
  const dayProgress = Math.min(100, Math.round((dayNumber / totalDays) * 100));

  const duration = startedAt && finishedAt ? Math.floor((finishedAt - startedAt) / 60000) : 0;

  const targetLearningActivity = selectedActivityForLearning ?? (activeActivityId ? activities.find(a => a.id === activeActivityId) ?? null : currentActivity);
  const targetActivityIndex = targetLearningActivity ? activities.findIndex(a => a.id === targetLearningActivity.id) : -1;
  const activityOrderNumber = targetActivityIndex >= 0 ? targetActivityIndex + 1 : (overallCompletedCount || 1);

  const learningActivityContext: LearningActivityContext | null = targetLearningActivity || finishedAt ? {
    id: targetLearningActivity?.id ?? activeActivityId ?? undefined,
    topic: targetLearningActivity?.name ?? finishedActivityName ?? 'Activity Reflection',
    pic: (targetLearningActivity as { pic?: string })?.pic ?? (targetLearningActivity?.type === 'welcome' ? 'Experience Manager' : 'IT Manager'),
    day: `Day ${dayNumber}`,
    date: (targetLearningActivity as { date?: string })?.date ?? new Date(now).toLocaleDateString('en-CA'),
    week: `Week ${Math.max(1, Math.ceil(dayNumber / 7))}`,
    activityCount: activityOrderNumber,
  } : null;

  async function finish() {
    if (!startedAt || !currentActivity) return;
    const end = Date.now();
    const startStr = formatTimeHHMM(startedAt);
    const endStr = formatTimeHHMM(end);
    const timeWindowMins = calculateDurationFromTimes(startStr, endStr);

    const totalElapsedSecs = calculateElapsedSeconds(startedAt, end, pausedAt, accumulatedMs);
    let finalElapsedMins = calculateStopwatchDurationMinutes(totalElapsedSecs);

    if (finalElapsedMins <= 1 && timeWindowMins && timeWindowMins > 1) {
      finalElapsedMins = timeWindowMins;
    }

    setFinishedAt(end);
    setPausedAt(null);
    setSelectedActivityForLearning(currentActivity);
    setShowLearningCapture(true);
    setProgress((current) =>
      current
        ? {
            ...current,
            completed: Math.min(current.total, current.completed + 1),
            remaining: Math.max(0, current.remaining - 1),
          }
        : { completed: 1, total: activities.length, remaining: Math.max(0, activities.length - 1) }
    );
    const record: StoredSession = {
      activityId: currentActivity.id,
      name: currentActivity.name,
      startedAt,
      finishedAt: end,
    };
    setFinishedActivityName(currentActivity.name);
    setHistorySessions((current) => appendSession(current, record));
    localStorage.setItem(
      SESSION_HISTORY_STORAGE_KEY,
      JSON.stringify(appendSession(readSessions(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY)), record))
    );
    localStorage.setItem(
      ACTIVE_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...record,
        durationMinutes: finalElapsedMins,
        accumulatedMs,
      })
    );

    // Auto-update schedule catalog item to Done with duration and timestamps
    const updatedDoneFields = {
      progress: 'Done' as const,
      durationMinutes: finalElapsedMins || undefined,
      startTime: startStr,
      endTime: endStr,
    };

    setScheduleCatalog((prev) =>
      prev.map((s) =>
        s.id === currentActivity.id
          ? {
              ...s,
              ...updatedDoneFields,
              durationMinutes: finalElapsedMins || s.durationMinutes,
            }
          : s
      )
    );

    // Persist to SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY so customizations survive reload
    const existingCustom = readScheduleCustomizations(localStorage.getItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
    const nextCustom = {
      ...existingCustom,
      [currentActivity.id]: {
        ...existingCustom[currentActivity.id],
        progress: 'Done',
        durationMinutes: finalElapsedMins,
        startTime: startStr,
        endTime: endStr,
      },
    };
    localStorage.setItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY, writeScheduleCustomizations(nextCustom));

    // Also update activities state
    setActivities((prev) =>
      prev.map((a) =>
        a.id === currentActivity.id
          ? {
              ...a,
              status: 'done',
              actualStart: startStr,
              actualEnd: endStr,
              durationMinutes: finalElapsedMins,
            }
          : a
      )
    );

    const titleSnippet = currentActivity.name.split('\n')[0].slice(0, 30);
    toast.success(`Stopwatch finished: ${finalElapsedMins}m logged for ${titleSnippet}!`);

    // Direct Google Sheets API update for this row
    const matchedSched = scheduleCatalog.find((s) => s.id === currentActivity.id);
    if (matchedSched) {
      void fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'Schedule',
          rowNumber: matchedSched.rowNumber,
          durationMinutes: finalElapsedMins,
          startTime: startStr,
          endTime: endStr,
          progress: 'Done',
          notes: matchedSched.notes || '',
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              toast.success(`Row ${matchedSched.rowNumber} synchronized to Google Sheets!`);
              setSync(`Row ${matchedSched.rowNumber} synchronized to Google Sheets`);
            } else {
              setSync(`Row ${matchedSched.rowNumber} saved locally · Google sign-in required to sync`);
            }
          } else {
            setSync(`Row ${matchedSched.rowNumber} saved locally · Google sign-in required to sync`);
          }
        })
        .catch(() => {
          setSync(`Row ${matchedSched.rowNumber} saved locally`);
        });
    }

    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        activityId: currentActivity.id,
        start: new Date(startedAt).toISOString(),
        end: new Date(end).toISOString(),
      }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as {
      pendingSync?: { activityId: string; actualStart: string; actualEnd: string; durationMinutes: number };
    } | null;
    if (payload?.pendingSync)
      writePendingSyncs(localStorage, enqueueSync(readPendingSyncs(localStorage.getItem(pendingSyncStorageKey())), payload.pendingSync));
  }

  async function handleLearningSave(submission: LearningSubmission) {
    const activityCtx = {
      activityId: selectedActivityForLearning?.id ?? activeActivityId,
      activityName: selectedActivityForLearning?.name ?? finishedActivityName,
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
    const response = await fetch('/api/diary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(diarySyncPayload(entry)) }).catch(() => null);
    setSync(response?.ok ? 'Learning saved · pending sync' : 'Not synced');
    setShowLearningCapture(false);
    setSelectedActivityForLearning(null);
  }

  function handleLearningSkip() {
    setSync('Learning capture skipped · you can add it later from Learnings');
    setShowLearningCapture(false);
    setSelectedActivityForLearning(null);
  }

  async function handleCopyScheduleRow(activity: Activity) {
    const session = historySessions.find((s) => s.activityId === activity.id);
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

  function handleSaveScheduleItem(updated: ScheduleActivity) {
    setScheduleCatalog((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

    const existing = readScheduleCustomizations(localStorage.getItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
    const nextCustom = {
      ...existing,
      [updated.id]: {
        durationMinutes: updated.durationMinutes,
        startTime: updated.startTime,
        endTime: updated.endTime,
        progress: updated.progress,
        notes: updated.notes,
      },
    };
    localStorage.setItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY, writeScheduleCustomizations(nextCustom));

    setActivities((prev) =>
      prev.map((act) => (act.id === updated.id ? scheduleActivityToActivity(updated) : act))
    );

    const titleSnippet = updated.topic.split('\n')[0].slice(0, 30);
    setSync(`Row ${updated.rowNumber} (${titleSnippet}...) saved & synchronized!`);
    toast.success(`Row ${updated.rowNumber} (${titleSnippet}...) saved!`);
    setEditingScheduleItem(null);
  }

  async function handleCopyGtoK(item: ScheduleActivity) {
    const tsv = clipboardRowForScheduleGtoK(item);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedRowToast({ rowNumber: item.rowNumber, type: 'G-K' });
        toast.success(`Copied Row ${item.rowNumber} Cols G–K TSV! Click cell G in Sheet to paste.`);
        setTimeout(() => setCopiedRowToast(null), 2500);
      }
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  }

  async function handleCopyFullRow(item: ScheduleActivity) {
    const tsv = clipboardRowForScheduleFull(item);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedRowToast({ rowNumber: item.rowNumber, type: 'Full' });
        toast.success(`Copied Row ${item.rowNumber} Cols A–K TSV!`);
        setTimeout(() => setCopiedRowToast(null), 2500);
      }
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  }

  function handleStartTimerForScheduleRow(item: ScheduleActivity) {
    const act = activities.find((a) => a.id === item.id) || scheduleActivityToActivity(item);
    if (!activities.some((a) => a.id === act.id)) {
      setActivities((prev) => [...prev, act]);
    }
    setActiveActivityId(act.id);
    const timestamp = Date.now();
    const startStr = formatTimeHHMM(timestamp);
    setStartedAt(timestamp);
    setPausedAt(null);
    setAccumulatedMs(0);
    setFinishedAt(null);

    // Update schedule catalog item to In Progress with start time
    const updatedItem: ScheduleActivity = {
      ...item,
      progress: 'In Progress',
      startTime: item.startTime || startStr,
    };

    setScheduleCatalog((prev) =>
      prev.map((s) => (s.id === item.id ? updatedItem : s))
    );

    // Persist to SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY
    const existing = readScheduleCustomizations(localStorage.getItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY));
    const nextCustom = {
      ...existing,
      [item.id]: {
        ...existing[item.id],
        progress: 'In Progress',
        startTime: existing[item.id]?.startTime || startStr,
      },
    };
    localStorage.setItem(SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY, writeScheduleCustomizations(nextCustom));

    // Update activities array
    setActivities((prev) =>
      prev.map((a) => (a.id === act.id ? { ...a, status: 'in-progress', actualStart: startStr } : a))
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Stopwatch started: ${item.topic.split('\n')[0].slice(0, 32)}...`);

    // Optional background sync to Google Sheets to mark In Progress
    void fetch('/api/sheets/update-cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheet: 'Schedule',
        rowNumber: item.rowNumber,
        startTime: updatedItem.startTime,
        progress: 'In Progress',
        durationMinutes: item.durationMinutes,
        notes: item.notes || '',
      }),
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSync(`Row ${item.rowNumber} started · Synced to Google Sheets`);
        }
      }
    }).catch(() => undefined);

    void fetch('/api/session/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activityId: act.id, startedAt: new Date(timestamp).toISOString(), plannedStart: act.plannedStart })
    }).catch(() => setSync('Stopwatch started locally'));
  }

  async function handleDirectSyncScheduleRow(item: ScheduleActivity) {
    try {
      const progressVal = (item.progress && item.progress !== 'Not Started')
        ? item.progress
        : (activeActivityId === item.id ? 'In Progress' : '');

      const startStr = item.startTime || '';
      const endStr = item.endTime || '';
      const timeWindowMins = (startStr && endStr) ? calculateDurationFromTimes(startStr, endStr) : undefined;
      let durationMins = item.durationMinutes;
      if ((!durationMins || durationMins <= 1) && timeWindowMins && timeWindowMins > 1) {
        durationMins = timeWindowMins;
      }

      const res = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'Schedule',
          rowNumber: item.rowNumber,
          durationMinutes: durationMins,
          startTime: startStr,
          endTime: endStr,
          progress: progressVal,
          notes: item.notes || '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Row ${item.rowNumber} synchronized to Google Sheets!`);
        setSync(`Row ${item.rowNumber} synchronized to Google Sheets`);
      } else {
        toast.error(data.message || data.error || 'Google Sheets sync requires active Google sign-in. Use TSV copy as fallback.');
      }
    } catch {
      toast.error('Network error connecting to Google Sheets. Use TSV copy as fallback.');
    }
  }

  async function handleDirectSyncForFinishedActivity() {
    const target = currentActivity ?? (activeActivityId ? activities.find((a) => a.id === activeActivityId) ?? null : null);
    if (!target) return;
    const schedItem = scheduleCatalog.find((s) => s.id === target.id);
    if (!schedItem) return;

    setIsSyncingDirectSheets(true);
    try {
      const progressVal = (schedItem.progress && schedItem.progress !== 'Not Started')
        ? schedItem.progress
        : 'Done';

      const startStr = schedItem.startTime || (startedAt ? formatTimeHHMM(startedAt) : '');
      const endStr = schedItem.endTime || (finishedAt ? formatTimeHHMM(finishedAt) : '');
      const timeWindowMins = (startStr && endStr) ? calculateDurationFromTimes(startStr, endStr) : undefined;
      let durationMins = schedItem.durationMinutes;
      if ((!durationMins || durationMins <= 1) && timeWindowMins && timeWindowMins > 1) {
        durationMins = timeWindowMins;
      }

      const res = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'Schedule',
          rowNumber: schedItem.rowNumber,
          durationMinutes: durationMins,
          startTime: startStr,
          endTime: endStr,
          progress: progressVal,
          notes: schedItem.notes || '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Row ${schedItem.rowNumber} synchronized to Google Sheets!`);
        setSync(`Row ${schedItem.rowNumber} synchronized to Google Sheets`);
      } else {
        toast.error(data.message || data.error || 'Google Sheets sync requires active Google sign-in. Use TSV copy as fallback.');
      }
    } catch {
      toast.error('Network error connecting to Google Sheets. Use TSV copy as fallback.');
    } finally {
      setIsSyncingDirectSheets(false);
    }
  }

  function resetSession() {
    setStartedAt(null);
    setFinishedAt(null);
    setPausedAt(null);
    setAccumulatedMs(0);
    setActiveActivityId(null);
    setFinishedActivityName(null);
    setSelectedActivityForLearning(null);
    setSync('');
    setShowLearningCapture(false);
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }

  const statusBar =
    scheduleState === 'imported'
      ? { dotColor: 'bg-sky-500', label: `Imported schedule · ${activities.length} activities`, className: 'bg-sky-50 text-sky-900' }
      : scheduleState === 'demo'
      ? { dotColor: 'bg-sun-500', label: 'Demo data', className: 'bg-sun-50 text-sun-700' }
      : scheduleState === 'error'
      ? { dotColor: 'bg-peach-500', label: 'Offline · Using saved schedule', className: 'bg-peach-50 text-peach-700' }
      : { dotColor: 'bg-mint-500', label: sync || 'Synced just now', className: 'bg-mint-50 text-mint-700' };

  const seedling = seedlingStage(todayTotalCount > 0 ? todayProgressPercent : overallProgressPercent);
  const diaryCount = typeof window === 'undefined' ? 0 : readDiary(localStorage.getItem(DIARY_STORAGE_KEY)).length;
  const allDone = todayTotalCount > 0 && todayCompletedCount === todayTotalCount && !startedAt;
  const sessionToday = historySessions.length > 0 ? historySessions[historySessions.length - 1] : null;
  const durationHours = Math.floor(duration / 60);
  const durationMinutes = duration % 60;

  const headline = allDone
    ? 'That’s everything for today.'
    : todayTotalCount === 0
    ? 'No activities scheduled for today.'
    : todayCompletedCount === 0
    ? 'Your day is still unwritten.'
    : todayProgressPercent >= 50
    ? 'Almost there!'
    : 'You’ve had a pretty productive day.';

  const upcomingFallbackActivities = scheduleCatalog
    .filter((a) => !isScheduleItemDone(a))
    .slice(0, 4);

  const displayAgendaActivities = todayActivities.length > 0 ? todayActivities : upcomingFallbackActivities;
  const isUsingFallbackAgenda = todayActivities.length === 0 && upcomingFallbackActivities.length > 0;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="status" data-tour="status-bar" className={`inline-flex animate-fade-up items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${statusBar.className}`}>
          <span aria-hidden="true" className={`size-2 rounded-full ${statusBar.dotColor}`} />
          {statusBar.label}
        </div>
        {(scheduleState === 'demo' || scheduleState === 'error') && (
          <a href="/settings" className="animate-fade-up text-xs font-medium text-mint-700 underline underline-offset-4 transition hover:text-mint-600">
            Import your own schedule →
          </a>
        )}
      </div>

      {/* Header */}
      <header data-tour="progress-header" className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-500">
          <span>{todayLabel} · Day {Math.min(dayNumber, totalDays)} of {totalDays}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
            <span>Overall: {overallCompletedCount} of {overallTotalCount} done</span>
            <span className="text-stone-400">({overallProgressPercent}%)</span>
          </span>
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">{greeting}, Noah</h1>
        <p className="mt-3 text-lg text-stone-500">{headline}</p>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <p className="text-6xl font-semibold tracking-tight text-stone-900">
              {todayCompletedCount}<span className="ml-3 align-baseline text-xl font-medium text-stone-500">of {todayTotalCount} today</span>
            </p>
            <div className="h-2.5 w-full min-w-56 overflow-hidden rounded-full bg-stone-200" aria-label={`${todayProgressPercent}% of today’s activities complete`}>
              <div className="bar-gradient progress-shimmer h-full rounded-full transition-all" style={{ width: `${todayProgressPercent}%` }} />
            </div>
          </div>
          <p className="flex items-center text-lg text-stone-600">
            {seedling.stage === 'trophy' ? (
              <IconTrophy className="mr-2 h-5 w-5 text-sun-500 shrink-0" />
            ) : seedling.stage === 'tree' ? (
              <IconTree className="mr-2 h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <IconSprout className="mr-2 h-5 w-5 text-mint-600 shrink-0" />
            )}
            <span>{seedling.label}</span>
          </p>
        </div>
        <p className="mt-3 text-sm text-stone-500">{todayProgressLabel}</p>
      </header>

      {allDone ? (
        /* Day wrapped up */
        <section data-tour="current-activity" className="animate-pop-in mt-10 rounded-card bg-sun-50 p-8 text-center shadow-soft">
          <div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sun-100 text-sun-700 animate-celebrate">
            <IconTrophy className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Day wrapped up</h2>
          <p className="mt-2 text-stone-600">{todayCompletedCount} {todayCompletedCount === 1 ? 'activity' : 'activities'} completed today{diaryCount > 0 ? ` · ${diaryCount} ${diaryCount === 1 ? 'thing' : 'things'} learned` : ''}</p>
          <p className="mt-1 text-stone-500">See you tomorrow.</p>
          <a href="/diary" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-stone-700">Open Onboarding Diary →</a>
        </section>
      ) : (
        <>
          <StopwatchCard
            activity={currentActivity}
            scheduleCatalog={scheduleCatalog}
            startedAt={startedAt}
            finishedAt={finishedAt}
            pausedAt={pausedAt}
            accumulatedMs={accumulatedMs}
            onStart={(act) => {
              const matched = scheduleCatalog.find((s) => s.id === act.id);
              if (matched) {
                handleStartTimerForScheduleRow(matched);
              } else {
                handleStartTimerForScheduleRow({
                  id: act.id,
                  rowNumber: 3,
                  week: 'Week 1',
                  day: 'Monday',
                  date: '',
                  activityCount: 1,
                  pic: act.pic || 'HRD',
                  topic: act.name,
                  mainMedia: 'Online Meeting',
                  durationMinutes: act.durationMinutes,
                  progress: 'In Progress',
                });
              }
            }}
            onPause={() => {
              const rightNow = Date.now();
              setPausedAt(rightNow);
              if (startedAt) {
                setAccumulatedMs((prev) => prev + (rightNow - startedAt));
              }
              toast.info('Stopwatch paused.');
            }}
            onResume={() => {
              const rightNow = Date.now();
              setStartedAt(rightNow);
              setPausedAt(null);
              toast.info('Stopwatch resumed.');
            }}
            onFinish={() => {
              void finish();
            }}
            onReset={() => {
              setResetConfirmOpen(true);
            }}
            onSelectActivity={(act) => {
              setActiveActivityId(act.id);
              if (!activities.some((a) => a.id === act.id)) {
                setActivities((prev) => [...prev, act]);
              }
              toast.info(`Switched focus to: ${act.name.split('\n')[0].slice(0, 30)}...`);
            }}
            onAdjustTime={(deltaSeconds) => {
              setAccumulatedMs((prev) => Math.max(0, prev + deltaSeconds * 1000));
              toast.info(`Adjusted stopwatch: ${deltaSeconds > 0 ? `+${deltaSeconds / 60}m` : `${deltaSeconds / 60}m`}`);
            }}
            onFillSchedule={() => {
              const target = currentActivity ?? (activeActivityId ? activities.find((a) => a.id === activeActivityId) ?? null : null);
              if (target) {
                const schedItem = scheduleCatalog.find((s) => s.id === target.id);
                if (schedItem) {
                  const startStr = startedAt ? formatTimeHHMM(startedAt) : schedItem.startTime;
                  const endStr = finishedAt ? formatTimeHHMM(finishedAt) : schedItem.endTime;
                  const timeWindowMins = (startStr && endStr) ? calculateDurationFromTimes(startStr, endStr) : undefined;
                  const totalElapsedSecs = calculateElapsedSeconds(startedAt, finishedAt || Date.now(), pausedAt, accumulatedMs);
                  let finalElapsedMins = calculateStopwatchDurationMinutes(totalElapsedSecs);
                  if (finalElapsedMins <= 1 && timeWindowMins && timeWindowMins > 1) {
                    finalElapsedMins = timeWindowMins;
                  }
                  if (!finalElapsedMins && schedItem.durationMinutes) {
                    finalElapsedMins = schedItem.durationMinutes;
                  }
                  setEditingScheduleItem({
                    ...schedItem,
                    durationMinutes: finalElapsedMins || schedItem.durationMinutes,
                    startTime: startStr,
                    endTime: endStr,
                    progress: schedItem.progress && schedItem.progress !== 'Not Started' ? schedItem.progress : 'Done',
                  });
                }
              }
            }}
            onWriteReflection={() => {
              setSelectedActivityForLearning(currentActivity ?? (activeActivityId ? activities.find((a) => a.id === activeActivityId) ?? null : null));
              setShowLearningCapture(true);
            }}
            onCopyGtoK={() => {
              const target = currentActivity ?? (activeActivityId ? activities.find((a) => a.id === activeActivityId) ?? null : null);
              if (target) {
                const schedItem = scheduleCatalog.find((s) => s.id === target.id);
                if (schedItem) {
                  void handleCopyGtoK(schedItem);
                } else {
                  void handleCopyScheduleRow(target);
                }
              }
            }}
            copiedGtoKToast={copiedRowToast?.type === 'G-K'}
            onDirectSyncToSheets={handleDirectSyncForFinishedActivity}
            isSyncingSheets={isSyncingDirectSheets}
          />

          {/* Sync status */}
          {sync && <p className="mt-4 text-center text-sm text-stone-500" role="status">{sync}</p>}
        </>
      )}

      {/* Today's Agenda (Now & Next) */}
      <section data-tour="day-timeline" className="animate-fade-up stagger-2 mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                {isUsingFallbackAgenda ? 'Up Next in Your Journey' : "Today's Agenda"}
              </h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                {displayAgendaActivities.length} {displayAgendaActivities.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {isUsingFallbackAgenda
                ? 'No activities scheduled for today’s exact calendar date. Showing upcoming onboarding milestones:'
                : 'Your scheduled activities for today · Click any item to view details or sync'}
            </p>
          </div>

          <a
            href="/schedule"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition active:scale-95"
          >
            <span>View Master Schedule (59) →</span>
          </a>
        </div>

        {displayAgendaActivities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
            <p className="text-sm font-medium">All onboarding activities have been completed! 🎉</p>
            <a
              href="/schedule"
              className="mt-2 inline-block text-xs font-semibold text-mint-700 underline underline-offset-4"
            >
              Browse all activities in Master Schedule →
            </a>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayAgendaActivities.map((item) => {
              const isDone = isScheduleItemDone(item);
              const isCurrentActive = currentActivity?.id === item.id;
              const timeDisplay =
                item.startTime && item.endTime
                  ? `${item.startTime} - ${item.endTime}`
                  : item.durationMinutes
                  ? `${item.durationMinutes}m`
                  : 'Flexible';

              return (
                <div
                  key={item.id}
                  onClick={() => setDetailActivity(item)}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 sm:px-4 sm:py-3 cursor-pointer transition-all ${
                    isCurrentActive
                      ? 'border-peach-300 bg-peach-50/60 shadow-2xs'
                      : isDone
                      ? 'border-stone-100 bg-white/70 hover:border-stone-200 hover:bg-white'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status indicator */}
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isDone
                          ? 'bg-mint-100 text-mint-700'
                          : isCurrentActive
                          ? 'bg-peach-100 text-peach-700 animate-pulse'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {isDone ? (
                        <IconCheck className="h-3.5 w-3.5" />
                      ) : isCurrentActive ? (
                        <span className="size-2 rounded-full bg-peach-600" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-stone-300" />
                      )}
                    </span>

                    {/* Row & Time window */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-bold text-stone-700">
                        Row {item.rowNumber}
                      </span>
                      <span className="text-xs font-medium text-stone-500">
                        {timeDisplay}
                      </span>
                    </div>

                    {/* Topic Title */}
                    <h3 className="text-sm font-medium text-stone-900 truncate">
                      {item.topic.split('\n')[0]}
                    </h3>
                  </div>

                  {/* Right side: PIC chip + Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-9 sm:pl-0">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getPicBadge(
                        item.pic
                      )}`}
                    >
                      {item.pic}
                    </span>

                    {isDone ? (
                      <span className="text-xs font-semibold text-mint-700 px-2 py-0.5">
                        Done ✓
                      </span>
                    ) : isCurrentActive ? (
                      <span className="rounded-full bg-peach-100 px-2.5 py-1 text-xs font-semibold text-peach-800">
                        Active Focus
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const matchedAct =
                            activities.find((a) => a.id === item.id) ||
                            scheduleActivityToActivity(item);
                          setActiveActivityId(matchedAct.id);
                          if (!activities.some((a) => a.id === matchedAct.id)) {
                            setActivities((prev) => [...prev, matchedAct]);
                          }
                          toast.info(
                            `Switched focus to: ${item.topic.split('\n')[0].slice(0, 30)}...`
                          );
                        }}
                        className="rounded-full bg-stone-100 hover:bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 transition active:scale-95"
                      >
                        Focus / Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Note */}
      <QuickNote
        onSave={content => {
          const entry = { content, createdAt: new Date().toISOString() };
          localStorage.setItem(QUICK_NOTES_STORAGE_KEY, JSON.stringify(appendQuickNote(readQuickNotes(localStorage.getItem(QUICK_NOTES_STORAGE_KEY)), entry)));
          setSync('Quick note saved · find it later under Learnings');
        }}
      />
      <LearningModal
        open={showLearningCapture}
        activity={learningActivityContext}
        onSave={submission => void handleLearningSave(submission)}
        onSkip={handleLearningSkip}
      />
      {editingScheduleItem && (
        <ScheduleFillModal
          activity={editingScheduleItem}
          onSave={handleSaveScheduleItem}
          onClose={() => setEditingScheduleItem(null)}
        />
      )}

      <ActivityDetailSheet
        activity={detailActivity}
        isOpen={Boolean(detailActivity)}
        onClose={() => setDetailActivity(null)}
        onEdit={(act) => setEditingScheduleItem(act)}
        onCopyGtoK={(act) => void handleCopyGtoK(act)}
        onCopyFullRow={(act) => void handleCopyFullRow(act)}
        onSyncRow={(act) => void handleDirectSyncScheduleRow(act)}
        onStartTimer={(act) => handleStartTimerForScheduleRow(act)}
        onWriteReflection={(act) => {
          const matchAct = activities.find((a) => a.id === act.id) || scheduleActivityToActivity(act);
          setSelectedActivityForLearning(matchAct);
          setShowLearningCapture(true);
        }}
        copiedToast={copiedRowToast}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectActivity={(act) => setDetailActivity(act)}
      />

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetSession();
          toast.info('Session reset. Ready for next activity.');
        }}
        title="Continue to Next Activity?"
        message="This will clear the current completed focus card and queue up your next activity. Your completed records and learnings are safely preserved."
        confirmLabel="Continue"
      />

      <FloatingTimer
        activity={currentActivity}
        startedAt={startedAt}
        finishedAt={finishedAt}
        pausedAt={pausedAt}
        accumulatedMs={accumulatedMs}
        onPause={() => {
          const rightNow = Date.now();
          setPausedAt(rightNow);
          if (startedAt) {
            setAccumulatedMs((prev) => prev + (rightNow - startedAt));
          }
          toast.info('Stopwatch paused.');
        }}
        onResume={() => {
          const rightNow = Date.now();
          setStartedAt(rightNow);
          setPausedAt(null);
          toast.info('Stopwatch resumed.');
        }}
        onFinish={() => {
          void finish();
        }}
        onScrollToTimer={() => {
          const el = document.getElementById('stopwatch-cockpit');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </main>
  );
}
