'use client';

import { useEffect, useState } from 'react';
import { isActivityList } from '@/lib/sheets/types';
import type { Activity } from '@/lib/types/activity';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import { QuickNote } from '@/app/components/QuickNote';
import { GuideTour, todayTourSteps } from '@/app/components/GuideTour';
import { LearningModal } from '@/app/components/LearningModal';
import type { LearningSubmission } from '@/app/components/LearningModal';
import { GUIDE_TOUR_STORAGE_KEY, readGuideTourState, writeGuideTourState } from '@/lib/guide-tour';
import { IMPORTED_SCHEDULE_STORAGE_KEY, readImportedSchedule } from '@/lib/imported-schedule';
import { ACTIVE_SESSION_STORAGE_KEY, DIARY_STORAGE_KEY, QUICK_NOTES_STORAGE_KEY, SESSION_HISTORY_STORAGE_KEY, appendDiary, appendQuickNote, appendSession, completedActivityIds, readDiary, readQuickNotes, readSessions, type StoredSession } from '@/lib/local-records';
import { diarySyncPayload, learningDiaryEntry } from '@/lib/learning-capture';
import { selectCurrentActivity } from '@/lib/session/activity-selection';
import { enqueueSync, pendingSyncStorageKey, readPendingSyncs, writePendingSyncs } from '@/lib/sync-queue';
import { formatStartedAt, getProgressLabel, mergeCompletedCount } from '@/lib/session/presentation';

const fallback: Activity[] = [{ id: 'intro-it', name: 'Introduction to IT Systems', type: 'learning', plannedStart: '09:00', plannedEnd: '11:00', status: 'not-started' }, { id: 'security', name: 'Security & Access Setup', type: 'setup', plannedStart: '11:30', plannedEnd: '12:30', status: 'not-started' }, { id: 'welcome', name: 'Team Welcome', type: 'welcome', plannedStart: '14:00', plannedEnd: '15:00', status: 'not-started' }];

const activityDot = (type: string) =>
  type === 'learning' ? 'bg-lavender-300' : type === 'setup' ? 'bg-sky-300' : 'bg-peach-300';

const seedlingStage = (percent: number) =>
  percent <= 0 ? '🌱 Just planted' : percent < 50 ? '🌱 Growing' : percent < 100 ? '🌿 Almost there' : '🌳 Day complete';

const formatClock = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function TodayPage() {
  const [activities, setActivities] = useState<Activity[]>(fallback);
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

  function handleTourFinish() {
    localStorage.setItem(GUIDE_TOUR_STORAGE_KEY, writeGuideTourState({ completed: true, completedAt: new Date().toISOString() }));
    setTourOpen(false);
  }

  useEffect(() => {
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

  async function finish() {
    if (!startedAt || !currentActivity) return;
    const end = Date.now();
    setFinishedAt(end);
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
    const entry = learningDiaryEntry(submission, { activityId: activeActivityId, activityName: finishedActivityName }, new Date().toISOString());
    const existing = readDiary(localStorage.getItem(DIARY_STORAGE_KEY));
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(appendDiary(existing, entry)));
    const response = await fetch('/api/diary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(diarySyncPayload(entry)) }).catch(() => null);
    setSync(response?.ok ? 'Learning saved · pending sync' : 'Not synced');
    setShowLearningCapture(false);
  }

  function handleLearningSkip() {
    setSync('Learning capture skipped · you can add it later from Learnings');
    setShowLearningCapture(false);
  }

  function resetSession() {
    setStartedAt(null);
    setFinishedAt(null);
    setActiveActivityId(null);
    setFinishedActivityName(null);
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

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Today" />
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
          <a href="/history" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-stone-700">Review your learnings →</a>
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
                  onClick={() => setShowLearningCapture(true)}
                  className="min-h-12 rounded-full bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-700"
                >
                  Record what I learned
                </button>
                <button
                  onClick={resetSession}
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

      {/* Day journey */}
      <section data-tour="day-timeline" className="animate-fade-up stagger-2 mt-12">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Your day</h2>
          <span className="text-sm text-stone-500">{activities.length} activities</span>
        </div>
        <div className="mt-2">
          {sessionToday && sessionToday.finishedAt > sessionToday.startedAt && (
            <div className="grid grid-cols-[2rem_1fr] items-center gap-3 border-l-2 border-stone-100 py-3 pl-4">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-sun-50 text-lg">☀️</span>
              <p className="text-sm text-stone-500">Started {formatClock(sessionToday.startedAt)}</p>
            </div>
          )}
          {activities.map(activity => {
            const done = isActivityDone(activity);
            const current = activity.id === currentActivity?.id;
            return (
              <div key={activity.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-l-2 border-stone-100 py-3 pl-4">
                <span
                  aria-label={done ? 'Completed' : current ? 'In progress' : 'Upcoming'}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${done ? 'bg-mint-100 text-mint-700' : current ? (startedAt && !finishedAt ? 'bg-peach-100 text-peach-600' : 'bg-peach-100 text-peach-700') : 'bg-stone-100 text-stone-400'}`}
                >
                  {done ? '✓' : current ? '●' : '○'}
                </span>
                <p className={`font-medium ${done ? 'text-stone-500' : current ? 'text-stone-900' : 'text-stone-700'}`}>{activity.name}</p>
                <span className="text-sm text-stone-400">{activity.plannedStart === 'TBD' ? (activity.durationMinutes ? `${activity.durationMinutes}m` : 'TBD') : activity.plannedStart}</span>
              </div>
            );
          })}
          {sessionToday && sessionToday.finishedAt > sessionToday.startedAt && (
            <div className="grid grid-cols-[2rem_1fr] items-center gap-3 border-l-2 border-stone-100 py-3 pl-4">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-50 text-lg">🌿</span>
              <p className="text-sm text-stone-500">Finished {formatClock(sessionToday.finishedAt)}</p>
            </div>
          )}
        </div>
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
        open={finishedAt !== null && showLearningCapture}
        onSave={submission => void handleLearningSave(submission)}
        onSkip={handleLearningSkip}
      />
      <GuideTour steps={todayTourSteps} open={tourOpen} onFinish={handleTourFinish} />
    </main>
  );
}
