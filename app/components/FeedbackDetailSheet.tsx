'use client';

import React, { useEffect, useState } from 'react';
import {
  FEEDBACK_DIMENSIONS,
  formatFeedbackDate,
  normalizeQuestionAddressing,
  type FeedbackEntry,
  type FeedbackRatingDimension,
  type FeedbackRatings,
  type FeedbackSession,
  type LikertScore,
  type QuestionAddressingOption,
} from '@/lib/feedback';
import {
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconEdit,
  IconLightbulb,
  IconRocket,
  IconUser,
  IconX,
} from './Icons';

export interface FeedbackDetailSheetProps {
  readonly session: FeedbackSession | null;
  readonly existingEntry?: FeedbackEntry;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (entry: FeedbackEntry) => void;
  readonly onCopyRow?: (entry: FeedbackEntry) => void;
  readonly onPrevSession?: () => void;
  readonly onNextSession?: () => void;
  readonly hasPrev?: boolean;
  readonly hasNext?: boolean;
  readonly isCopied?: boolean;
}

const LIKERT_OPTIONS: Array<{ score: LikertScore; label: string; short: string }> = [
  { score: 6, label: '6. Excellent', short: 'Excellent' },
  { score: 5, label: '5. Very Good', short: 'Very Good' },
  { score: 4, label: '4. Good', short: 'Good' },
  { score: 3, label: '3. Fair', short: 'Fair' },
  { score: 2, label: '2. Poor', short: 'Poor' },
  { score: 1, label: '1. Very Poor', short: 'Very Poor' },
];

interface AddressingChoiceConfig {
  value: QuestionAddressingOption;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const ADDRESSING_CHOICES: AddressingChoiceConfig[] = [
  {
    value: 'Chat response is fine',
    label: 'Chat response is fine',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-200',
  },
  {
    value: "I don't have any questions today",
    label: "I don't have any questions today",
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-200',
  },
  {
    value: 'I’d like to schedule aN online live meeting',
    label: 'I’d like to schedule aN online live meeting',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    badgeBorder: 'border-sky-200',
  },
];

export function isRatingComplete(ratings: Partial<FeedbackRatings>): ratings is FeedbackRatings {
  const dims: FeedbackRatingDimension[] = [
    'communication',
    'alignment',
    'understanding',
    'readiness',
    'pace',
    'overall',
  ];
  return dims.every(
    (d) => typeof ratings[d] === 'number' && ratings[d]! >= 1 && ratings[d]! <= 6
  );
}

export function FeedbackDetailSheet({
  session,
  existingEntry,
  isOpen,
  onClose,
  onSave,
  onCopyRow,
  onPrevSession,
  onNextSession,
  hasPrev = false,
  hasNext = false,
  isCopied = false,
}: FeedbackDetailSheetProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Form state aligned with FeedbackEntry
  const [date, setDate] = useState<string>('');
  const [ratings, setRatings] = useState<Partial<FeedbackRatings>>({});
  const [hasQuestions, setHasQuestions] = useState<boolean>(false);
  const [questionExplanation, setQuestionExplanation] = useState<string>('');
  const [questionAddressing, setQuestionAddressing] = useState<string>('Chat response is fine');
  const [suggestions, setSuggestions] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sheets Sync state
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(false);

  // Sync state whenever session or existingEntry changes
  useEffect(() => {
    setSyncMessage(null);
    setSyncError(null);
    setNeedsAuth(false);

    if (session) {
      if (existingEntry) {
        setDate(existingEntry.date || formatFeedbackDate(new Date()));
        setRatings(existingEntry.ratings);
        setHasQuestions(Boolean(existingEntry.hasQuestions));
        setQuestionExplanation(existingEntry.questionExplanation || '');
        setQuestionAddressing(
          normalizeQuestionAddressing(existingEntry.questionAddressing) || 'Chat response is fine'
        );
        setSuggestions(existingEntry.suggestions || '');
        setIsEditing(false);
      } else {
        setDate(formatFeedbackDate(new Date()));
        setRatings({});
        setHasQuestions(false);
        setQuestionExplanation('');
        setQuestionAddressing('Chat response is fine');
        setSuggestions('');
        setIsEditing(true); // default to edit if not evaluated yet
      }
      setValidationError(null);
    }
  }, [session, existingEntry]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const isEvaluated = Boolean(existingEntry && isRatingComplete(existingEntry.ratings));

  const handleScoreChange = (dimension: FeedbackRatingDimension, score: LikertScore) => {
    setRatings((prev) => ({ ...prev, [dimension]: score }));
    if (validationError) setValidationError(null);
  };

  const handleSyncToSheets = async (entryToSync?: FeedbackEntry) => {
    const targetEntry = entryToSync || existingEntry;
    if (!targetEntry && !isRatingComplete(ratings)) {
      setValidationError('Please complete all 6 ratings before syncing to Google Sheets.');
      return;
    }

    const payloadEntry: FeedbackEntry =
      targetEntry ?? {
        id: `fb-${session.id}`,
        sessionId: session.id,
        sessionTitle: session.title,
        pic: session.pic,
        date: date.trim() || formatFeedbackDate(new Date()),
        ratings: {
          communication: ratings.communication!,
          alignment: ratings.alignment!,
          understanding: ratings.understanding!,
          readiness: ratings.readiness!,
          pace: ratings.pace!,
          overall: ratings.overall!,
        },
        hasQuestions,
        questionExplanation: questionExplanation.trim() || undefined,
        questionAddressing: questionAddressing.trim() || undefined,
        suggestions: suggestions.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    setSyncing(true);
    setSyncMessage(null);
    setSyncError(null);
    setNeedsAuth(false);

    try {
      const res = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'Feedback Sheet',
          rowNumber: session.rowNumber,
          feedback: payloadEntry,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || data?.authenticated === false) {
        setNeedsAuth(true);
        setSyncError(
          'Google OAuth sign-in is required to sync directly to your spreadsheet. Please sign in or use "Copy TSV Row" below.'
        );
      } else if (res.ok && data?.success) {
        setSyncMessage(`Row ${session.rowNumber} successfully synced to Google Sheets!`);
      } else {
        setSyncError(data?.error || data?.message || 'Failed to sync to Google Sheets.');
      }
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Network error while syncing to Google Sheets.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = () => {
    if (!isRatingComplete(ratings)) {
      setValidationError('Please rate all 6 dimensions (1 to 6) before saving.');
      return;
    }

    const entry: FeedbackEntry = {
      id: existingEntry?.id ?? `fb-${session.id}`,
      sessionId: session.id,
      sessionTitle: session.title,
      pic: session.pic,
      date: date.trim() || formatFeedbackDate(new Date()),
      ratings: {
        communication: ratings.communication!,
        alignment: ratings.alignment!,
        understanding: ratings.understanding!,
        readiness: ratings.readiness!,
        pace: ratings.pace!,
        overall: ratings.overall!,
      },
      hasQuestions,
      questionExplanation: questionExplanation.trim() || undefined,
      questionAddressing: questionAddressing.trim() || undefined,
      suggestions: suggestions.trim() || undefined,
      createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(entry);
    setIsEditing(false);
    void handleSyncToSheets(entry);
  };

  const averageScore = isEvaluated
    ? (
        (existingEntry!.ratings.communication +
          existingEntry!.ratings.alignment +
          existingEntry!.ratings.understanding +
          existingEntry!.ratings.readiness +
          existingEntry!.ratings.pace +
          existingEntry!.ratings.overall) /
        6
      ).toFixed(1)
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-detail-sheet-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        <div
          className="pointer-events-auto flex w-screen flex-col bg-white shadow-lift
            max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[92vh] max-sm:rounded-t-3xl
            sm:max-w-xl sm:h-full sm:rounded-l-3xl animate-fade-in"
        >
          {/* Mobile Handle Indicator */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6">
            <div className="space-y-1.5 pr-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
                  Row {session.rowNumber}
                </span>
                {session.department && (
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                    {session.department}
                  </span>
                )}
                {isEvaluated ? (
                  <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-semibold text-mint-700 border border-mint-200">
                    Evaluated · Avg {averageScore}/6
                  </span>
                ) : (
                  <span className="rounded-full bg-peach-50 px-2 py-0.5 text-[11px] font-semibold text-peach-700 border border-peach-200">
                    Pending Evaluation
                  </span>
                )}
              </div>
              <h2
                id="feedback-detail-sheet-title"
                className="text-lg font-semibold text-stone-900 sm:text-xl leading-snug"
              >
                {session.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <IconUser className="h-3.5 w-3.5 text-stone-400" />
                  PIC: <strong className="text-stone-700">{session.pic}</strong>
                </span>
                {existingEntry?.date && (
                  <span className="flex items-center gap-1">
                    <IconCalendar className="h-3.5 w-3.5 text-stone-400" />
                    Date: <strong className="text-stone-700">{existingEntry.date}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Prev / Next & Close */}
            <div className="flex items-center gap-1 shrink-0">
              {onPrevSession && (
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={onPrevSession}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Previous session"
                  aria-label="Previous session"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {onNextSession && (
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextSession}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Next session"
                  aria-label="Next session"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition ml-1"
                aria-label="Close sheet"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Sync Status Banners */}
            {syncMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-mint-200 bg-mint-50 p-3 text-xs text-mint-900 font-medium animate-fade-in">
                <IconCheck className="h-4 w-4 text-mint-600 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}
            {syncError && (
              <div className="rounded-xl border border-peach-200 bg-peach-50 p-3 text-xs text-peach-900 font-medium space-y-2 animate-fade-in">
                <p>{syncError}</p>
                {needsAuth && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="/api/auth/login"
                      className="inline-flex items-center gap-1 rounded-md bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-stone-800 transition"
                    >
                      Sign in with Google
                    </a>
                    <a
                      href="/settings"
                      className="text-[11px] font-medium text-stone-600 underline hover:text-stone-900"
                    >
                      Open Settings
                    </a>
                  </div>
                )}
              </div>
            )}
            {!isEditing && existingEntry ? (
              /* VIEW MODE */
              <>
                {/* 6 Dimensions Breakdown */}
                <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Ratings Breakdown (Cols D–I)
                    </h3>
                    <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-md">
                      Score: {averageScore} / 6.0
                    </span>
                  </div>

                  <div className="space-y-3">
                    {FEEDBACK_DIMENSIONS.map((dim) => {
                      const score = existingEntry.ratings[dim.key] as LikertScore;
                      const opt = LIKERT_OPTIONS.find((o) => o.score === score);
                      const pct = ((score || 0) / 6) * 100;

                      return (
                        <div key={dim.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-700 font-medium">
                              Col {dim.columnLetter}: {dim.shortLabel}
                            </span>
                            <span className="font-bold text-stone-900">
                              {score}/6 · <span className="text-stone-500 font-normal">{opt?.short}</span>
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-mint-500 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Qualitative Responses (Cols J–M) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Qualitative Notes &amp; Follow-ups (Cols J–M)
                  </h3>

                  {/* Has Questions & Explanation (Cols J & K) */}
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-600">
                        Questions on Topic (Col J)
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          existingEntry.hasQuestions
                            ? 'bg-peach-100 text-peach-800'
                            : 'bg-mint-100 text-mint-800'
                        }`}
                      >
                        {existingEntry.hasQuestions ? 'YES · Had questions' : 'NO · Clear'}
                      </span>
                    </div>

                    {existingEntry.questionExplanation ? (
                      <div>
                        <span className="text-[11px] font-medium text-stone-400 block mb-1">
                          Explanation (Col K)
                        </span>
                        <p className="text-xs text-stone-800 whitespace-pre-wrap bg-white p-3 rounded-xl border border-stone-100">
                          {existingEntry.questionExplanation}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Question Addressing (Col L) */}
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-1.5">
                    <span className="text-xs font-semibold text-stone-600 block">
                      Addressing Preference (Col L)
                    </span>
                    {(() => {
                      const val = normalizeQuestionAddressing(existingEntry.questionAddressing);
                      const match = ADDRESSING_CHOICES.find((c) => c.value === val);
                      return match ? (
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${match.badgeBg} ${match.badgeText} ${match.badgeBorder}`}
                        >
                          {match.label}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-600">{val || '—'}</span>
                      );
                    })()}
                  </div>

                  {/* Suggestions (Col M) */}
                  {existingEntry.suggestions && (
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-xs font-semibold text-stone-600 block mb-1">
                        Suggestions &amp; Feedback for Improvement (Col M)
                      </span>
                      <p className="text-xs text-stone-800 whitespace-pre-wrap">
                        {existingEntry.suggestions}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* EDIT MODE */
              <div className="space-y-6">
                {validationError && (
                  <div className="rounded-xl border border-peach-200 bg-peach-50 p-3 text-xs text-peach-900 font-medium">
                    {validationError}
                  </div>
                )}

                {/* Evaluation Date */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Evaluation Date
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Rating dimensions */}
                <div className="space-y-4">
                  <div className="border-b border-stone-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Rate Session Dimensions (1 to 6)
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Columns D through I of the Feedback Sheet
                    </p>
                  </div>

                  {FEEDBACK_DIMENSIONS.map((dim) => {
                    const currentScore = ratings[dim.key];
                    return (
                      <div key={dim.key} className="rounded-2xl border border-stone-100 bg-stone-50/50 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-stone-800">
                            Col {dim.columnLetter}: {dim.shortLabel}
                          </span>
                          <span className="text-xs font-bold text-mint-700">
                            {currentScore ? `${currentScore} / 6` : 'Not rated'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">{dim.statement}</p>

                        <div className="grid grid-cols-6 gap-1.5 pt-1">
                          {LIKERT_OPTIONS.map((opt) => {
                            const isSelected = currentScore === opt.score;
                            return (
                              <button
                                key={opt.score}
                                type="button"
                                onClick={() => handleScoreChange(dim.key, opt.score)}
                                className={`flex flex-col items-center justify-center rounded-xl py-1.5 px-1 text-center transition ${
                                  isSelected
                                    ? 'bg-mint-700 text-white shadow-xs font-bold'
                                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <span className="text-xs">{opt.score}</span>
                                <span className="text-[9px] truncate max-w-full opacity-80">{opt.short}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Q1: Do you have questions? (Col J) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                    Do you have any questions about today's topic? (Col J)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHasQuestions(false);
                        setQuestionAddressing("I don't have any questions today");
                      }}
                      className={`flex-1 rounded-xl p-2.5 text-xs font-semibold transition border ${
                        !hasQuestions
                          ? 'border-mint-500 bg-mint-50 text-mint-900 shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      NO · Everything clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasQuestions(true);
                        setQuestionAddressing('Chat response is fine');
                      }}
                      className={`flex-1 rounded-xl p-2.5 text-xs font-semibold transition border inline-flex items-center justify-center gap-1.5 ${
                        hasQuestions
                          ? 'border-peach-500 bg-peach-50 text-peach-900 shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <IconLightbulb className="h-3.5 w-3.5 text-peach-700" />
                      <span>YES · Have questions</span>
                    </button>
                  </div>
                </div>

                {/* Q2: Explanation (Col K) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Please explain your answer / questions (Col K)
                  </label>
                  <textarea
                    rows={2}
                    value={questionExplanation}
                    onChange={(e) => setQuestionExplanation(e.target.value)}
                    placeholder="Details or questions on the session..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                  />
                </div>

                {/* Q3: Question Addressing (Col L) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                    How would you like your question addressed? (Col L)
                  </label>
                  <div className="flex flex-col gap-2">
                    {ADDRESSING_CHOICES.map((choice) => {
                      const isSelected = questionAddressing === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => setQuestionAddressing(choice.value)}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition ${
                            isSelected
                              ? `${choice.badgeBg} ${choice.badgeBorder} ${choice.badgeText} font-semibold ring-1 ring-stone-900`
                              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span>{choice.label}</span>
                          {isSelected && <IconCheck className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q4: Suggestions (Col M) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Suggestions / Feedback for improvement (Col M)
                  </label>
                  <textarea
                    rows={2}
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    placeholder="Suggestions for future sessions or topics..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="border-t border-stone-100 bg-stone-50/90 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!isEditing ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition active:scale-95 shadow-xs"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      <span>{isEvaluated ? 'Edit Evaluation' : 'Fill Evaluation'}</span>
                    </button>

                    {isEvaluated && (
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={() => void handleSyncToSheets()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition active:scale-95 disabled:opacity-50 shadow-2xs"
                        title="Sync directly to Google Sheets via API"
                      >
                        <IconRocket className={`h-3.5 w-3.5 text-stone-600 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Syncing…' : 'Sync to Sheets'}</span>
                      </button>
                    )}

                    {isEvaluated && onCopyRow && (
                      <button
                        type="button"
                        onClick={() => onCopyRow(existingEntry!)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition active:scale-95"
                        title={`Copy Row ${session.rowNumber} TSV (paste into cell A${session.rowNumber} in Google Sheets)`}
                      >
                        {isCopied ? (
                          <>
                            <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                            <span className="text-mint-700 font-semibold">Copied TSV!</span>
                          </>
                        ) : (
                          <>
                            <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                            <span>Copy TSV Row</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-medium text-stone-500 hover:text-stone-800 transition px-2"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (existingEntry) {
                        setIsEditing(false);
                      } else {
                        onClose();
                      }
                    }}
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={syncing}
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 rounded-full bg-mint-700 px-5 py-2 text-xs font-semibold text-white hover:bg-mint-800 transition active:scale-95 shadow-xs disabled:opacity-60"
                  >
                    <IconCheck className="h-4 w-4" />
                    <span>{syncing ? 'Saving & Syncing…' : 'Save Evaluation'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
