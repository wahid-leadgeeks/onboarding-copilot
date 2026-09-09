'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { pendingSyncStorageKey, readPendingSyncs, removePendingSync, writePendingSyncs } from '@/lib/sync-queue';
import { IMPORTED_SCHEDULE_STORAGE_KEY, readImportedSchedule, writeImportedSchedule, type ImportedSchedule } from '@/lib/imported-schedule';
import { DIARY_STORAGE_KEY, mergeImportedDiary, readDiary, type StoredDiary } from '@/lib/local-records';
import { FEEDBACK_STORAGE_KEY, readFeedbackEntries, upsertFeedbackEntry, writeFeedbackEntries } from '@/lib/feedback';
import { isActivityList } from '@/lib/sheets/types';
import type { Activity } from '@/lib/types/activity';
import type { ExtractedSpreadsheetContent } from '@/lib/sheets/extractor';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconExternalLink,
} from '@/app/components/Icons';

type Health = {
  mode: string;
  spreadsheetId?: string | null;
  integrations: {
    sheets: boolean;
    sheetsRead?: boolean;
    sheetsWrite?: boolean;
    diaryWrite?: boolean;
    oauth: boolean;
    ai: boolean;
  };
};

type ImportPreview = { activities: Activity[]; skipped: number; warnings: string[]; diary?: StoredDiary[] };

function isHealth(value: unknown): value is Health {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const integrations = record.integrations;
  if (!integrations || typeof integrations !== 'object') return false;
  const flags = integrations as Record<string, unknown>;
  return typeof record.mode === 'string' && typeof flags.sheets === 'boolean' && typeof flags.oauth === 'boolean' && typeof flags.ai === 'boolean'
    && (flags.sheetsRead === undefined || typeof flags.sheetsRead === 'boolean')
    && (flags.sheetsWrite === undefined || typeof flags.sheetsWrite === 'boolean')
    && (record.spreadsheetId === undefined || record.spreadsheetId === null || typeof record.spreadsheetId === 'string');
}

function isImportPreview(value: unknown): value is ImportPreview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return isActivityList(record.activities)
    && typeof record.skipped === 'number'
    && Array.isArray(record.warnings)
    && record.warnings.every((warning) => typeof warning === 'string')
    && (record.diary === undefined || Array.isArray(record.diary));
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
  const [session, setSession] = useState<{ authenticated: boolean; user: { name: string; email: string; picture?: string } | null } | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractedSpreadsheetContent | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  async function handleExtractSheets(source?: 'local') {
    setExtracting(true);
    setExtractError(null);
    try {
      const url = `/api/sheets/extract${source ? '?source=' + source : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setExtractError(data.message || data.error || 'Failed to extract content from Google Sheets');
        setExtractResult(null);
      } else {
        setExtractResult(data.data);
        setExtractError(null);
      }
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Network error during extraction');
    } finally {
      setExtracting(false);
    }
  }

  function applyExtractedSchedule() {
    if (!extractResult?.schedule?.activities?.length) return;
    const activities = extractResult.schedule.activities;
    writeImportedSchedule({
      activities,
      importedAt: new Date().toISOString(),
    });
    setImported({
      activities,
      importedAt: new Date().toISOString(),
    });
    if (extractResult.diary?.entries?.length) {
      const existingDiary = readDiary(localStorage.getItem(DIARY_STORAGE_KEY));
      const merged = mergeImportedDiary(existingDiary, extractResult.diary.entries);
      localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(merged));
    }
    if (extractResult.feedback?.entries?.length) {
      const existingFeedback = readFeedbackEntries(localStorage.getItem(FEEDBACK_STORAGE_KEY));
      let mergedFeedback = [...existingFeedback];
      for (const item of extractResult.feedback.entries) {
        mergedFeedback = upsertFeedbackEntry(mergedFeedback, item);
      }
      localStorage.setItem(FEEDBACK_STORAGE_KEY, writeFeedbackEntries(mergedFeedback));
    }
    setImportMessage(
      `Applied ${activities.length} activities, ${extractResult.diary?.entries?.length || 0} diary notes, and ${extractResult.feedback?.entries?.length || 0} feedback evaluations!`
    );
  }

  async function refreshSession() {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { authenticated: boolean; user: { name: string; email: string; picture?: string } | null };
        setSession(data);
      }
    } catch {
      /* ignore session fetch error */
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession({ authenticated: false, user: null });
      setAuthNotice('Signed out successfully.');
      void refreshHealth();
    } catch {
      /* ignore logout error */
    }
  }

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
    let diaryMsg = '';
    if (preview.diary && preview.diary.length > 0) {
      const existingDiary = readDiary(localStorage.getItem(DIARY_STORAGE_KEY));
      const merged = mergeImportedDiary(existingDiary, preview.diary);
      const importedCount = merged.length - existingDiary.length;
      localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(merged));
      diaryMsg = ` and ${importedCount} diary note${importedCount === 1 ? '' : 's'}`;
    }
    setImported(schedule);
    setImportMessage(`Schedule imported · ${schedule.activities.length} activities${diaryMsg}`);
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
  useEffect(() => {
    void refreshHealth();
    void refreshSession();
    setPendingCount(readPendingSyncs(localStorage.getItem(pendingSyncStorageKey())).length);
    setImported(readImportedSchedule(localStorage.getItem(IMPORTED_SCHEDULE_STORAGE_KEY)));

    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      setAuthNotice('Connected to Google successfully!');
      window.history.replaceState(null, '', '/settings');
    } else if (params.get('error')) {
      const err = params.get('error');
      setAuthNotice(err === 'access_denied' ? 'Sign in was cancelled.' : `Google authentication failed (${err}).`);
      window.history.replaceState(null, '', '/settings');
    }
  }, []);

  useEffect(() => {
    if (session?.authenticated && !extractResult && !extracting && !extractError) {
      void handleExtractSheets();
    }
  }, [session?.authenticated, extractResult, extracting, extractError]);

  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
    <header className="animate-fade-up pb-8"><p className="text-sm font-medium text-stone-500">Preferences</p><h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">Settings</h1><p className="mt-3 text-lg text-stone-600">Your app, your way.</p></header>
    <section className="animate-fade-up stagger-1 mt-10 rounded-card bg-white p-6 shadow-soft sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          <span aria-hidden="true" className="inline-block size-2 rounded-full bg-sky-300" />
          Connection
        </h2>
        <button
          onClick={() => {
            void refreshHealth();
            void refreshSession();
          }}
          className="min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Refresh
        </button>
      </div>

      {authNotice && (
        <p className="mt-3 rounded-xl bg-sun-50 p-3 text-sm text-stone-700" role="status">
          {authNotice}
        </p>
      )}

      {session?.authenticated && session.user ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mint-50/80 p-4 ring-1 ring-mint-200">
          <div className="flex items-center gap-3 min-w-0">
            {session.user.picture ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={session.user.picture}
                alt={session.user.name}
                className="size-10 shrink-0 rounded-full border border-mint-200"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-200 font-semibold text-mint-800">
                {session.user.name?.[0] || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-stone-900 truncate">{session.user.name}</p>
              <p className="text-xs text-stone-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Sign out
          </button>
        </div>
      ) : (
        health?.integrations.oauth && (
          <div className="mt-4">
            <a
              href="/api/auth/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 active:scale-95"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
              </svg>
              Sign in with Google
            </a>
          </div>
        )
      )}

      <p className="mt-4 text-stone-500">
        {healthError && <span className="text-peach-700">Health check unavailable · </span>}
        Mode: <span className="font-medium text-stone-700">{health?.mode ?? 'Checking…'}</span>
      </p>
      <div className="mt-4 space-y-2.5 text-sm">
        <p className="flex items-center gap-2.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${session?.authenticated ? 'bg-mint-600' : health?.integrations.oauth ? 'bg-amber-500' : 'border border-stone-300 bg-stone-100'}`}
            aria-hidden="true"
          />
          <span>Google sign-in {session?.authenticated ? '(Connected)' : health?.integrations.oauth ? '(Configured)' : '(Not configured)'}</span>
        </p>
        <p className="flex items-center gap-2.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${health?.integrations.sheets ? 'bg-mint-600' : 'border border-stone-300 bg-stone-100'}`}
            aria-hidden="true"
          />
          <span>Google Sheets sync</span>
        </p>
        {health && !health.integrations.sheets && (health.integrations.sheetsRead || health.integrations.sheetsWrite) && (
          <p className="inline-flex items-center gap-1.5 text-peach-700">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            <span>Sheets is partially configured</span>
          </p>
        )}
        <p className="flex items-center gap-2.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${health?.integrations.ai ? 'bg-mint-600' : 'border border-stone-300 bg-stone-100'}`}
            aria-hidden="true"
          />
          <span>AI provider</span>
        </p>
      </div>

      {health?.spreadsheetId && (
        <div className="mt-5 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-stone-700">Connected Spreadsheet:</span>
              <p className="font-mono text-[11px] text-stone-500 truncate max-w-xs">{health.spreadsheetId}</p>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${health.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 shadow-xs transition hover:bg-sky-50"
            >
              <span>Open Sheet</span>
              <IconExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={extracting}
              onClick={() => void handleExtractSheets()}
              className="min-h-9 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
            >
              {extracting ? 'Extracting…' : 'Extract from Google Sheets'}
            </button>
            <button
              type="button"
              disabled={extracting}
              onClick={() => void handleExtractSheets('local')}
              className="min-h-9 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              Test with local workbook
            </button>
          </div>

          {extractError && (
            <p className="mt-3 rounded-xl bg-peach-50 p-2.5 text-xs text-peach-700" role="alert">
              {extractError}
            </p>
          )}

          {extractResult && (
            <div className="mt-4 rounded-xl border border-mint-200 bg-mint-50/80 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 font-semibold text-mint-950">
                  <IconCheck className="h-4 w-4 text-mint-700 shrink-0" />
                  <span>Extracted all content from {extractResult.title || 'United Spreadsheet'}</span>
                </p>
                {extractResult.schedule?.activities && (
                  <button
                    type="button"
                    onClick={applyExtractedSchedule}
                    className="rounded-full bg-mint-700 px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-mint-800"
                  >
                    Apply Schedule to NOVA
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded-lg border border-mint-100 bg-white p-2.5">
                  <span className="block text-lg font-bold text-stone-900">{extractResult.schedule?.count ?? 0}</span>
                  <span className="text-[11px] font-medium text-stone-500">Activities</span>
                </div>
                <div className="rounded-lg border border-mint-100 bg-white p-2.5">
                  <span className="block text-lg font-bold text-stone-900">{extractResult.diary?.count ?? 0}</span>
                  <span className="text-[11px] font-medium text-stone-500">Diary Notes</span>
                </div>
                <div className="rounded-lg border border-mint-100 bg-white p-2.5">
                  <span className="block text-lg font-bold text-stone-900">{extractResult.timeline?.count ?? 0}</span>
                  <span className="text-[11px] font-medium text-stone-500">Timeline Stages</span>
                </div>
                <div className="rounded-lg border border-mint-100 bg-white p-2.5">
                  <span className="block text-lg font-bold text-stone-900">{extractResult.feedback?.count ?? 0}</span>
                  <span className="text-[11px] font-medium text-stone-500">Feedback Sessions</span>
                </div>
              </div>

              {extractResult.sheets && extractResult.sheets.length > 0 && (
                <div className="border-t border-mint-200/60 pt-2 text-[11px] text-stone-600">
                  <span className="font-medium text-stone-700">Detected worksheets:</span>{' '}
                  {extractResult.sheets.map((s: { title: string; rowCount: number; columnCount: number }, idx: number) => (
                    <span key={s.title}>
                      {idx > 0 && ' · '}
                      <span className="font-semibold text-stone-800">{s.title}</span> ({s.rowCount} rows)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
    <section className="animate-fade-up stagger-2 mt-6 rounded-card bg-white p-6 shadow-soft sm:p-8"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-sky-300" />Schedule</h2><p className="mt-3 text-stone-500">Import your onboarding schedule from an Excel or Google Sheets export (.xlsx, .csv, or .tsv). The file is parsed here and kept on this device — nothing is uploaded elsewhere.</p>
      {imported ? <div><p className="mt-4 text-stone-700">Imported schedule · {imported.activities.length} activities · {new Date(imported.importedAt).toLocaleString()}</p><button onClick={removeImported} className="mt-4 min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">Remove imported schedule</button></div>
        : preview ? <div className="animate-pop-in mt-4 rounded-2xl bg-sun-50 p-5"><p className="font-medium text-sun-800">Ready to import</p><p className="mt-1 text-sm text-stone-700">{preview.activities.length} activities{preview.skipped > 0 ? `, ${preview.skipped} skipped` : ''}{preview.diary && preview.diary.length > 0 ? ` · ${preview.diary.length} diary notes` : ''}</p>{preview.skipped > 0 && preview.warnings.length > 0 && <ul className="mt-2 space-y-1 text-xs text-peach-700">{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}<ul className="mt-3 space-y-1">{preview.activities.slice(0, 5).map((activity, index) => <li key={`${activity.id}-${index}`} className="text-sm text-stone-700">{activity.name} — {activity.plannedStart === 'TBD' ? 'Flexible / TBD' : `${activity.plannedStart}–${activity.plannedEnd}`}</li>)}</ul><div className="mt-4 flex flex-wrap gap-3"><button onClick={confirmImport} className="min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700">Use this schedule</button><button onClick={discardImport} className="min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white">Discard</button></div></div>
        : <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700">{parsing ? 'Reading file…' : 'Choose file'}<input type="file" accept=".xlsx,.csv,.tsv" disabled={parsing} onChange={event => void importSchedule(event)} style={{ display: 'none' }} /></label>}
      {importError && <p className="animate-pop-in mt-3 text-sm text-peach-700" role="alert">{importError}</p>}
      {importMessage && <p className="mt-3 text-sm text-stone-600" role="status">{importMessage}</p>}
    </section>
    <section className="animate-fade-up stagger-3 mt-6 rounded-card bg-white p-6 shadow-soft sm:p-8"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-mint-300" />Sync</h2><p className="mt-3 text-stone-500">Completed sessions and learning notes sync after confirmation. Local records remain available if a service is unavailable.</p><button onClick={() => void retryPending()} disabled={!pendingCount} className="mt-4 min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40 disabled:hover:transform-none">Retry pending sync</button><p className="mt-3 text-sm text-stone-600" role="status">{pendingCount ? <span className="inline-flex items-center gap-1.5 text-peach-700"><IconClock className="h-4 w-4 shrink-0" /> {pendingCount} session{pendingCount === 1 ? '' : 's'} waiting to sync</span> : <span className="inline-flex items-center gap-1.5 text-mint-700"><IconCheck className="h-4 w-4 shrink-0" /> No sessions waiting to sync</span>}</p></section>
    <section className="animate-fade-up stagger-4 mt-6 rounded-card bg-white p-6 shadow-soft sm:p-8"><h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><span aria-hidden="true" className="inline-block size-2 rounded-full bg-lavender-300" />Guide tour</h2><p className="mt-3 text-stone-500">New to the cockpit? Take a short walkthrough of Today, the timeline, quick notes, and more.</p><a href="/?tour=start" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">Take the tour again</a></section></main>;
}
