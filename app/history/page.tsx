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
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-slate-900 sm:px-8 sm:py-8"><PrimaryNav active="Learnings" />
    <header className="animate-fade-up border-b border-slate-200 pb-8"><p className="text-sm font-medium text-slate-500">Your learning record</p><h1 className="text-gradient mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Learnings</h1><p className="mt-3 text-lg text-slate-600">Completed sessions, quick notes, and your learning diary.</p></header>
    {summary && <section className="animate-fade-up stagger-1 mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-6"><h2 className="font-semibold text-emerald-900">Today’s progress</h2><p className="mt-1 text-sm text-slate-700">{summaryMessage} {summaryRemaining > 0 ? `${summaryRemaining} record${summaryRemaining === 1 ? '' : 's'} still missing.` : 'Nothing is missing.'}</p></section>}
    {notes.length > 0 && <ExportNotes notes={notes} selectedIds={selectedIds} onToggleSelectAll={toggleSelectAll} onClearSelection={clearSelection} onExported={handleExported} />}
    {exportMessage && <p className="mt-3 text-sm" role="status">{exportMessage}</p>}
    <section className="animate-fade-up stagger-2 mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{dateLabel}</h2><span className="text-sm text-slate-500">{sessions.length} completed</span></div><div className="divide-y divide-slate-200 border-y border-slate-200">{activities.map(activity => {
      const isCompleted = completedIds.has(activity.id);
      const status = isCompleted ? { indicator: '✓', label: 'Completed', className: 'text-emerald-600' } : { indicator: '○', label: 'Not started', className: 'text-slate-400' };
      const session = sessions.find(s => s.activityId === activity.id);
      const duration = session ? Math.floor((session.finishedAt - session.startedAt) / 60000) : 0;
      return <article key={activity.id} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-3 py-5"><span className={`pt-0.5 text-xl leading-none ${status.className}`} aria-label={status.label}>{status.indicator}</span><div><h3 className="font-medium text-slate-900">{activity.name}</h3><p className="mt-1 text-sm text-slate-500">{isCompleted && session ? `${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(session.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${duration} min` : `${activity.plannedStart} – ${activity.plannedEnd}`}</p></div><span className={`pt-1 text-right text-sm font-medium ${status.className}`}>{status.label}</span></article>
    })}</div></section>
    <section className="animate-fade-up stagger-3 mt-12"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Learning diary</h2><span className="text-sm text-slate-500">{diary.length} entries</span></div><div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">{diary.length ? <div className="space-y-5">{selectableDiary.slice().reverse().map((entry, index) => <article key={`${entry.createdAt}-${index}`} className="relative grid grid-cols-[1.5rem_1fr] items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"><label className="absolute left-2.5 top-3 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"><input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleNote(entry.id)} aria-label={`Select note ${entry.content.trim().slice(0, 20)}`} className="size-5 accent-slate-900" /></label><div><p className="whitespace-pre-wrap text-slate-700">{entry.content}</p><time className="mt-2 block text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time></div></article>)}</div> : <p className="text-slate-500">Your confirmed learning notes will appear here.</p>}</div></section>
    <section className="animate-fade-up stagger-4 mt-12"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Quick notes</h2><span className="text-sm text-slate-500">{quickNotes.length} drafts</span></div><div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">{quickNotes.length ? <div className="space-y-5">{selectableQuickNotes.slice().reverse().map((note, index) => <article key={`${note.createdAt}-${index}`} className="relative grid grid-cols-[1.5rem_1fr] items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"><label className="absolute left-2.5 top-3 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"><input type="checkbox" checked={selectedIds.has(note.id)} onChange={() => toggleNote(note.id)} aria-label={`Select note ${note.content.trim().slice(0, 20)}`} className="size-5 accent-slate-900" /></label><div><p className="whitespace-pre-wrap text-slate-700">{note.content}</p><time className="mt-2 block text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()}</time></div></article>)}</div> : <p className="text-slate-500">Capture a thought on Today with + Quick note. Drafts wait here until you shape them into diary entries.</p>}</div></section>
  </main>;
}
