'use client';
import { useEffect, useState } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import { pendingSyncStorageKey, readPendingSyncs, removePendingSync, writePendingSyncs } from '@/lib/sync-queue';

type Health = { mode: string; integrations: { sheets: boolean; sheetsRead?: boolean; sheetsWrite?: boolean; diaryWrite?: boolean; oauth: boolean; ai: boolean } };

function isHealth(value: unknown): value is Health {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const integrations = record.integrations;
  if (!integrations || typeof integrations !== 'object') return false;
  const flags = integrations as Record<string, unknown>;
  return typeof record.mode === 'string' && typeof flags.sheets === 'boolean' && typeof flags.oauth === 'boolean' && typeof flags.ai === 'boolean'
    && (flags.sheetsRead === undefined || typeof flags.sheetsRead === 'boolean')
    && (flags.sheetsWrite === undefined || typeof flags.sheetsWrite === 'boolean');
}

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [healthError, setHealthError] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  async function retryPending() { const pending = readPendingSyncs(localStorage.getItem(pendingSyncStorageKey())); const results = await Promise.all(pending.map(async (item) => { const response = await fetch('/api/session/retry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) }).catch(() => null); const value = response?.ok ? await response.json().catch(() => null) as { synced?: boolean } : null; return value?.synced ? item : null; })); const synced = results.filter((item): item is typeof pending[number] => item !== null); const remaining = synced.reduce((items, item) => removePendingSync(items, item), pending); writePendingSyncs(localStorage, remaining); setPendingCount(remaining.length); setSyncMessage(synced.length ? `${synced.length} session${synced.length === 1 ? '' : 's'} synced` : pending.length ? 'No pending sessions could be synced yet' : 'No sessions are waiting to sync'); }
  async function refreshHealth() {
    const response = await fetch('/api/health', { cache: 'no-store' }).catch(() => null);
    if (!response?.ok) { setHealthError(true); return; }
    const value: unknown = await response.json();
    if (isHealth(value)) { setHealth(value); setHealthError(false); } else setHealthError(true);
  }
  useEffect(() => { void refreshHealth(); setPendingCount(readPendingSyncs(localStorage.getItem(pendingSyncStorageKey())).length); }, []);
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-slate-900 sm:px-8 sm:py-8"><PrimaryNav active="Settings" />
    <header className="border-b border-slate-200 pb-8"><p className="text-sm font-medium text-slate-500">Preferences</p><h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Settings</h1><p className="mt-3 text-lg text-slate-600">Manage your connection and sync preferences.</p></header>
    <section className="mt-10 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">Connection</h2><button onClick={() => void refreshHealth()} className="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Refresh</button></div><p className="mt-3 text-slate-500">{healthError && <span className="text-amber-700">Health check unavailable · </span>}Mode: <span className="font-medium text-slate-700">{health?.mode ?? 'Checking…'}</span></p><div className="mt-4 space-y-2 text-sm"><p><span className={`inline-block w-4 text-center ${health?.integrations.oauth ? 'text-emerald-600' : 'text-slate-400'}`}>{health?.integrations.oauth ? '●' : '○'}</span> Google sign-in</p><p><span className={`inline-block w-4 text-center ${health?.integrations.sheets ? 'text-emerald-600' : 'text-slate-400'}`}>{health?.integrations.sheets ? '●' : '○'}</span> Google Sheets sync</p>{health && !health.integrations.sheets && (health.integrations.sheetsRead || health.integrations.sheetsWrite) && <p className="text-amber-700">⚠️ Sheets is partially configured</p>}<p><span className={`inline-block w-4 text-center ${health?.integrations.ai ? 'text-emerald-600' : 'text-slate-400'}`}>{health?.integrations.ai ? '●' : '○'}</span> AI provider</p></div></section>
    <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-900">Sync</h2><p className="mt-3 text-slate-500">Completed sessions and learning notes sync after confirmation. Local records remain available if a service is unavailable.</p><button onClick={() => void retryPending()} disabled={!pendingCount} className="mt-4 min-h-11 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">Retry pending sync</button><p className="mt-3 text-sm" role="status">{pendingCount ? `⏳ ${pendingCount} session${pendingCount === 1 ? '' : 's'} waiting to sync` : '✅ No sessions waiting to sync'}</p></section>
    <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-900">Guide tour</h2><p className="mt-3 text-slate-500">New to the cockpit? Take a short walkthrough of Today, the timeline, quick notes, and more.</p><a href="/?tour=start" className="mt-4 inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Restart the guide tour</a></section></main>
}
