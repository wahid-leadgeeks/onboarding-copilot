'use client';
import { useEffect, useState } from 'react';
import { ACTIVE_SESSION_STORAGE_KEY, DIARY_STORAGE_KEY, SESSION_HISTORY_STORAGE_KEY, readSessions, readDiary, type StoredSession, type StoredDiary } from '@/lib/local-records';
import { PrimaryNav } from '@/app/components/PrimaryNav';

export default function HistoryPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [diary, setDiary] = useState<StoredDiary[]>([]);
  const [summary, setSummary] = useState<{ completed: number; total: number; remaining: number; message: string; source?: string } | null>(null);
  useEffect(() => {
    try {
      setSessions(readSessions(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY) ?? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)));
      setDiary(readDiary(localStorage.getItem(DIARY_STORAGE_KEY)));
    } catch { /* ignore malformed local state */ }
    fetch('/api/summary', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((value: unknown) => {
      if (!value || typeof value !== 'object') return;
      const data = value as Record<string, unknown>;
      if (typeof data.completed === 'number' && typeof data.total === 'number' && typeof data.remaining === 'number' && typeof data.message === 'string') setSummary({ completed: data.completed, total: data.total, remaining: data.remaining, message: data.message, source: typeof data.source === 'string' ? data.source : undefined });
    }).catch(() => undefined);
  }, []);
  const duration = sessions.length ? Math.floor((sessions.at(-1)!.finishedAt - sessions.at(-1)!.startedAt) / 60000) : 0;
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10"><PrimaryNav active="History" />{summary && <section className="mb-6 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100"><h2 className="font-semibold">Today’s progress</h2><p className="mt-1 text-sm text-slate-600">{summary.message} {summary.remaining > 0 ? `${summary.remaining} record${summary.remaining === 1 ? "" : "s"} still missing.` : "Nothing is missing."}</p></section>}<h1 className="text-3xl font-semibold">History</h1><section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><h2 className="text-lg font-semibold">Recent sessions</h2>{sessions.length ? <div className="mt-3 space-y-3">{sessions.slice().reverse().map((item, index) => <p key={`${item.startedAt}-${index}`}>{item.name} · {Math.floor((item.finishedAt - item.startedAt) / 60000)}m <span className="ml-3 text-sm text-emerald-700">Done</span></p>)}</div> : <p className="mt-3 text-slate-500">Completed sessions will appear here.</p>}</section><section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><h2 className="text-lg font-semibold">Learning diary</h2>{diary.length ? <div className="mt-3 space-y-4">{diary.slice().reverse().map((entry, index) => <article key={`${entry.createdAt}-${index}`} className="border-b pb-3 last:border-0"><p className="whitespace-pre-wrap text-slate-700">{entry.content}</p><time className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time></article>)}</div> : <p className="mt-3 text-slate-500">Your confirmed learning notes will appear here.</p>}</section></main>;
}
