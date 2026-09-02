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
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10"><PrimaryNav active="Settings" /><h1 className="text-3xl font-semibold">Settings</h1><section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Connection</h2><button onClick={() => void refreshHealth()} className="rounded-lg border px-3 py-2 text-sm">Refresh</button></div><p className="mt-3 text-slate-500">{healthError && <span className="text-amber-700">Health check unavailable · </span>}Mode: <span className="font-medium text-slate-700">{health?.mode ?? 'Checking…'}</span></p><div className="mt-4 space-y-2 text-sm"><p>{health?.integrations.oauth ? '✅' : '—'} Google sign-in</p><p>{health?.integrations.sheets ? '✅' : '—'} Google Sheets sync</p><span>{health && !health.integrations.sheets && (health.integrations.sheetsRead || health.integrations.sheetsWrite) && <p className="text-amber-700">⚠️ Sheets is partially configured</p>}</span><p>{health?.integrations.ai ? '✅' : '—'} AI provider</p></div></section><section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200"><h2 className="text-lg font-semibold">Sync</h2><p className="mt-3 text-slate-500">Completed sessions and learning notes sync after confirmation. Local records remain available if a service is unavailable.</p><button onClick={() => void retryPending()} disabled={!pendingCount} className="mt-4 rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Retry pending sync</button><p className="mt-3 text-sm" role="status">{pendingCount ? `⏳ ${pendingCount} session${pendingCount === 1 ? '' : 's'} waiting to sync` : '✅ No sessions waiting to sync'}</p></section></main>;
}
