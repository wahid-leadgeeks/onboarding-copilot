'use client';

import { useEffect, useState } from 'react';
import {
  FEEDBACK_SESSIONS,
  FEEDBACK_STORAGE_KEY,
  calculateFeedbackProgress,
  clipboardBlockForFeedback,
  clipboardRowForFeedback,
  readFeedbackEntries,
  upsertFeedbackEntry,
  writeFeedbackEntries,
  type FeedbackEntry,
  type FeedbackSession,
} from '@/lib/feedback';
import { FeedbackDetailSheet } from '@/app/components/FeedbackDetailSheet';
import { useToast } from '@/app/components/Toast';
import { IconAlertTriangle, IconCheck, IconClipboard, IconRocket } from '@/app/components/Icons';

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [activeSession, setActiveSession] = useState<FeedbackSession | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
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
        toast.success(`Copied ${label} feedback TSV! Paste into cell A${match?.rowNumber ?? ''} of Feedback Sheet.`);
        setTimeout(() => setCopiedSessionId(null), 2500);
      }
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  }

  async function pushAllToSheets() {
    if (feedbackEntries.length === 0) {
      toast.info('No feedback evaluations to push.');
      return;
    }

    setIsPushing(true);
    setSyncError(null);

    try {
      const res = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'Feedback Sheet',
          entries: feedbackEntries,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || data?.authenticated === false) {
        setSyncError(
          'Google OAuth sign-in is required to push to Google Sheets. Sign in via Settings or click "Copy Full Grid (TSV)" to paste directly.'
        );
        toast.error('Google OAuth sign-in required. Use "Copy Full Grid (TSV)" or sign in.');
      } else if (res.ok && data?.success) {
        const count = data.updatedCount ?? feedbackEntries.length;
        const msg = `Successfully pushed ${count} evaluation${count === 1 ? '' : 's'} directly to Google Sheets!`;
        setSyncStatus(msg);
        toast.success(msg);
      } else {
        const msg = data?.error || data?.message || 'Failed to push evaluations to Google Sheets.';
        setSyncError(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error while pushing to Google Sheets.';
      setSyncError(msg);
      toast.error(msg);
    } finally {
      setIsPushing(false);
    }
  }

  async function handleCopyAllTsv() {
    const tsvBlock = clipboardBlockForFeedback(feedbackEntries);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsvBlock);
        setIsCopiedAll(true);
        toast.success('Copied all 14 rows TSV! Select cell A3 in Google Sheets and press Ctrl+V.');
        setTimeout(() => setIsCopiedAll(false), 3000);
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

  // Calculate previous/next session for the active drawer
  const currentIndex = activeSession
    ? FEEDBACK_SESSIONS.findIndex((s) => s.id === activeSession.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < FEEDBACK_SESSIONS.length - 1;
  const onPrevSession = hasPrev ? () => setActiveSession(FEEDBACK_SESSIONS[currentIndex - 1]) : undefined;
  const onNextSession = hasNext ? () => setActiveSession(FEEDBACK_SESSIONS[currentIndex + 1]) : undefined;

  const activeEntry = activeSession
    ? feedbackEntries.find(
        (e) => e.sessionId === activeSession.id || e.sessionId === `row-${activeSession.rowNumber}`
      )
    : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="animate-fade-up pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Worksheet: Feedback Sheet (Columns A–M)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Push to Sheets Action */}
            <button
              type="button"
              onClick={() => void pushAllToSheets()}
              disabled={isPushing || feedbackEntries.length === 0}
              aria-label="Push all saved evaluations to Google Sheets"
              className="inline-flex items-center gap-1.5 rounded-full bg-mint-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-mint-800 active:scale-95 disabled:opacity-50"
              title="Push all saved evaluations into your Google Sheet"
            >
              <IconRocket className={`size-3.5 ${isPushing ? 'animate-spin' : ''}`} />
              <span>{isPushing ? 'Pushing…' : `Push All to Sheets (${feedbackEntries.length})`}</span>
            </button>

            {/* Copy Full Grid TSV Fallback */}
            <button
              type="button"
              onClick={() => void handleCopyAllTsv()}
              aria-label="Copy all rows TSV for pasting into cell A3"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95"
              title="Copy entire Rows 3–16 block (paste starting at cell A3 in Google Sheets)"
            >
              {isCopiedAll ? (
                <>
                  <IconCheck className="size-3.5 text-mint-600" />
                  <span className="text-mint-700 font-bold">Copied All TSV!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="size-3.5 text-stone-500" />
                  <span>Copy Full Grid (TSV)</span>
                </>
              )}
            </button>

            {/* Pull from Sheets */}
            <button
              type="button"
              onClick={() => void syncWithSheets(false)}
              disabled={isSyncing}
              aria-label="Pull feedback from Google Sheets"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 disabled:opacity-60"
              title="Import feedback rows from Google Sheets into NOVA"
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
              <span>{isSyncing ? 'Pulling…' : 'Pull Sheet'}</span>
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
            Rate your onboarding sessions across 6 dimensions and capture qualitative follow-ups.
          </p>
        </div>

        {syncStatus && (
          <div className="animate-fade-up mt-3 flex items-center justify-between rounded-2xl border border-mint-200 bg-mint-50 px-4 py-3 text-xs text-mint-900">
            <div className="flex items-center gap-2">
              <IconCheck className="size-4 shrink-0 text-mint-600" />
              <span>{syncStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncStatus(null)}
              className="text-mint-700 hover:text-mint-900 font-bold ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {syncError && (
          <div className="animate-fade-up mt-3 rounded-2xl border border-peach-200 bg-peach-50 px-4 py-3 text-xs text-peach-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconAlertTriangle className="size-4 shrink-0 text-peach-600" />
                <span>{syncError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncError(null)}
                className="text-peach-700 hover:text-peach-900 font-bold ml-2 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-peach-200/60">
              <a
                href="/settings"
                className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1 text-xs font-semibold text-white hover:bg-stone-800 transition"
              >
                Connect Google in Settings →
              </a>
              <button
                type="button"
                onClick={() => void handleCopyAllTsv()}
                className="inline-flex items-center gap-1 rounded-lg border border-peach-300 bg-white px-3 py-1 text-xs font-semibold text-peach-900 hover:bg-peach-100 transition"
              >
                <IconClipboard className="size-3.5" />
                <span>Copy Full Grid (TSV) &amp; Paste into Cell A3</span>
              </button>
            </div>
          </div>
        )}

        {syncStatus && !syncError && (
          <div className="animate-fade-up mt-3 flex items-center gap-2 rounded-2xl border border-mint-200 bg-mint-50/70 px-4 py-2 text-xs font-medium text-mint-900">
            <IconCheck className="size-3.5 shrink-0 text-mint-600" />
            <span>{syncStatus}</span>
          </div>
        )}
      </header>

      {/* Minimal Pulse Bar & Filter Cockpit */}
      <section data-tour="feedback-sessions-list" className="animate-fade-up stagger-1 rounded-3xl bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {progress.evaluatedCount}{' '}
              <span className="font-normal text-stone-400 text-lg sm:text-xl">
                / {progress.totalCount}
              </span>
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                progress.isComplete
                  ? 'bg-mint-50 text-mint-700'
                  : 'bg-peach-50 text-peach-700'
              }`}
            >
              {progress.isComplete
                ? 'All evaluated! 🎉'
                : `${progress.remainingCount} pending evaluation`}
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="search"
              placeholder="Search session or PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 rounded-full bg-stone-100">
          <div
            className="bar-gradient progress-shimmer h-1.5 rounded-full transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
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

        {/* Clean 1-Line Session Rows */}
        <div className="mt-3 space-y-2">
          {filteredSessions.map(({ session, status, entry }) => {
            const isEvaluated = status === 'evaluated';
            const avgRating = entry
              ? (
                  (entry.ratings.communication +
                    entry.ratings.alignment +
                    entry.ratings.understanding +
                    entry.ratings.readiness +
                    entry.ratings.pace +
                    entry.ratings.overall) /
                  6
                ).toFixed(1)
              : null;

            return (
              <div
                key={session.id}
                onClick={() => setActiveSession(session)}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border p-3 sm:px-4 sm:py-2.5 cursor-pointer transition-all ${
                  isEvaluated
                    ? 'border-stone-100 bg-white/70 hover:border-stone-200 hover:bg-white'
                    : 'border-peach-200 bg-peach-50/30 hover:border-peach-300 hover:bg-peach-50/60 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status Indicator */}
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isEvaluated
                        ? 'bg-mint-100 text-mint-700'
                        : 'bg-peach-100 text-peach-700'
                    }`}
                  >
                    {isEvaluated ? (
                      <IconCheck className="h-3.5 w-3.5" />
                    ) : (
                      <span className="size-2 rounded-full bg-peach-500" />
                    )}
                  </span>

                  {/* Row Badge */}
                  <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-bold text-stone-700 shrink-0">
                    Row {session.rowNumber}
                  </span>

                  {/* Title */}
                  <h3 className="text-sm font-medium text-stone-900 truncate">
                    {session.title}
                  </h3>
                </div>

                {/* Right side: PIC chip + Rating / Evaluate action */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-9 sm:pl-0">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                    {session.pic}
                  </span>

                  {isEvaluated ? (
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-mint-50 border border-mint-200 px-2.5 py-0.5 text-xs font-bold text-mint-700">
                        ★ {avgRating}
                      </span>
                      <span className="text-xs font-medium text-stone-400 group-hover:text-stone-700 transition">
                        Details →
                      </span>
                    </div>
                  ) : (
                    <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white shadow-2xs group-hover:bg-stone-800 transition">
                      Evaluate
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredSessions.length === 0 && (
            <p className="py-8 text-center text-xs text-stone-400">
              No feedback sessions match your filter.
            </p>
          )}
        </div>
      </section>

      {/* Slide-over Feedback Detail & Inline Edit Drawer */}
      <FeedbackDetailSheet
        session={activeSession}
        existingEntry={activeEntry}
        isOpen={Boolean(activeSession)}
        onClose={() => setActiveSession(null)}
        onSave={handleSaveFeedback}
        onCopyRow={handleCopyRow}
        onPrevSession={onPrevSession}
        onNextSession={onNextSession}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isCopied={Boolean(activeSession && copiedSessionId === activeSession.id)}
      />
    </main>
  );
}
