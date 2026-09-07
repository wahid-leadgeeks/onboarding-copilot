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
import { CommandPalette } from '@/app/components/CommandPalette';
import {
  OFFICIAL_SCHEDULE_ACTIVITIES,
  SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY,
  readScheduleCustomizations,
  writeScheduleCustomizations,
  clipboardRowForScheduleGtoK,
  clipboardRowForScheduleFull,
  scheduleActivityToActivity,
  getMergedScheduleActivities,
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
  percent <= 0 ? '🌱 Just planted' : percent < 50 ? '🌱 Growing' : percent < 100 ? '🌿 Almost there' : '🌳 Day complete';

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
  const [expandedTopicRows, setExpandedTopicRows] = useState<Record<number, boolean>>({});

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === 'start') {
      params.delete('tour');
      const query = params.toString();
      window.history.replaceState(null, '', query ? `/?${query}` : '/');
      setTourOpen(true);
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
        const data = JSON.parse(value) as { activityId?: string; name?: string; startedAt?: number; finishedAt?: number };
        if (data.startedAt) setStartedAt(data.startedAt);
        if (data.finishedAt) setFinishedAt(data.finishedAt);
        if (data.activityId) setActiveActivityId(data.activityId);
        const finishedName = data.name ?? readSessions(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY)).find((session) => session.activityId === data.activityId)?.name;
        if (finishedName) setFinishedActivityName(finishedName);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (startedAt) localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({ activityId: activeActivityId, name: finishedActivityName, startedAt, finishedAt }));
  }, [startedAt, finishedAt, activeActivityId, finishedActivityName]);

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
  const isActivityDone = (activity: Activity) => completedIds.has(activity.id) || activity.status === 'done';
  const currentActivity = activeActivityId && !finishedAt ? activities.find((item) => item.id === activeActivityId) ?? null : selectCurrentActivity(activities, completedIds);
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
    setFinishedAt(end);
    setSelectedActivityForLearning(currentActivity);
    setShowLearningCapture(true);
    setProgress(current => current ? { ...current, completed: Math.min(current.total, current.completed + 1), remaining: Math.max(0, current.remaining - 1) } : { completed: 1, total: activities.length, remaining: Math.max(0, activities.length - 1) });
    const record: StoredSession = { activityId: currentActivity.id, name: currentActivity.name, startedAt, finishedAt: end };
    setFinishedActivityName(currentActivity.name);
    setHistorySessions(current => appendSession(current, record));
    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(appendSession(readSessions(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY)), record)));
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(record));
    const response = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ activityId: currentActivity.id, start: new Date(startedAt).toISOString(), end: new Date(end).toISOString() }) }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { pendingSync?: { activityId: string; actualStart: string; actualEnd: string; durationMinutes: number } } | null;
    if (payload?.pendingSync) writePendingSyncs(localStorage, enqueueSync(readPendingSyncs(localStorage.getItem(pendingSyncStorageKey())), payload.pendingSync));
    setSync(response?.ok ? 'Pending Google Sheets sync' : 'Not synced');
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
    setSync(`Row ${updated.rowNumber} (${titleSnippet}...) saved & synchronized! 🌿`);
    toast.success(`Row ${updated.rowNumber} (${titleSnippet}...) saved! 🌿`);
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
    setActiveActivityId(act.id);
    const timestamp = Date.now();
    setStartedAt(timestamp);
    setFinishedAt(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Started timer: ${item.topic.split('\n')[0].slice(0, 35)}...`);
    void fetch('/api/session/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activityId: act.id, startedAt: new Date(timestamp).toISOString(), plannedStart: act.plannedStart })
    }).catch(() => setSync('Session started locally'));
  }

  function resetSession() {
    setStartedAt(null);
    setFinishedAt(null);
    setActiveActivityId(null);
    setFinishedActivityName(null);
    setSelectedActivityForLearning(null);
    setSync('');
    setShowLearningCapture(false);
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }

  const statusBar = scheduleState === 'imported' ? { indicator: '📄', label: `Imported schedule · ${activities.length} activities`, className: 'bg-sky-50 text-sky-900' } : scheduleState === 'demo' ? { indicator: '🧪', label: 'Demo data', className: 'bg-sun-50 text-sun-700' } : scheduleState === 'error' ? { indicator: '🟡', label: 'Offline · Using saved schedule', className: 'bg-peach-50 text-peach-700' } : { indicator: '🟢', label: sync || 'Synced just now', className: 'bg-mint-50 text-mint-700' };

  const seedling = seedlingStage(progressPercent);
  const diaryCount = typeof window === 'undefined' ? 0 : readDiary(localStorage.getItem(DIARY_STORAGE_KEY)).length;
  const allDone = completedCount === totalCount && totalCount > 0 && !currentActivity;
  const sessionToday = historySessions.length > 0 ? historySessions[historySessions.length - 1] : null;
  const durationHours = Math.floor(duration / 60);
  const durationMinutes = duration % 60;

  const headline = allDone ? 'That’s everything for today. ✨' : completedCount === 0 ? 'Your day is still unwritten.' : progressPercent >= 50 ? 'Almost there! 🌱' : 'You’ve had a pretty productive day.';

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
      if (statusFilter === 'Not Started' && item.progress !== 'Not Started' && item.progress !== '') return false;
      if (statusFilter === 'Reschedule' && item.progress !== 'Reschedule') return false;
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
          <span aria-hidden="true">{statusBar.indicator}</span>{statusBar.label}
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
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">{greeting}, Noah <span aria-hidden="true" className="animate-float">👋</span></h1>
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
          <p className="text-lg text-stone-600">
            <span aria-hidden="true" className="mr-2 inline-block">{seedling.split(' ')[0]}</span>{seedling.split(' ').slice(1).join(' ')}
          </p>
        </div>
        <p className="mt-3 text-sm text-stone-500">{progressLabel}</p>
      </header>

      {allDone ? (
        /* Day wrapped up */
        <section data-tour="current-activity" className="animate-pop-in mt-10 rounded-card bg-sun-50 p-8 text-center shadow-soft">
          <p aria-hidden="true" className="animate-celebrate text-5xl">🎉</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">Day wrapped up</h2>
          <p className="mt-2 text-stone-600">{completedCount} activities{diaryCount > 0 ? ` · ${diaryCount} ${diaryCount === 1 ? 'thing' : 'things'} learned` : ''}</p>          <p className="mt-1 text-stone-500">See you tomorrow.</p>
          <a href="/diary" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-stone-700">Open Onboarding Diary →</a>
        </section>
      ) : (
        <>
          {finishedAt ? (
            // Completion moment
            <section data-tour="current-activity" className="animate-pop-in mt-10 rounded-card bg-white p-8 shadow-soft">
              <div className="flex items-center gap-4">
                <span className="animate-spring-in flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-3xl font-semibold text-mint-700">✓</span>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-700">Done</p>
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-stone-900">{finishedActivityName ?? currentActivity?.name ?? 'Activity completed'}</h2>
              {startedAt && finishedAt && (
                <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <p className="text-4xl font-semibold tracking-tight text-stone-900">{durationHours > 0 ? `${durationHours}h ${String(durationMinutes).padStart(2, '0')}m` : `${durationMinutes}m`}</p>
                  <p className="text-stone-500">{formatClock(startedAt)} → {formatClock(finishedAt)}</p>
                </div>
              )}
              <p className="mt-3 text-stone-500">Nice. That’s one less thing to carry around. ✨</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedActivityForLearning(currentActivity ?? (activeActivityId ? activities.find(a => a.id === activeActivityId) ?? null : null));
                    setShowLearningCapture(true);
                  }}
                  className="min-h-12 rounded-full bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-700"
                >
                  Record what I learned
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = currentActivity ?? (activeActivityId ? activities.find((a) => a.id === activeActivityId) ?? null : null);
                    if (target) {
                      const schedItem = scheduleCatalog.find((s) => s.id === target.id);
                      if (schedItem) {
                        setEditingScheduleItem({
                          ...schedItem,
                          durationMinutes: (durationHours * 60 + durationMinutes) || schedItem.durationMinutes,
                          startTime: startedAt ? formatClock(startedAt) : schedItem.startTime,
                          endTime: finishedAt ? formatClock(finishedAt) : schedItem.endTime,
                          progress: 'Done',
                        });
                      }
                    }
                  }}
                  className="min-h-12 rounded-full bg-mint-700 px-6 py-3 font-semibold text-white transition hover:bg-mint-800 shadow-xs active:scale-95"
                >
                  ✏️ Fill Row in Schedule Sheet (Cols G–K)
                </button>
                <button
                  type="button"
                  onClick={() => {
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
                  className="min-h-12 rounded-full bg-stone-100 px-5 py-3 font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95"
                  aria-label="Copy Schedule TSV row for completed activity"
                >
                  {copiedRowToast?.type === 'G-K' ? '✓ Copied Cols G–K! 🌿' : '📋 Copy Cols G–K TSV'}
                </button>
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="min-h-12 rounded-full px-6 py-3 font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
                >
                  Continue
                </button>
              </div>
            </section>
          ) : (
            // Focus card
            <section data-tour="current-activity" className="animate-fade-up stagger-1 mt-10 rounded-card bg-white p-8 shadow-soft transition hover:shadow-lift">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {startedAt ? (
                  <>
                    <span aria-hidden="true" className="animate-pulse-soft text-peach-600">●</span>
                    <span className="text-peach-600">In progress</span>
                    <span className="text-stone-500">· {formatStartedAt(startedAt)}</span>
                  </>
                ) : (
                  <span>Right now</span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-tight text-stone-900">{currentActivity?.name ?? 'No activities scheduled'}</h2>
                {currentActivity && <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${activityDot(currentActivity.type)}`} />}
              </div>
              <p className="mt-3 text-stone-500">
                {currentActivity ? `${currentActivity.type === 'welcome' ? 'Experience Manager' : 'IT Manager'} · ${currentActivity.type === 'learning' ? 'Knowledge Sharing' : currentActivity.type === 'setup' ? 'Access & setup' : 'Team welcome'}` : 'Enjoy the rest of your day'}
              </p>
              {currentActivity && (
                <p className="mt-1 text-sm text-stone-500">
                  {currentActivity.plannedStart === 'TBD'
                    ? (currentActivity.durationMinutes ? `${currentActivity.durationMinutes} min · Schedule: Flexible / TBD` : 'Schedule: Flexible / TBD')
                    : `Scheduled ${currentActivity.plannedStart}–${currentActivity.plannedEnd}`}
                </p>
              )}
              {!finishedAt && currentActivity && (
                <button
                  onClick={() => {
                    if (startedAt) {
                      void finish();
                    } else {
                      const timestamp = Date.now();
                      setActiveActivityId(currentActivity.id);
                      setStartedAt(timestamp);
                      void fetch('/api/session/start', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ activityId: currentActivity.id, startedAt: new Date(timestamp).toISOString(), plannedStart: currentActivity.plannedStart })
                      }).catch(() => setSync('Session started locally · server acknowledgement unavailable'));
                    }
                  }}
                  className="mt-8 min-h-12 w-full rounded-full bg-stone-900 px-5 py-3 text-lg font-semibold text-white transition hover:bg-stone-700 active:scale-[.99] sm:w-auto sm:min-w-64"
                >
                  {startedAt ? 'Finish activity' : 'Start activity'}
                </button>
              )}
              {startedAt && !finishedAt && (
                <div className="mt-4">
                  <button
                    onClick={() => setOptionsOpen(open => !open)}
                    aria-expanded={optionsOpen}
                    className="min-h-11 text-sm text-stone-500 underline underline-offset-4 transition hover:text-stone-700"
                  >
                    Something changed?
                  </button>
                  {optionsOpen && (
                    <div className="mt-4 border-t border-stone-100 pt-4">
                      <p className="text-sm text-stone-500">What happened?</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {['Started late', 'Finished early', 'Rescheduled', 'Cancelled', 'Forgot to start'].map(item => (
                          <button
                            key={item}
                            onClick={() => { setDeviation(item); setSync(`${item} noted locally`); setOptionsOpen(false); }}
                            className="min-h-11 rounded-2xl bg-stone-50 px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-100"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Deviation message */}
          {deviation && <p className="mt-3 text-center text-sm text-stone-600">Noted: {deviation}. You can continue when ready.</p>}

          {/* Sync status */}
          {sync && <p className="mt-4 text-center text-sm text-stone-500" role="status">{sync}</p>}
        </>
      )}

      {/* Onboarding Master Schedule Cockpit */}
      <section data-tour="day-timeline" className="animate-fade-up stagger-2 mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
              Onboarding Master Schedule
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Worksheet <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono font-semibold text-stone-800">Schedule</code> · Columns A to K (59 Official Master Activities)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
              {filteredScheduleActivities.length} of {scheduleCatalog.length} activities
            </span>
          </div>
        </div>

        {/* How to fill instruction banner */}
        <div className="mb-5 rounded-2xl bg-sky-50/80 border border-sky-100 p-4 text-xs text-sky-900 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-none">💡</span>
            <div className="space-y-1">
              <p className="font-bold">How to fill Duration, Start Time, End Time, Progress & Notes:</p>
              <p className="text-sky-800 leading-relaxed">
                Click <span className="font-semibold text-stone-900">“✏️ Fill Row”</span> on any topic to update <span className="font-medium">Duration (Col G), Start Time (Col H), End Time (Col I), Progress (Col J), and Notes (Col K)</span>.
                You can sync directly to Google Sheets with 1 click, or click <span className="font-semibold text-stone-900">“📋 Copy G–K”</span> and paste straight into cell <code className="rounded bg-sky-100 px-1 py-0.2 font-mono font-bold">G&#123;row&#125;</code> in Google Sheets!
              </p>
            </div>
          </div>
        </div>

        {/* Week Filter Tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
          {(['Today', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Month 2 & 3', 'All'] as const).map((w) => {
            const active = selectedWeek === w;
            const count = weekCounts[w] || 0;
            const label = w === 'Today' ? '⚡ Today' : w;
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
                <span>{label}</span>
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
              <span className="text-base">📅</span>
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
              <option value="Not Started">Not Started</option>
              <option value="Reschedule">Reschedule</option>
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
                  ✕
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
              const done = item.progress === 'Done';
              const isCurrentTimer = activeActivityId === item.id;
              const hasSubtopics = item.topic.includes('\n');
              const lines = item.topic.split('\n');
              const title = lines[0];
              const subtopics = lines.slice(1);
              const isExpanded = expandedTopicRows[item.rowNumber] ?? false;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-2xs transition hover:shadow-md ${
                    isCurrentTimer
                      ? 'border-peach-400 ring-2 ring-peach-200'
                      : done
                      ? 'border-stone-200/80 bg-stone-50/20'
                      : 'border-stone-200'
                  }`}
                >
                  {/* Top row: Row badge, Day, PIC, Media, Progress */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
                        Row {item.rowNumber}
                      </span>
                      <span className="text-xs font-medium text-stone-500">
                        #{item.activityCount} · {item.day}, {item.date}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPicBadge(item.pic)}`}>
                        {item.pic}
                      </span>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                        {item.mainMedia}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getProgressBadge(item.progress)}`}>
                        {item.progress || 'Not Started'}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mt-1">
                    <h3
                      onClick={() => setDetailActivity(item)}
                      className={`text-base font-semibold leading-snug cursor-pointer transition hover:text-mint-700 hover:underline ${
                        done ? 'text-stone-700' : 'text-stone-900'
                      }`}
                      title="Click to view details & outline"
                    >
                      {title}
                    </h3>
                    {hasSubtopics && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTopicRows((prev) => ({ ...prev, [item.rowNumber]: !isExpanded }))
                          }
                          className="text-[11px] font-medium text-stone-500 hover:text-stone-800 underline underline-offset-2"
                        >
                          {isExpanded ? 'Hide details ▴' : `View ${subtopics.length} details ▾`}
                        </button>
                        {isExpanded && (
                          <ul className="mt-2 space-y-1 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 border border-stone-100 animate-fade-in">
                            {subtopics.map((sub, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-stone-400">•</span>
                                <span>{sub.replace(/^[-*•]\s*/, '')}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tracking Columns Grid (Cols G–K) */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-stone-50/80 p-2.5 sm:grid-cols-4 sm:gap-3 text-xs border border-stone-100">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                        Col G · Duration
                      </span>
                      <span className="font-semibold text-stone-800">
                        {item.durationMinutes !== undefined ? `${item.durationMinutes} min` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                        Col H & I · Time
                      </span>
                      <span className="font-semibold text-stone-800">
                        {item.startTime ? `${item.startTime} → ${item.endTime || '?'}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                        Col J · Progress
                      </span>
                      <span className="font-semibold text-stone-800">
                        {item.progress || 'Not Started'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                        Col K · Notes
                      </span>
                      {item.notes ? (
                        item.notes.startsWith('http') ? (
                          <a
                            href={item.notes}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-mint-700 underline truncate block max-w-full"
                          >
                            Open Link ↗
                          </a>
                        ) : (
                          <span className="font-medium text-stone-700 truncate block max-w-full" title={item.notes}>
                            {item.notes}
                          </span>
                        )
                      ) : (
                        <span className="text-stone-400 font-normal">None</span>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingScheduleItem(item)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700 active:scale-95 shadow-2xs"
                      >
                        ✏️ Fill Row (Cols G–K)
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailActivity(item)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition active:scale-95"
                        title="View full topic objectives & details"
                      >
                        🔍 Details
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleCopyGtoK(item)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95"
                        title="Copies tab-separated: Duration, Start, End, Progress, Notes to paste into cell G"
                      >
                        {copiedRowToast?.rowNumber === item.rowNumber && copiedRowToast.type === 'G-K'
                          ? '✓ Copied G–K TSV! 🌿'
                          : '📋 Copy G–K'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleCopyFullRow(item)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 active:scale-95"
                        title="Copies full 11 columns A–K for this row"
                      >
                        {copiedRowToast?.rowNumber === item.rowNumber && copiedRowToast.type === 'Full'
                          ? '✓ Copied Row A–K!'
                          : 'Row A–K'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!done && (
                        <button
                          type="button"
                          onClick={() => handleStartTimerForScheduleRow(item)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700 transition hover:bg-mint-100 active:scale-95"
                        >
                          ▶️ Start Timer
                        </button>
                      )}
                      {done && (
                        <button
                          type="button"
                          onClick={() => {
                            const matchAct = activities.find((a) => a.id === item.id) || scheduleActivityToActivity(item);
                            setSelectedActivityForLearning(matchAct);
                            setShowLearningCapture(true);
                          }}
                          className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-mint-700 underline underline-offset-4 hover:text-mint-800"
                        >
                          Write Reflection
                        </button>
                      )}
                    </div>
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
      <GuideTour steps={todayTourSteps} open={tourOpen} onFinish={handleTourFinish} />

      <ActivityDetailModal
        activity={detailActivity}
        isOpen={Boolean(detailActivity)}
        onClose={() => setDetailActivity(null)}
        onEdit={(act) => setEditingScheduleItem(act)}
        onCopyGtoK={(act) => void handleCopyGtoK(act)}
        onStartTimer={(act) => handleStartTimerForScheduleRow(act)}
        onWriteReflection={(act) => {
          const matchAct = activities.find((a) => a.id === act.id) || scheduleActivityToActivity(act);
          setSelectedActivityForLearning(matchAct);
          setShowLearningCapture(true);
        }}
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
    </main>
  );
}
