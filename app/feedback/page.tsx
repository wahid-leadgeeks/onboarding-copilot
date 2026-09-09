'use client';

import { useEffect, useState } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import {
  FEEDBACK_SESSIONS,
  FEEDBACK_STORAGE_KEY,
  calculateFeedbackProgress,
  clipboardRowForFeedback,
  readFeedbackEntries,
  upsertFeedbackEntry,
  writeFeedbackEntries,
  type FeedbackEntry,
  type FeedbackSession,
} from '@/lib/feedback';
import { FeedbackModal } from '@/app/components/FeedbackModal';
import { useToast } from '@/app/components/Toast';
import { IconAlertTriangle, IconCheck, IconClipboard } from '@/app/components/Icons';

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [activeSession, setActiveSession] = useState<FeedbackSession | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function syncWithSheets(silent = false) {
    setIsSyncing(true);
    if (!silent) setSyncError(null);
    try {
      let res = await fetch('/api/sheets/extract', { cache: 'no-store' });
      let data = await res.json().catch(() => null);

      // If remote sheets requires auth and local test file is available, fallback for local testing
      if (!res.ok || !data?.success) {
        const localRes = await fetch('/api/sheets/extract?source=local', { cache: 'no-store' });
        if (localRes.ok) {
          const localData = await localRes.json().catch(() => null);
          if (localData?.success) {
            res = localRes;
            data = localData;
          }
        }
      }

      if (data?.success && data?.data?.feedback) {
        const extractedEntries: FeedbackEntry[] = data.data.feedback.entries || [];
        if (extractedEntries.length > 0) {
          setFeedbackEntries((prev) => {
            let merged = [...prev];
            for (const item of extractedEntries) {
              merged = upsertFeedbackEntry(merged, item);
            }
            try {
              localStorage.setItem(FEEDBACK_STORAGE_KEY, writeFeedbackEntries(merged));
            } catch {
              /* ignore */
            }
            return merged;
          });
          const msg = `Synced ${extractedEntries.length} evaluation${extractedEntries.length === 1 ? '' : 's'} from spreadsheet!`;
          setSyncStatus(msg);
          if (!silent) toast.success(msg);
        } else {
          setSyncStatus('Connected to spreadsheet (no evaluated rows found yet).');
          if (!silent) toast.info('No evaluated feedback rows found in spreadsheet.');
        }
      } else if (!silent) {
        if (data?.loginUrl || res.status === 401) {
          setSyncError('Google OAuth required to sync live Google Sheets. Please sign in on Settings.');
        } else {
          setSyncError(data?.error || data?.message || 'Failed to sync with spreadsheet.');
        }
      }
    } catch (err: unknown) {
      if (!silent) {
        setSyncError(err instanceof Error ? err.message : 'Failed to connect to spreadsheet.');
      }
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    try {
      setFeedbackEntries(readFeedbackEntries(localStorage.getItem(FEEDBACK_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
    void syncWithSheets(true);
  }, []);

  function persist(next: FeedbackEntry[]) {
    setFeedbackEntries(next);
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, writeFeedbackEntries(next));
    } catch {
      /* ignore */
    }
  }

  function handleSaveFeedback(entry: FeedbackEntry) {
    const next = upsertFeedbackEntry(feedbackEntries, entry);
    persist(next);
    setActiveSession(null);
    const match = FEEDBACK_SESSIONS.find((s) => s.id === entry.sessionId);
    const label = match ? `Row ${match.rowNumber} (${entry.sessionTitle})` : entry.sessionTitle;
    toast.success(`Feedback for ${label} saved!`);
  }

  async function handleCopyRow(entry: FeedbackEntry) {
    const row = clipboardRowForFeedback(entry);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedSessionId(entry.sessionId);
        const match = FEEDBACK_SESSIONS.find((s) => s.id === entry.sessionId);
        const label = match ? `Row ${match.rowNumber}` : entry.sessionTitle;
        toast.success(`Copied ${label} feedback TSV! Paste into Google Sheets.`);
        setTimeout(() => setCopiedSessionId(null), 2500);
      }
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  }

  const progress = calculateFeedbackProgress(feedbackEntries);

  const filteredSessions = FEEDBACK_SESSIONS.map((session) => ({
    session,
    status: feedbackEntries.some((e) => e.sessionId === session.id) ? 'evaluated' : 'pending',
    entry: feedbackEntries.find((e) => e.sessionId === session.id),
  })).filter(({ session, status }) => {
    if (statusFilter === 'pending' && status !== 'pending') return false;
    if (statusFilter === 'evaluated' && status !== 'evaluated') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = session.title.toLowerCase().includes(q);
      const matchPic = session.pic.toLowerCase().includes(q);
      const matchRow = `row ${session.rowNumber}`.includes(q);
      if (!matchTitle && !matchPic && !matchRow) return false;
    }
    return true;
  });

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Feedback" />

      {/* Header */}
      <header className="animate-fade-up pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-stone-500">Sheet: Feedback Sheet · Session Ratings</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void syncWithSheets(false)}
              disabled={isSyncing}
              aria-label="Sync feedback from Google Sheets"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 disabled:opacity-60"
            >
              <svg
                className={`size-3.5 ${isSyncing ? 'animate-spin text-stone-900' : 'text-stone-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>
            <span className="rounded-full bg-sun-50 px-3 py-1 text-xs font-semibold text-sun-800">
              {progress.evaluatedCount} / {progress.totalCount} Evaluated
            </span>
          </div>
        </div>
        <div className="mt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Feedback &amp; Evaluation
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Rate your onboarding sessions across 6 dimensions (Cols D–I) and capture qualitative follow-ups.
          </p>
        </div>

        {syncError && (
          <div className="animate-fade-up mt-3 flex items-center justify-between rounded-2xl border border-peach-200 bg-peach-50 px-4 py-3 text-xs text-peach-900">
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="size-4 shrink-0 text-peach-600" />
              <span>{syncError}</span>
            </div>
            <a
              href="/settings"
              className="shrink-0 font-semibold underline hover:text-peach-700 ml-2"
            >
              Open Settings
            </a>
          </div>
        )}

        {syncStatus && !syncError && (
          <div className="animate-fade-up mt-3 flex items-center gap-2 rounded-2xl border border-mint-200 bg-mint-50/70 px-4 py-2 text-xs font-medium text-mint-900">
            <IconCheck className="size-3.5 shrink-0 text-mint-600" />
            <span>{syncStatus}</span>
          </div>
        )}
      </header>

      {/* Single-View Feedback Cockpit Card */}
      <section className="animate-fade-up stagger-1 rounded-3xl bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-3xl font-semibold text-stone-900 sm:text-4xl">
              {progress.evaluatedCount} <span className="font-normal text-stone-400 text-xl sm:text-2xl">/ {progress.totalCount}</span>
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                progress.isComplete
                  ? 'bg-mint-50 text-mint-700'
                  : 'bg-peach-50 text-peach-700'
              }`}
            >
              {progress.isComplete
                ? `All ${progress.totalCount} evaluated!`
                : `${progress.remainingCount} pending evaluation`}
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="search"
              placeholder="Search session, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 rounded-full bg-stone-100">
          <div
            className="bar-gradient progress-shimmer h-2 rounded-full transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-5 flex flex-wrap gap-1.5 border-b border-stone-100 pb-4">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All ({progress.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === 'pending'
                ? 'bg-peach-500 text-white shadow-xs'
                : progress.remainingCount > 0
                  ? 'bg-peach-50 text-peach-800 font-semibold hover:bg-peach-100'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Pending ({progress.remainingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('evaluated')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === 'evaluated'
                ? 'bg-mint-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Evaluated ({progress.evaluatedCount})
          </button>
        </div>

        {/* Sessions List */}
        <ul className="mt-3 divide-y divide-stone-100" role="list">
          {filteredSessions.map(({ session, status, entry }) => {
            const isEvaluated = status === 'evaluated';
            const isCopied = copiedSessionId === session.id;

            return (
              <li
                key={session.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isEvaluated
                        ? 'bg-mint-100 text-mint-700'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {isEvaluated ? <IconCheck className="h-3.5 w-3.5" /> : <span className="size-1.5 rounded-full bg-stone-300" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-stone-900 sm:text-base leading-snug">
                        {session.title}
                      </h3>
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
                        Row {session.rowNumber}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">
                      PIC: {session.pic} {session.department && `· ${session.department}`}
                    </p>
                    {entry && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span>
                          Evaluated on {entry.date} · Overall rating:{' '}
                          <span className="font-semibold text-mint-700">{entry.ratings.overall}/6</span>
                        </span>
                        {entry.questionAddressing && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                              entry.questionAddressing === 'Chat response is fine'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : entry.questionAddressing === "I don't have any questions today"
                                  ? 'bg-purple-50 text-purple-900 border-purple-200'
                                  : entry.questionAddressing.includes('meeting')
                                    ? 'bg-sky-50 text-sky-900 border-sky-200'
                                    : 'bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {entry.questionAddressing}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isEvaluated && entry && (
                    <button
                      type="button"
                      onClick={() => handleCopyRow(entry)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95"
                    >
                      {isCopied ? (
                        <>
                          <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <IconClipboard className="h-3.5 w-3.5" />
                          <span>Copy TSV</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSession(session)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      isEvaluated
                        ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    {isEvaluated ? 'Edit' : 'Evaluate'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {filteredSessions.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-400">
            No feedback sessions match your search or filter.
          </p>
        )}
      </section>

      {/* Feedback Modal */}
      {activeSession && (
        <FeedbackModal
          session={activeSession}
          existingEntry={feedbackEntries.find(
            (e) => e.sessionId === activeSession.id || e.sessionId === `row-${activeSession.rowNumber}`
          )}
          onSave={handleSaveFeedback}
          onClose={() => setActiveSession(null)}
        />
      )}
    </main>
  );
}
