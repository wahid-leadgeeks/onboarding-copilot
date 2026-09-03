'use client';

import { useEffect, useState } from 'react';
import { isActivityList } from '@/lib/sheets/types';
import type { Activity } from '@/lib/types/activity';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import { QuickNote } from '@/app/components/QuickNote';
import { ACTIVE_SESSION_STORAGE_KEY, DIARY_STORAGE_KEY, QUICK_NOTES_STORAGE_KEY, SESSION_HISTORY_STORAGE_KEY, appendDiary, appendQuickNote, appendSession, completedActivityIds, readDiary, readQuickNotes, readSessions, type StoredDiary, type StoredSession } from '@/lib/local-records';
import { selectCurrentActivity } from '@/lib/session/activity-selection';
import { enqueueSync, pendingSyncStorageKey, readPendingSyncs, writePendingSyncs } from '@/lib/sync-queue';
import { formatStartedAt, getProgressLabel, mergeCompletedCount } from '@/lib/session/presentation';

type SpeechRecognitionLike = { start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
const fallback: Activity[] = [{ id: 'intro-it', name: 'Introduction to IT Systems', type: 'learning', plannedStart: '09:00', plannedEnd: '11:00', status: 'not-started' }, { id: 'security', name: 'Security & Access Setup', type: 'setup', plannedStart: '11:30', plannedEnd: '12:30', status: 'not-started' }, { id: 'welcome', name: 'Team Welcome', type: 'welcome', plannedStart: '14:00', plannedEnd: '15:00', status: 'not-started' }];

export default function TodayPage() {
  const [activities, setActivities] = useState<Activity[]>(fallback);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [finishedActivityName, setFinishedActivityName] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<StoredSession[]>([]);
  const [notes, setNotes] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiConfirmed, setAiConfirmed] = useState(false);
  const [sync, setSync] = useState('');
  const [listening, setListening] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [progress, setProgress] = useState<{ completed: number; total: number; remaining: number } | null>(null);
  const [scheduleState, setScheduleState] = useState<'demo' | 'connected' | 'error'>('demo');
  const [deviation, setDeviation] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [showLearningCapture, setShowLearningCapture] = useState(false);

  useEffect(() => {
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
  const currentActivity = activeActivityId && !finishedAt ? activities.find((item) => item.id === activeActivityId) ?? null : selectCurrentActivity(activities, completedIds);
  const completedCount = mergeCompletedCount(progress?.completed ?? null, completedIds.size);
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

  const displayStatus = (activity: Activity) => {
    if (activity.id === activeActivityId && startedAt && !finishedAt) return { indicator: '●', label: 'In progress', className: 'text-indigo-600' };
    if (completedIds.has(activity.id)) return { indicator: '✓', label: 'Completed', className: 'text-emerald-600' };
    if (activity.status === 'overdue') return { indicator: '!', label: 'Needs attention', className: 'text-amber-600' };
    return { indicator: '○', label: 'Upcoming', className: 'text-slate-400' };
  };

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

  async function saveNotes() {
    const content = (aiSummary && aiConfirmed ? aiSummary : notes).trim();
    if (!content) return;
    const entry: StoredDiary = { content, createdAt: new Date().toISOString() };
    const existing = readDiary(localStorage.getItem(DIARY_STORAGE_KEY));
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(appendDiary(existing, entry)));
    const response = await fetch('/api/diary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content }) }).catch(() => null);
    setSync(response?.ok ? 'Learning saved · pending sync' : 'Not synced');
    setShowLearningCapture(false);
    setNotes('');
    setAiSummary('');
    setAiConfirmed(false);
  }

  function skipNotes() {
    setNotes('');
    setAiSummary('');
    setAiConfirmed(false);
    setSync('Learning capture skipped · you can add it later from Learnings');
    setShowLearningCapture(false);
  }

  function resetSession() {
    setStartedAt(null);
    setFinishedAt(null);
    setActiveActivityId(null);
    setFinishedActivityName(null);
    setNotes('');
    setAiSummary('');
    setAiConfirmed(false);
    setSync('');
    setShowLearningCapture(false);
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }

  async function summarize() {
    const response = await fetch('/api/ai/summarize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: notes }) }).catch(() => null);
    if (!response?.ok) { setSync('Summary unavailable'); return; }
    const data = await response.json() as { summary?: string; requiresConfirmation?: boolean };
    if (data.summary) { setAiSummary(data.summary); setAiConfirmed(!data.requiresConfirmation); }
  }

  function toggleVoice() {
    const speechWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setSync('Voice input is not available in this browser'); return; }
    const recognition = new Recognition();
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setNotes(current => `${current} ${transcript}`.trim());
      setListening(false);
    };
    recognition.onerror = () => { setListening(false); setSync('Voice input was unavailable'); };
    if (listening) recognition.stop();
    else { setListening(true); recognition.start(); }
  }

  const statusBar = scheduleState === 'demo' ? { indicator: '🧪', label: 'Demo data', className: 'border-indigo-100 bg-indigo-50 text-indigo-900' } : scheduleState === 'error' ? { indicator: '🟡', label: 'Offline · Using saved schedule', className: 'border-amber-100 bg-amber-50 text-amber-900' } : { indicator: '🟢', label: sync || 'Synced just now', className: 'border-emerald-100 bg-emerald-50 text-emerald-900' };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-slate-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Today" />
      <div role="status" className={`mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusBar.className}`}>
        <span aria-hidden="true">{statusBar.indicator}</span>{statusBar.label}
      </div>

      {/* Header */}
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-slate-500">{todayLabel}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{greeting}, Noah</h1>
        <div className="mt-6 max-w-xl">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-semibold text-slate-900">Day {Math.min(dayNumber, totalDays)} of {totalDays}</p>
            <p className="text-sm text-slate-500">{completedCount} of {totalCount} today</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`${dayProgress}% journey complete`}>
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${dayProgress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">{progressLabel}</p>
        </div>
      </header>

      {/* Done for today */}
      {completedCount === totalCount && totalCount > 0 && !currentActivity ? (
        <section className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Done for today</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">You’re done for today.</h2>
          <p className="mt-2 text-slate-700">{completedCount} activities completed. Nothing else is scheduled.</p>
          <a href="/history" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700">Review your learnings</a>
        </section>
      ) : (
        <>
          {/* Current activity or completion moment */}
          {finishedAt ? (
            // Completion moment
            <section className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 p-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-emerald-600">✓</span>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Done</p>
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">{finishedActivityName ?? currentActivity?.name ?? 'Activity completed'}</h2>
              {startedAt && finishedAt && (
                <p className="mt-2 text-lg text-slate-600">
                  {new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {new Date(finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {duration} min
                </p>
              )}
              <p className="mt-1 text-sm text-slate-500">Nice. One less thing to think about.</p>
              <button
                onClick={() => setShowLearningCapture(true)}
                className="mt-6 min-h-12 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Record what I learned
              </button>
              <button
                onClick={resetSession}
                className="ml-4 min-h-12 rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Continue
              </button>
            </section>
          ) : (
            // Current activity card
            <section className="mt-10 rounded-2xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                <span aria-hidden="true">●</span>
                {startedAt ? 'In progress' : 'Right now'}
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{currentActivity?.name ?? 'No activities scheduled'}</h2>
              <p className="mt-3 text-base text-slate-300">
                {currentActivity ? `${currentActivity.type === 'welcome' ? 'Experience Manager' : 'IT Manager'} · ${currentActivity.type === 'learning' ? 'Knowledge Sharing' : currentActivity.type === 'setup' ? 'Access & setup' : 'Team welcome'}` : 'Enjoy the rest of your day'}
              </p>
              {currentActivity && (
                <p className="mt-1 text-sm text-slate-400">Scheduled {currentActivity.plannedStart}–{currentActivity.plannedEnd}</p>
              )}
              {startedAt && <p className="mt-6 text-base font-medium text-slate-200">{formatStartedAt(startedAt)}</p>}
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
                  className="mt-8 min-h-12 w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 active:scale-[.99]"
                >
                  {startedAt ? 'Finish activity' : 'Start activity'}
                </button>
              )}
              {startedAt && !finishedAt && (
                <div className="mt-4">
                  <button
                    onClick={() => setOptionsOpen(open => !open)}
                    aria-expanded={optionsOpen}
                    className="min-h-11 text-sm text-slate-300 underline underline-offset-4"
                  >
                    Something changed?
                  </button>
                  {optionsOpen && (
                    <div className="mt-4 border-t border-slate-700 pt-4">
                      <p className="text-sm text-slate-300">What happened?</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {['Started late', 'Finished early', 'Rescheduled', 'Cancelled', 'Forgot to start'].map(item => (
                          <button
                            key={item}
                            onClick={() => { setDeviation(item); setSync(`${item} noted locally`); setOptionsOpen(false); }}
                            className="rounded-lg border border-slate-600 px-3 py-2 text-left text-sm text-white transition hover:border-slate-400"
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
          {deviation && <p className="mt-3 text-center text-sm text-slate-600">Noted: {deviation}. You can continue when ready.</p>}

          {/* Learning capture */}
          {finishedAt && showLearningCapture && (
            <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold">What did you learn?</h2>
              <textarea
                aria-label="What did you learn?"
                placeholder="Just write a few words..."
                value={notes}
                onChange={event => setNotes(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-xl border p-3"
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button onClick={toggleVoice} className="rounded-xl border px-5 py-2">
                  {listening ? 'Stop speaking' : 'Speak'}
                </button>
                <button
                  onClick={() => void summarize()}
                  disabled={!notes.trim()}
                  className="rounded-xl border px-5 py-2 disabled:opacity-40"
                >
                  ✨ Summarize for me
                </button>
                <button
                  onClick={() => void saveNotes()}
                  disabled={!notes.trim() || (!!aiSummary && !aiConfirmed)}
                  className="rounded-xl bg-emerald-700 px-5 py-2 text-white disabled:opacity-40"
                >
                  {aiSummary ? 'Confirm & save' : 'Save & continue'}
                </button>
                <button onClick={skipNotes} className="rounded-xl px-2 py-2 text-sm text-slate-500 underline">
                  Skip for now
                </button>
              </div>
              {aiSummary && (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-medium text-violet-700">AI-generated summary</p>
                  <textarea
                    aria-label="Editable AI summary"
                    value={aiSummary}
                    onChange={event => { setAiSummary(event.target.value); setAiConfirmed(false); }}
                    rows={3}
                    className="mt-2 w-full rounded-lg border p-2"
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={aiConfirmed} onChange={event => setAiConfirmed(event.target.checked)} />
                    I reviewed and confirm this summary
                  </label>
                </div>
              )}
            </section>
          )}

          {/* Sync status */}
          {sync && <p className="mt-4 text-center text-sm text-slate-500" role="status">{sync}</p>}
        </>
      )}

      {/* Timeline: YOUR DAY */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Today</h2>
          <span className="text-sm text-slate-500">{activities.length} activities</span>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {activities.map(activity => {
            const status = displayStatus(activity);
            return (
              <div key={activity.id} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-3 py-5">
                <span className={`pt-0.5 text-xl leading-none ${status.className}`} aria-label={status.label}>
                  {status.indicator}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{activity.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{activity.plannedStart} · {status.label}</p>
                </div>
                <span className={`pt-1 text-right text-sm font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
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
    </main>
  );
}