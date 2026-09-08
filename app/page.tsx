'use client';

import { useEffect, useState } from 'react';
import { isActivityList } from '@/lib/sheets/types';
import type { Activity } from '@/lib/types/activity';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import { QuickNote } from '@/app/components/QuickNote';
import { GuideTour, todayTourSteps } from '@/app/components/GuideTour';
import { LearningModal } from '@/app/components/LearningModal';
import type { LearningActivityContext, LearningSubmission } from '@/app/components/LearningModal';
import { ScheduleFillModal } from '@/app/components/ScheduleFillModal';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { ActivityDetailModal } from '@/app/components/ActivityDetailModal';
import { ScheduleCard } from '@/app/components/ScheduleCard';
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
  type ScheduleActivity,
} from '@/lib/schedule-catalog';
import { GUIDE_TOUR_STORAGE_KEY, readGuideTourState, writeGuideTourState } from '@/lib/guide-tour';
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
  const [selectedWeek, setSelectedWeek] = useState<string>('Week 1');
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [scheduleSearch, setScheduleSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleActivity | null>(null);
  const [detailActivity, setDetailActivity] = useState<ScheduleActivity | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [copiedRowToast, setCopiedRowToast] = useState<{ rowNumber: number; type: 'G-K' | 'Full' } | null>(null);
  const [scheduleTipDismissed, setScheduleTipDismissed] = useState(false);
  const [syncHelpExpanded, setSyncHelpExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScheduleTipDismissed(localStorage.getItem('onboarding-schedule-tip-dismissed') === 'true');
    }
  }, []);

  function handleDismissScheduleTip() {
    setScheduleTipDismissed(true);
    localStorage.setItem('onboarding-schedule-tip-dismissed', 'true');
  }

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
  const [tourOpen, setTourOpen] = useState(false);
  const [isSyncingDirectSheets, setIsSyncingDirectSheets] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === 'start') {
      params.delete('tour');
      const query = params.toString();
      window.history.replaceState(null, '', query ? `/?${query}` : '/');
      setTourOpen(true);
      return;
    }
    if (params.get('tour') === 'skip' || params.get('tour') === 'false') {
      return;
    }
    const tourState = readGuideTourState(localStorage.getItem(GUIDE_TOUR_STORAGE_KEY));
    if (!tourState?.completed) setTourOpen(true);
  }, []);

  useEffect(() => {
    function handleOpenPalette() {
      setCommandPaletteOpen(true);
    }
    window.addEventListener('open-command-palette', handleOpenPalette);
    return () => window.removeEventListener('open-command-palette', handleOpenPalette);
  }, []);

  function handleTourFinish() {
    localStorage.setItem(GUIDE_TOUR_STORAGE_KEY, writeGuideTourState({ completed: true, completedAt: new Date().toISOString() }));
    setTourOpen(false);
  }

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
    const auto = selectCurrentActivity(activities, completedIds);
    if (auto) return auto;
    const fallbackSched = scheduleCatalog.find((s) => s.progress !== 'Done') || scheduleCatalog[0];
    return fallbackSched ? scheduleActivityToActivity(fallbackSched) : null;
  })();
  const isActivityDone = (activity: Activity) => completedIds.has(activity.id) || activity.status === 'done';
  const doneActivitiesCount = activities.filter(isActivityDone).length;
  const completedCount = Math.max(doneActivitiesCount, mergeCompletedCount(progress?.completed ?? null, completedIds.size));
  const totalCount = progress?.total ?? activities.length;
  const inProgressCount = startedAt && !finishedAt ? 1 : 0;
  const remainingCount = Math.max(0, totalCount - completedCount - inProgressCount);
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
  const hour = new Date(now).getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening';
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const progressLabel = getProgressLabel({ completed: completedCount, inProgress: inProgressCount, total: totalCount });

  // Calculate day of 90 (placeholder: start from September 1, 2026)
  const startDate = new Date(2026, 8, 1);
  const nowDate = new Date(now);
  const dayNumber = Math.floor((nowDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = 90;
  const dayProgress = Math.min(100, Math.round((dayNumber / totalDays) * 100));

  const duration = startedAt && finishedAt ? Math.floor((finishedAt - startedAt) / 60000) : 0;

  const targetLearningActivity = selectedActivityForLearning ?? (activeActivityId ? activities.find(a => a.id === activeActivityId) ?? null : currentActivity);
  const targetActivityIndex = targetLearningActivity ? activities.findIndex(a => a.id === targetLearningActivity.id) : -1;
  const activityOrderNumber = targetActivityIndex >= 0 ? targetActivityIndex + 1 : (completedCount || 1);

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

  const seedling = seedlingStage(progressPercent);
  const diaryCount = typeof window === 'undefined' ? 0 : readDiary(localStorage.getItem(DIARY_STORAGE_KEY)).length;
  const allDone = completedCount === totalCount && totalCount > 0 && !currentActivity;
  const sessionToday = historySessions.length > 0 ? historySessions[historySessions.length - 1] : null;
  const durationHours = Math.floor(duration / 60);
  const durationMinutes = duration % 60;

  const headline = allDone
    ? 'That’s everything for today.'
    : completedCount === 0
    ? 'Your day is still unwritten.'
    : progressPercent >= 50
    ? 'Almost there!'
    : 'You’ve had a pretty productive day.';

  const todayFormatted = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  const todayActivities = scheduleCatalog.filter((a) => a.date === todayFormatted || (a.day === 'Monday' && a.week === 'Week 2'));

  const weekCounts: Record<string, number> = {
    'Today': todayActivities.length,
    'Week 1': scheduleCatalog.filter((a) => a.week === 'Week 1').length,
    'Week 2': scheduleCatalog.filter((a) => a.week === 'Week 2').length,
    'Week 3': scheduleCatalog.filter((a) => a.week === 'Week 3').length,
    'Week 4': scheduleCatalog.filter((a) => a.week === 'Week 4').length,
    'Month 2 & 3': scheduleCatalog.filter((a) => a.week === 'Month 2' || a.week === 'Month 3').length,
    'All': scheduleCatalog.length,
  };

  const currentWeekActivities = scheduleCatalog.filter((a) => {
    if (selectedWeek === 'Today') {
      return a.date === todayFormatted || (a.day === 'Monday' && a.week === 'Week 2');
    }
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

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Schedule" />
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
        <p className="text-sm font-medium text-stone-500">{todayLabel} · Day {Math.min(dayNumber, totalDays)} of {totalDays}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">{greeting}, Noah</h1>
        <p className="mt-3 text-lg text-stone-500">{headline}</p>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <p className="text-6xl font-semibold tracking-tight text-stone-900">
              {completedCount}<span className="ml-3 align-baseline text-xl font-medium text-stone-500">of {totalCount} today</span>
            </p>
            <div className="h-2.5 w-full min-w-56 overflow-hidden rounded-full bg-stone-200" aria-label={`${progressPercent}% of today’s activities complete`}>
              <div className="bar-gradient progress-shimmer h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
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
        <p className="mt-3 text-sm text-stone-500">{progressLabel}</p>
      </header>

      {allDone ? (
        /* Day wrapped up */
        <section data-tour="current-activity" className="animate-pop-in mt-10 rounded-card bg-sun-50 p-8 text-center shadow-soft">
          <div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sun-100 text-sun-700 animate-celebrate">
            <IconTrophy className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Day wrapped up</h2>
          <p className="mt-2 text-stone-600">{completedCount} activities{diaryCount > 0 ? ` · ${diaryCount} ${diaryCount === 1 ? 'thing' : 'things'} learned` : ''}</p>
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

      {/* Onboarding Schedule Cockpit */}
      <section data-tour="day-timeline" className="animate-fade-up stagger-2 mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                Onboarding Schedule
              </h2>
              {scheduleTipDismissed && (
                <button
                  type="button"
                  onClick={() => setScheduleTipDismissed(false)}
                  className="text-[11px] font-medium text-stone-400 hover:text-stone-700 underline underline-offset-2 transition"
                >
                  Show sync guide
                </button>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              59 master activities across your 90-day onboarding journey
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
              {filteredScheduleActivities.length} of {scheduleCatalog.length} activities
            </span>
          </div>
        </div>

        {/* Quick tip & sync guide (dismissible / collapsible) */}
        {!scheduleTipDismissed && (
          <div className="mb-5 rounded-2xl bg-sky-50/70 border border-sky-100/80 p-3.5 text-xs text-sky-900 shadow-2xs transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <IconLightbulb className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-950">
                    Click any activity to view outline details, log time, or sync with Google Sheets.
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
                        <strong>1-Click Direct Sync:</strong> Click the <code className="bg-sky-100 px-1 py-0.5 rounded font-mono font-semibold">Sync</code> option or open Activity Details to sync Duration, Start Time, End Time, Progress, and Notes straight to your Google Sheet.
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
                title="Dismiss tip"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Week Filter Tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
          {(['Today', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Month 2 & 3', 'All'] as const).map((w) => {
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

        {/* Why no Monday in Week 1 helper note */}
        {selectedWeek === 'Week 1' && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50/90 border border-amber-200/70 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                <strong>Why is Monday not in Week 1?</strong> Day 1 of onboarding started on <strong>Tuesday, September 1st, 2026</strong>. Monday activities appear in <strong>Week 2 (07/09)</strong>, Week 3, and Week 4!
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedWeek('Week 2');
                setSelectedDay('Monday');
              }}
              className="shrink-0 rounded-full bg-amber-200/80 px-3 py-1 font-semibold text-amber-950 transition hover:bg-amber-300 active:scale-95"
            >
              View Week 2 Monday →
            </button>
          </div>
        )}

        {/* Filter Toolbar: Day pills, Status, and Search */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {/* Day filter pills */}
          {availableDays.length > 1 && (
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
              {availableDays.map((day) => {
                const active = selectedDay === day;
                const count = dayCounts[day];
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      active
                        ? 'bg-mint-700 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {day} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Search input & status filter */}
          <div className="flex flex-wrap items-center gap-2 grow justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700 focus:outline-hidden"
              aria-label="Filter by status"
            >
              <option value="All">All Statuses</option>
              <option value="Done">Done</option>
              <option value="In Progress">In Progress</option>
              <option value="On-Hold">On-Hold</option>
              <option value="Reschedule">Reschedule</option>
              <option value="Not Started">Not Started</option>
            </select>

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

        {/* Schedule Cards */}
        {filteredScheduleActivities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
            <p className="text-sm font-medium">No schedule topics match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedWeek('All');
                setSelectedDay('All');
                setScheduleSearch('');
                setStatusFilter('All');
              }}
              className="mt-2 text-xs font-semibold text-mint-700 underline underline-offset-4"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredScheduleActivities.map((item) => {
              const isCurrentTimer = activeActivityId === item.id;
              const isTimerRunning = isCurrentTimer && Boolean(startedAt && !finishedAt && !pausedAt);
              const isTimerPaused = isCurrentTimer && Boolean(startedAt && !finishedAt && pausedAt);
              const totalElapsedSecs = calculateElapsedSeconds(startedAt, Date.now(), pausedAt, accumulatedMs);

              return (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  isCurrentTimer={isCurrentTimer}
                  isTimerRunning={isTimerRunning}
                  isTimerPaused={isTimerPaused}
                  elapsedSeconds={totalElapsedSecs}
                  startedAt={startedAt}
                  onViewDetails={(act) => setDetailActivity(act)}
                  onStartTimer={(act) => handleStartTimerForScheduleRow(act)}
                  onFillRow={(act) => setEditingScheduleItem(act)}
                  onSyncRow={(act) => void handleDirectSyncScheduleRow(act)}
                  onCopyGtoK={(act) => void handleCopyGtoK(act)}
                  onCopyFullRow={(act) => void handleCopyFullRow(act)}
                  onWriteReflection={(act) => {
                    const matchAct = activities.find((a) => a.id === act.id) || scheduleActivityToActivity(act);
                    setSelectedActivityForLearning(matchAct);
                    setShowLearningCapture(true);
                  }}
                  copiedToast={copiedRowToast}
                />
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
      <GuideTour steps={todayTourSteps} open={tourOpen} onFinish={handleTourFinish} />

      <ActivityDetailModal
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
