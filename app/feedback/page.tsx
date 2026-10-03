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
import { isHealthSnapshot, markSynced, notifySyncChanged, type HealthSnapshot } from '@/lib/sync-status';
import { shouldShowPullNotice } from '@/lib/connection-status';
import { FeedbackDetailSheet } from '@/app/components/FeedbackDetailSheet';
import { RowTag } from '@/app/components/RowTag';
import { SheetToolsMenu, type SheetToolsMenuItem } from '@/app/components/SheetToolsMenu';
import { useToast } from '@/app/components/Toast';
import { IconAlertTriangle, IconCheck, IconX } from '@/app/components/Icons';

const FEEDBACK_SHEET_NAME = 'Feedback Sheet';
const FIRST_ROW = Math.min(...FEEDBACK_SESSIONS.map((s) => s.rowNumber));
const LAST_ROW = Math.max(...FEEDBACK_SESSIONS.map((s) => s.rowNumber));

type SheetFailure = { message: string; needsAuth: boolean };

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [activeSession, setActiveSession] = useState<FeedbackSession | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pullFailure, setPullFailure] = useState<SheetFailure | null>(null);
  const [pushFailure, setPushFailure] = useState<SheetFailure | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);

  async function pullFromSheet(silent = false) {
    setIsPulling(true);
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
        setPullFailure(null);
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
          const msg = `Loaded ${extractedEntries.length} evaluation${extractedEntries.length === 1 ? '' : 's'} from the sheet.`;
          setStatusMessage(msg);
          if (!silent) toast.success(msg);
        } else if (!silent) {
          toast.info('No evaluations in the sheet yet.');
        }
      } else {
        // Recorded even for the silent first pull; the notice decides whether it is worth showing.
        const needsAuth = Boolean(data?.loginUrl) || res.status === 401;
        setPullFailure({
          message: String(data?.error || data?.message || 'The sheet did not answer.'),
          needsAuth,
        });
      }
    } catch (err: unknown) {
      setPullFailure({ message: err instanceof Error ? err.message : 'Could not reach the server.', needsAuth: false });
    } finally {
      setIsPulling(false);
    }
  }

  useEffect(() => {
    try {
      setFeedbackEntries(readFeedbackEntries(localStorage.getItem(FEEDBACK_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
    fetch('/api/health', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((value: unknown) => {
        if (isHealthSnapshot(value)) setHealth(value);
        else setHealthFailed(true);
      })
      .catch(() => setHealthFailed(true));
    void pullFromSheet(true);
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
    toast.success(`Saved your feedback for “${entry.sessionTitle}”.`);
  }

  async function handleCopyRow(entry: FeedbackEntry) {
    const row = clipboardRowForFeedback(entry);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedSessionId(entry.sessionId);
        toast.success('Copied. Paste it into the spreadsheet.');
        setTimeout(() => setCopiedSessionId(null), 2500);
      }
    } catch {
      toast.error('Could not access the clipboard.');
    }
  }

  async function pushAllToSheets() {
    if (feedbackEntries.length === 0) {
      toast.info('There are no saved evaluations to send yet.');
      return;
    }

    setIsPushing(true);
    setPushFailure(null);

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
        setPushFailure({ message: 'Sign in with Google in Settings to send evaluations to the sheet.', needsAuth: true });
        toast.error('Sign in with Google to send evaluations to the sheet.');
      } else if (res.ok && data?.success) {
        markSynced(safeLocalStorage());
        notifySyncChanged();
        const count = data.updatedCount ?? feedbackEntries.length;
        const msg = `Sent ${count} evaluation${count === 1 ? '' : 's'} to the sheet.`;
        setStatusMessage(msg);
        toast.success(msg);
      } else {
        const msg = String(data?.error || data?.message || 'The sheet did not accept the update.');
        setPushFailure({ message: msg, needsAuth: false });
        toast.error('Couldn’t send your evaluations to the sheet.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not reach the server.';
      setPushFailure({ message: msg, needsAuth: false });
      toast.error('Couldn’t send your evaluations to the sheet.');
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
        toast.success('Copied all evaluations. Paste them into the spreadsheet.');
        setTimeout(() => setIsCopiedAll(false), 3000);
      }
    } catch {
      toast.error('Could not access the clipboard.');
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
      const matchRow = `row ${session.rowNumber}`.includes(q) || `#${session.rowNumber}` === q;
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

  // One notice at a time: a failed send (user action) wins over a failed background pull.
  const showPull = shouldShowPullNotice({ error: pullFailure?.message ?? null, health, healthFailed });
  const notice = pushFailure
    ? { kind: 'push' as const, title: 'Couldn’t send your evaluations to the sheet.', ...pushFailure }
    : showPull && pullFailure
      ? { kind: 'pull' as const, title: 'Couldn’t pull evaluations from the sheet.', ...pullFailure }
      : null;

  const toolItems: SheetToolsMenuItem[] = [
    {
      id: 'push-all',
      label: `Send all evaluations to the sheet (${feedbackEntries.length})`,
      hint: `Writes rows ${FIRST_ROW}–${LAST_ROW}, columns A–M of '${FEEDBACK_SHEET_NAME}'`,
      onSelect: pushAllToSheets,
      disabled: feedbackEntries.length === 0,
      state: isPushing ? 'busy' : 'idle',
    },
    {
      id: 'copy-all',
      label: 'Copy all evaluations (A–M)',
      hint: `Rows ${FIRST_ROW}–${LAST_ROW} · paste at A${FIRST_ROW}`,
      onSelect: handleCopyAllTsv,
      state: isCopiedAll ? 'done' : 'idle',
      doneLabel: 'Copied all evaluations',
    },
    {
      id: 'pull',
      label: 'Refresh from the sheet',
      hint: `Loads evaluations already in '${FEEDBACK_SHEET_NAME}'`,
      onSelect: () => pullFromSheet(false),
      state: isPulling ? 'busy' : 'idle',
    },
  ];

  const pillClass = (active: boolean, activeClass: string, idleClass: string) =>
    `inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium transition sm:min-h-8 ${
      active ? `${activeClass} shadow-xs` : idleClass
    }`;
  const idlePill = 'bg-stone-100 text-stone-700 hover:bg-stone-200';
  const noticeButton =
    'inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-95 sm:min-h-9';

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="animate-fade-up relative z-10 pb-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Session feedback</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Feedback &amp; Evaluation
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Rate your onboarding sessions across 6 dimensions and capture follow-up questions.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-sun-50 px-3 py-1 text-xs font-semibold text-sun-800">
              {progress.evaluatedCount} of {progress.totalCount} evaluated
            </span>
            <SheetToolsMenu items={toolItems} />
          </div>
        </div>

        {isPulling && health?.mode !== 'local' && (
          <p className="mt-3 text-xs text-stone-500" role="status">
            Checking the sheet for evaluations…
          </p>
        )}

        {notice ? (
          <div
            role="alert"
            className="animate-fade-up mt-3 space-y-2 rounded-2xl border border-peach-200 bg-peach-50 px-4 py-3 text-xs text-peach-900"
          >
            <div className="flex min-w-0 items-start gap-2">
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-peach-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{notice.title}</p>
                <p className="mt-0.5 break-words text-peach-900/90">
                  {notice.needsAuth ? 'Sign in with Google in Settings, or copy your evaluations and paste them into the sheet.' : notice.message}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-6">
              <button
                type="button"
                onClick={() => void (notice.kind === 'push' ? pushAllToSheets() : pullFromSheet(false))}
                disabled={notice.kind === 'push' ? isPushing : isPulling}
                className={`${noticeButton} bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-60`}
              >
                {(notice.kind === 'push' ? isPushing : isPulling) ? 'Retrying…' : 'Retry'}
              </button>
              <button
                type="button"
                onClick={() => void handleCopyAllTsv()}
                className={`${noticeButton} border border-peach-300 bg-white text-peach-900 hover:bg-peach-100`}
              >
                {isCopiedAll ? 'Copied' : 'Copy evaluations instead'}
              </button>
              {notice.needsAuth && (
                <a href="/settings" className={`${noticeButton} text-stone-700 underline-offset-2 hover:underline`}>
                  Open Settings
                </a>
              )}
            </div>
          </div>
        ) : (
          statusMessage && (
            <div
              role="status"
              className="animate-fade-up mt-3 flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-mint-200 bg-mint-50 py-1 pl-4 pr-1 text-xs text-mint-900"
            >
              <span className="flex min-w-0 items-center gap-2">
                <IconCheck className="size-4 shrink-0 text-mint-700" />
                <span className="min-w-0">{statusMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                aria-label="Dismiss"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-mint-800 transition hover:bg-mint-100 sm:size-9"
              >
                <IconX className="size-4" />
              </button>
            </div>
          )
        )}
      </header>

      {/* Progress, search & filters */}
      <section
        data-tour="feedback-sessions-list"
        aria-label="Feedback sessions"
        className="animate-fade-up stagger-1 rounded-3xl bg-white p-4 sm:p-5 shadow-soft"
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {progress.evaluatedCount}{' '}
              <span className="font-normal text-stone-500 text-lg sm:text-xl">
                / {progress.totalCount}
              </span>
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                progress.isComplete ? 'bg-mint-50 text-mint-800' : 'bg-peach-50 text-peach-800'
              }`}
            >
              {progress.isComplete ? 'All evaluated! 🎉' : `${progress.remainingCount} still to evaluate`}
            </span>
          </div>

          <div className="w-full sm:w-64">
            <label htmlFor="feedback-search" className="sr-only">
              Search sessions
            </label>
            <input
              id="feedback-search"
              type="search"
              placeholder="Search session or leader…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 text-xs text-stone-800 placeholder:text-stone-500 focus:border-stone-900 focus:bg-white focus:outline-none sm:min-h-9"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-label="Sessions evaluated"
          aria-valuemin={0}
          aria-valuemax={progress.totalCount}
          aria-valuenow={progress.evaluatedCount}
          className="mt-3 h-1.5 rounded-full bg-stone-100"
        >
          <div
            className="bar-gradient progress-shimmer h-1.5 rounded-full transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-stone-100 pb-3" role="group" aria-label="Filter sessions">
          <button
            type="button"
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            className={pillClass(statusFilter === 'all', 'bg-stone-900 text-white', idlePill)}
          >
            All ({progress.totalCount})
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === 'pending'}
            onClick={() => setStatusFilter('pending')}
            className={pillClass(
              statusFilter === 'pending',
              'bg-peach-700 text-white',
              progress.remainingCount > 0 ? 'bg-peach-50 font-semibold text-peach-800 hover:bg-peach-100' : idlePill
            )}
          >
            To evaluate ({progress.remainingCount})
          </button>
          <button
            type="button"
            aria-pressed={statusFilter === 'evaluated'}
            onClick={() => setStatusFilter('evaluated')}
            className={pillClass(statusFilter === 'evaluated', 'bg-mint-700 text-white', idlePill)}
          >
            Evaluated ({progress.evaluatedCount})
          </button>
        </div>

        {/* One-line session rows */}
        <ul className="mt-3 space-y-2">
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
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => setActiveSession(session)}
                  className={`group flex min-h-11 w-full min-w-0 flex-col justify-between gap-2.5 rounded-2xl border p-3 text-left transition-all sm:flex-row sm:items-center sm:px-4 sm:py-2.5 ${
                    isEvaluated
                      ? 'border-stone-100 bg-white/70 hover:border-stone-200 hover:bg-white'
                      : 'border-peach-200 bg-peach-50/30 hover:border-peach-300 hover:bg-peach-50/60 shadow-2xs'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {/* Status Indicator */}
                    <span
                      aria-hidden="true"
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isEvaluated ? 'bg-mint-100 text-mint-800' : 'bg-peach-100 text-peach-800'
                      }`}
                    >
                      {isEvaluated ? (
                        <IconCheck className="h-3.5 w-3.5" />
                      ) : (
                        <span className="size-2 rounded-full bg-peach-500" />
                      )}
                    </span>

                    <RowTag rowNumber={session.rowNumber} />

                    <span className="min-w-0 truncate text-sm font-medium text-stone-900">{session.title}</span>
                  </span>

                  {/* Right side: leader + rating / evaluate */}
                  <span className="flex min-w-0 shrink-0 items-center justify-between gap-2 pl-9 sm:justify-end sm:pl-0">
                    <span className="min-w-0 truncate rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                      <span className="sr-only">Led by </span>
                      {session.pic}
                    </span>

                    {isEvaluated ? (
                      <span className="flex items-center gap-1.5">
                        <span className="rounded-full border border-mint-200 bg-mint-50 px-2.5 py-0.5 text-xs font-bold text-mint-800">
                          <span className="sr-only">Average rating </span>★ {avgRating}
                        </span>
                        <span className="text-xs font-medium text-stone-500 transition group-hover:text-stone-700">
                          Details →
                        </span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white shadow-2xs transition group-hover:bg-stone-800">
                        Evaluate
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {filteredSessions.length === 0 && (
          <p className="py-8 text-center text-xs text-stone-500">No feedback sessions match your filter.</p>
        )}
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
