'use client';
import { useEffect, useState } from 'react';
import { ACTIVE_SESSION_STORAGE_KEY, DIARY_STORAGE_KEY, QUICK_NOTES_STORAGE_KEY, SESSION_HISTORY_STORAGE_KEY, readSessions, readDiary, readQuickNotes, type StoredSession, type StoredDiary, type StoredQuickNote } from '@/lib/local-records';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import { mergeCompletedCount } from '@/lib/session/presentation';
import { IMPORTED_SCHEDULE_STORAGE_KEY, readImportedSchedule } from '@/lib/imported-schedule';
import { ExportNotes, type SelectableNote } from '@/app/components/ExportNotes';
import type { Activity } from '@/lib/types/activity';
import { isActivityList } from '@/lib/sheets/types';

export default function HistoryPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [diary, setDiary] = useState<StoredDiary[]>([]);
  const [quickNotes, setQuickNotes] = useState<StoredQuickNote[]>([]);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set<string>());
  const [exportMessage, setExportMessage] = useState('');
  const [summary, setSummary] = useState<{ completed: number; total: number; remaining: number; message: string; source?: string } | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  useEffect(() => {
    try {
      setSessions(readSessions(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY) ?? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)));
      setDiary(readDiary(localStorage.getItem(DIARY_STORAGE_KEY)));
      setQuickNotes(readQuickNotes(localStorage.getItem(QUICK_NOTES_STORAGE_KEY)));
    } catch { /* ignore malformed local state */ }
    fetch('/api/summary', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((value: unknown) => {
      if (!value || typeof value !== 'object') return;
      const data = value as Record<string, unknown>;
      if (typeof data.completed === 'number' && typeof data.total === 'number' && typeof data.remaining === 'number' && typeof data.message === 'string') setSummary({ completed: data.completed, total: data.total, remaining: data.remaining, message: data.message, source: typeof data.source === 'string' ? data.source : undefined });
    }).catch(() => undefined);
    const imported = readImportedSchedule(localStorage.getItem(IMPORTED_SCHEDULE_STORAGE_KEY));
    if (imported) setActivities(imported.activities);
    else fetch('/api/schedule', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((value: unknown) => { if (isActivityList(value)) setActivities(value); }).catch(() => undefined);
  }, []);
  const completedIds = new Set(sessions.map((session) => session.activityId));
  const summaryCompleted = summary ? mergeCompletedCount(summary.completed, completedIds.size) : 0;
  const summaryRemaining = summary ? Math.max(0, summary.total - summaryCompleted) : 0;
  const summaryMessage = !summary ? ''
    : summary.total === 0 ? 'No activities are scheduled today.'
    : summaryRemaining === 0 ? 'All scheduled activities are recorded.'
    : `${summaryCompleted} of ${summary.total} activities are recorded.`;
  const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(new Date());
  const selectableDiary: SelectableNote[] = diary.map((entry, index) => ({ id: `d-${index}`, kind: 'diary', content: entry.content, createdAt: entry.createdAt }));
  const selectableQuickNotes: SelectableNote[] = quickNotes.map((note, index) => ({ id: `q-${index}`, kind: 'quick-note', content: note.content, createdAt: note.createdAt }));
  const notes: SelectableNote[] = [...selectableDiary, ...selectableQuickNotes];
  const allSelected = notes.length > 0 && notes.every((note) => selectedIds.has(note.id));
  function toggleNote(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() { setSelectedIds(allSelected ? new Set<string>() : new Set(notes.map((note) => note.id))); }
  function clearSelection() { setSelectedIds(new Set<string>()); }
  function handleExported(count: number) { setExportMessage(`Exported ${count} notes · check your downloads`); }
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8"><PrimaryNav active="Learnings" />
    <header className="animate-fade-up pb-8"><p className="text-sm font-medium text-stone-500">Your learning record</p><h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">Learnings</h1><p className="mt-3 text-lg text-stone-600">Everything you've captured, in your words.</p></header>
    {summary && <section className="animate-fade-up stagger-1 mt-8 rounded-card bg-white p-6 shadow-soft sm:p-8"><div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"><div><p className="text-5xl font-semibold tracking-tight text-stone-900">{summaryCompleted} <span className="font-normal text-stone-400">of</span> {summary.total}</p><p className="mt-2 text-sm text-stone-500">activities recorded today</p></div><p className={`rounded-full px-4 py-2 text-sm font-medium ${summaryRemaining === 0 ? 'bg-mint-50 text-mint-700' : 'bg-peach-50 text-peach-700'}`}>{summary.total === 0 ? 'Nothing scheduled today.' : summaryRemaining === 0 ? 'All recorded. Nothing missing. 🌿' : `${summaryRemaining} still to write ✍️`}</p></div><div className="mt-6 h-2.5 rounded-full bg-stone-200"><div className="bar-gradient progress-shimmer h-2.5 rounded-full transition-[width]" style={{ width: `${summary.total === 0 ? 0 : Math.round((summaryCompleted / summary.total) * 100)}%` }} /></div><p className="sr-only" role="status">{summaryMessage}</p></section>}
    {notes.length > 0 && <div className="mt-8"><ExportNotes notes={notes} selectedIds={selectedIds} onToggleSelectAll={toggleSelectAll} onClearSelection={clearSelection} onExported={handleExported} /></div>}
    {exportMessage && <p className="mt-3 text-sm text-stone-600" role="status">{exportMessage}</p>}
    <section className="animate-fade-up stagger-2 mt-12"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">{dateLabel}</h2><span className="text-sm text-stone-500">{Math.max(sessions.length, activities.filter(a => a.status === 'done').length)} completed</span></div><div className="rounded-card bg-white p-2 shadow-soft sm:p-4"><ul className="divide-y divide-stone-100">{activities.map(activity => {
      const isCompleted = completedIds.has(activity.id) || activity.status === 'done';
      const status = isCompleted ? { indicator: '✓', label: 'Completed', circle: 'bg-mint-100 text-mint-700', text: 'text-mint-700' } : { indicator: '○', label: 'Not started', circle: 'bg-stone-100 text-stone-400', text: 'text-stone-500' };
      const session = sessions.find(s => s.activityId === activity.id);
      const duration = session ? Math.floor((session.finishedAt - session.startedAt) / 60000) : (activity.durationMinutes ?? 0);
      const timeLabel = isCompleted && session
        ? `${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(session.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${duration} min`
        : activity.plannedStart === 'TBD'
          ? (activity.durationMinutes ? `${activity.durationMinutes} min · Flexible` : 'Flexible')
          : `${activity.plannedStart} – ${activity.plannedEnd}${duration > 0 ? ` · ${duration} min` : ''}`;
      return <li key={activity.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-4 sm:px-5"><span className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${status.circle}`} aria-label={status.label}>{status.indicator}</span><div className="min-w-0"><h3 className="font-medium text-stone-900">{activity.name}</h3><p className="mt-1 text-sm text-stone-500">{timeLabel}</p></div><span className={`text-right text-sm font-medium ${status.text}`}>{status.label}</span></li>;
    })}</ul></div></section>
    <section className="animate-fade-up stagger-3 mt-12"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-lavender-300" />Learning diary</h2><span className="text-sm text-stone-500">{diary.length} entries</span></div><div className="rounded-card bg-white p-6 shadow-soft sm:p-8">{diary.length ? <div className="space-y-6">{selectableDiary.slice().reverse().map((entry, index) => <article key={`${entry.createdAt}-${index}`} className="relative grid grid-cols-[2.5rem_1fr] items-start gap-2"><label className="flex size-11 cursor-pointer items-center justify-center"><input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleNote(entry.id)} aria-label={`Select note ${entry.content.trim().slice(0, 20)}`} className="size-5 accent-stone-900" /></label><div className="min-w-0"><p className="whitespace-pre-wrap text-stone-700">{entry.content}</p><time className="mt-2 block text-xs text-stone-400">{new Date(entry.createdAt).toLocaleString()}</time></div></article>)}</div> : <p className="px-4 py-14 text-center text-stone-400">Nothing here yet. Your day is still unwritten.</p>}</div></section>
    <section className="animate-fade-up stagger-4 mt-12"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-peach-300" />Quick notes</h2><span className="text-sm text-stone-500">{quickNotes.length} drafts</span></div><div className="rounded-card bg-white p-6 shadow-soft sm:p-8">{quickNotes.length ? <div className="space-y-6">{selectableQuickNotes.slice().reverse().map((note, index) => <article key={`${note.createdAt}-${index}`} className="relative grid grid-cols-[2.5rem_1fr] items-start gap-2"><label className="flex size-11 cursor-pointer items-center justify-center"><input type="checkbox" checked={selectedIds.has(note.id)} onChange={() => toggleNote(note.id)} aria-label={`Select note ${note.content.trim().slice(0, 20)}`} className="size-5 accent-stone-900" /></label><div className="min-w-0"><p className="whitespace-pre-wrap text-stone-700">{note.content}</p><time className="mt-2 block text-xs text-stone-400">{new Date(note.createdAt).toLocaleString()}</time></div></article>)}</div> : <p className="px-4 py-14 text-center text-stone-400">Capture a thought on Today — drafts wait here for you.</p>}</div></section>
  </main>;
}
