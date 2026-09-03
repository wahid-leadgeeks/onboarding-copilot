'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import { pendingSyncStorageKey, readPendingSyncs, removePendingSync, writePendingSyncs } from '@/lib/sync-queue';
import { IMPORTED_SCHEDULE_STORAGE_KEY, readImportedSchedule, writeImportedSchedule, type ImportedSchedule } from '@/lib/imported-schedule';
import { isActivityList } from '@/lib/sheets/types';
import type { Activity } from '@/lib/types/activity';

type Health = { mode: string; integrations: { sheets: boolean; sheetsRead?: boolean; sheetsWrite?: boolean; diaryWrite?: boolean; oauth: boolean; ai: boolean } };

type ImportPreview = { activities: Activity[]; skipped: number; warnings: string[] };

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

function isImportPreview(value: unknown): value is ImportPreview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return isActivityList(record.activities)
    && typeof record.skipped === 'number'
    && Array.isArray(record.warnings)
    && record.warnings.every((warning) => typeof warning === 'string');
}

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [healthError, setHealthError] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [imported, setImported] = useState<ImportedSchedule | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  async function retryPending() { const pending = readPendingSyncs(localStorage.getItem(pendingSyncStorageKey())); const results = await Promise.all(pending.map(async (item) => { const response = await fetch('/api/session/retry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) }).catch(() => null); const value = response?.ok ? await response.json().catch(() => null) as { synced?: boolean } : null; return value?.synced ? item : null; })); const synced = results.filter((item): item is typeof pending[number] => item !== null); const remaining = synced.reduce((items, item) => removePendingSync(items, item), pending); writePendingSyncs(localStorage, remaining); setPendingCount(remaining.length); setSyncMessage(synced.length ? `${synced.length} session${synced.length === 1 ? '' : 's'} synced` : pending.length ? 'No pending sessions could be synced yet' : 'No sessions are waiting to sync'); }
  async function refreshHealth() {
    const response = await fetch('/api/health', { cache: 'no-store' }).catch(() => null);
    if (!response?.ok) { setHealthError(true); return; }
    const value: unknown = await response.json();
    if (isHealth(value)) { setHealth(value); setHealthError(false); } else setHealthError(true);
  }
  async function importSchedule(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    setParsing(true);
    setImportError('');
    setImportMessage('');
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/import', { method: 'POST', body }).catch(() => null);
    setParsing(false);
    if (!response?.ok) {
      const value: unknown = await response?.json().catch(() => null);
      const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
      setImportError(record && typeof record.error === 'string' ? record.error : 'Import failed. The file could not be read.');
      return;
    }
    const value: unknown = await response.json().catch(() => null);
    if (!isImportPreview(value)) { setImportError('The file could not be understood. Check the format and try again.'); return; }
    setPreview(value);
  }
  function confirmImport() {
    if (!preview) return;
    const schedule: ImportedSchedule = { activities: preview.activities, importedAt: new Date().toISOString() };
    localStorage.setItem(IMPORTED_SCHEDULE_STORAGE_KEY, writeImportedSchedule(schedule));
    setImported(schedule);
    setImportMessage(`Schedule imported · ${schedule.activities.length} activities`);
    setPreview(null);
  }
  function discardImport() {
    setPreview(null);
    setImportMessage('');
  }
  function removeImported() {
    localStorage.removeItem(IMPORTED_SCHEDULE_STORAGE_KEY);
    setImported(null);
    setImportMessage('Imported schedule removed. Using the default schedule.');
  }
  useEffect(() => { void refreshHealth(); setPendingCount(readPendingSyncs(localStorage.getItem(pendingSyncStorageKey())).length); setImported(readImportedSchedule(localStorage.getItem(IMPORTED_SCHEDULE_STORAGE_KEY))); }, []);
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8"><PrimaryNav active="Settings" />
    <header className="animate-fade-up pb-8"><p className="text-sm font-medium text-stone-500">Preferences</p><h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">Settings</h1><p className="mt-3 text-lg text-stone-600">Your app, your way.</p></header>
    <section className="animate-fade-up stagger-1 mt-10 rounded-card bg-white p-6 shadow-soft sm:p-8"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-sky-300" />Connection</h2><button onClick={() => void refreshHealth()} className="min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">Refresh</button></div><p className="mt-3 text-stone-500">{healthError && <span className="text-peach-700">Health check unavailable · </span>}Mode: <span className="font-medium text-stone-700">{health?.mode ?? 'Checking…'}</span></p><div className="mt-4 space-y-2 text-sm"><p><span className={`inline-block w-4 text-center ${health?.integrations.oauth ? 'text-mint-600' : 'text-stone-300'}`} aria-hidden="true">{health?.integrations.oauth ? '●' : '○'}</span> Google sign-in</p><p><span className={`inline-block w-4 text-center ${health?.integrations.sheets ? 'text-mint-600' : 'text-stone-300'}`} aria-hidden="true">{health?.integrations.sheets ? '●' : '○'}</span> Google Sheets sync</p>{health && !health.integrations.sheets && (health.integrations.sheetsRead || health.integrations.sheetsWrite) && <p className="text-peach-700">⚠️ Sheets is partially configured</p>}<p><span className={`inline-block w-4 text-center ${health?.integrations.ai ? 'text-mint-600' : 'text-stone-300'}`} aria-hidden="true">{health?.integrations.ai ? '●' : '○'}</span> AI provider</p></div></section>
    <section className="animate-fade-up stagger-2 mt-6 rounded-card bg-white p-6 shadow-soft sm:p-8"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-sky-300" />Schedule</h2><p className="mt-3 text-stone-500">Import your onboarding schedule from an Excel or Google Sheets export (.xlsx, .csv, or .tsv). The file is parsed here and kept on this device — nothing is uploaded elsewhere.</p>
      {imported ? <div><p className="mt-4 text-stone-700">Imported schedule · {imported.activities.length} activities · {new Date(imported.importedAt).toLocaleString()}</p><button onClick={removeImported} className="mt-4 min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">Remove imported schedule</button></div>
        : preview ? <div className="animate-pop-in mt-4 rounded-2xl bg-sun-50 p-5"><p className="font-medium text-sun-700">Ready to import ✨</p><p className="mt-1 text-sm text-stone-700">{preview.activities.length} activities{preview.skipped > 0 ? `, ${preview.skipped} skipped` : ''}</p>{preview.skipped > 0 && preview.warnings.length > 0 && <ul className="mt-2 space-y-1 text-xs text-peach-700">{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}<ul className="mt-3 space-y-1">{preview.activities.slice(0, 5).map((activity, index) => <li key={`${activity.id}-${index}`} className="text-sm text-stone-700">{activity.name} — {activity.plannedStart}–{activity.plannedEnd}</li>)}</ul><div className="mt-4 flex flex-wrap gap-3"><button onClick={confirmImport} className="min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700">Use this schedule</button><button onClick={discardImport} className="min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white">Discard</button></div></div>
        : <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700">{parsing ? 'Reading file…' : 'Choose file'}<input type="file" accept=".xlsx,.csv,.tsv" disabled={parsing} onChange={event => void importSchedule(event)} style={{ display: 'none' }} /></label>}
      {importError && <p className="animate-pop-in mt-3 text-sm text-peach-700" role="alert">{importError}</p>}
      {importMessage && <p className="mt-3 text-sm text-stone-600" role="status">{importMessage}</p>}
    </section>
    <section className="animate-fade-up stagger-3 mt-6 rounded-card bg-white p-6 shadow-soft sm:p-8"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-mint-300" />Sync</h2><p className="mt-3 text-stone-500">Completed sessions and learning notes sync after confirmation. Local records remain available if a service is unavailable.</p><button onClick={() => void retryPending()} disabled={!pendingCount} className="mt-4 min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40 disabled:hover:transform-none">Retry pending sync</button><p className="mt-3 text-sm text-stone-600" role="status">{pendingCount ? <span className="text-peach-700">⏳ {pendingCount} session{pendingCount === 1 ? '' : 's'} waiting to sync</span> : <span className="text-mint-700">✅ No sessions waiting to sync</span>}</p></section>
    <section className="animate-fade-up stagger-4 mt-6 rounded-card bg-white p-6 shadow-soft sm:p-8"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-lavender-300" />Guide tour</h2><p className="mt-3 text-stone-500">New to the cockpit? Take a short walkthrough of Today, the timeline, quick notes, and more.</p><a href="/?tour=start" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">Take the tour again</a></section></main>;
}
