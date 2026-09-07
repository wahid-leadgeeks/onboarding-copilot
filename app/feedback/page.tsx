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
import { IconCheck, IconClipboard } from '@/app/components/Icons';

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [activeSession, setActiveSession] = useState<FeedbackSession | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      setFeedbackEntries(readFeedbackEntries(localStorage.getItem(FEEDBACK_STORAGE_KEY)));
    } catch {
      /* ignore */
    }
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
          <p className="text-sm font-medium text-stone-500">Sheet: Feedback · Session Ratings</p>
          <span className="rounded-full bg-sun-50 px-3 py-1 text-xs font-semibold text-sun-800">
            {progress.evaluatedCount} / {progress.totalCount} Evaluated
          </span>
        </div>
        <div className="mt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Feedback &amp; Evaluation
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Rate your onboarding sessions across 6 dimensions (Cols D–I) and capture qualitative follow-ups.
          </p>
        </div>
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
                ? 'All 13 evaluated!'
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
                      <p className="mt-1 text-xs text-stone-500">
                        Evaluated on {entry.date} · Overall rating: <span className="font-semibold text-mint-700">{entry.ratings.overall}/5</span>
                      </p>
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
