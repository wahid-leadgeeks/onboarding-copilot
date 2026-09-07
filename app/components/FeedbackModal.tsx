import { useEffect, useRef, useState } from 'react';
import {
  FEEDBACK_DIMENSIONS,
  clipboardRowForFeedback,
  formatFeedbackDate,
  type FeedbackEntry,
  type FeedbackRatingDimension,
  type FeedbackRatings,
  type FeedbackSession,
  type LikertScore,
} from '@/lib/feedback';

export interface FeedbackModalProps {
  readonly session: FeedbackSession;
  readonly existingEntry?: FeedbackEntry;
  readonly onSave: (entry: FeedbackEntry) => void;
  readonly onClose: () => void;
}

/**
 * Focus-trap helper for keyboard navigation inside modal dialogs.
 */
export function tabWrapTarget<T>(active: T | null, focusable: readonly T[], shiftKey: boolean): T | null {
  if (focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (shiftKey && active === first) return last;
  if (!shiftKey && active === last) return first;
  return null;
}

/**
 * Validates if all 6 Likert dimensions have been rated 1–5.
 */
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
    (d) => typeof ratings[d] === 'number' && ratings[d]! >= 1 && ratings[d]! <= 5
  );
}

const LIKERT_OPTIONS: Array<{ score: LikertScore; label: string; short: string }> = [
  { score: 5, label: '5. Very Good', short: 'Very Good' },
  { score: 4, label: '4. Good', short: 'Good' },
  { score: 3, label: '3. Neutral', short: 'Neutral' },
  { score: 2, label: '2. Poor', short: 'Poor' },
  { score: 1, label: '1. Very Poor', short: 'Very Poor' },
];

export function FeedbackModal({ session, existingEntry, onSave, onClose }: FeedbackModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  const [date, setDate] = useState<string>(() => {
    if (existingEntry?.date) return existingEntry.date;
    return formatFeedbackDate(new Date());
  });

  const [ratings, setRatings] = useState<Partial<FeedbackRatings>>(() => {
    if (existingEntry?.ratings) return { ...existingEntry.ratings };
    return {};
  });

  const [hasQuestions, setHasQuestions] = useState<boolean>(
    () => existingEntry?.hasQuestions ?? false
  );

  const [questionExplanation, setQuestionExplanation] = useState<string>(
    () => existingEntry?.questionExplanation ?? ''
  );

  const [questionAddressing, setQuestionAddressing] = useState<string>(
    () => existingEntry?.questionAddressing ?? ''
  );

  const [suggestions, setSuggestions] = useState<string>(
    () => existingEntry?.suggestions ?? ''
  );

  const [copied, setCopied] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Trap focus & listen for Escape key
  useEffect(() => {
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstFocusRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current !== null) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
          )
        );
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const target = tabWrapTarget(active, focusable, event.shiftKey);
        if (target !== null) {
          event.preventDefault();
          target.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousActive?.focus();
    };
  }, [onClose]);

  function handleRatingSelect(dim: FeedbackRatingDimension, score: LikertScore) {
    setRatings((prev) => ({ ...prev, [dim]: score }));
    if (validationError) setValidationError(null);
  }

  function buildEntry(): FeedbackEntry | null {
    if (!isRatingComplete(ratings)) return null;

    return {
      id: existingEntry?.id ?? `fb-${session.id}`,
      sessionId: session.id,
      sessionTitle: session.title,
      pic: session.pic,
      date: date.trim() || formatFeedbackDate(new Date()),
      ratings: {
        communication: ratings.communication,
        alignment: ratings.alignment,
        understanding: ratings.understanding,
        readiness: ratings.readiness,
        pace: ratings.pace,
        overall: ratings.overall,
      },
      hasQuestions,
      questionExplanation: questionExplanation.trim() || undefined,
      questionAddressing: questionAddressing.trim() || undefined,
      suggestions: suggestions.trim() || undefined,
      createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    const entry = buildEntry();
    if (!entry) {
      setValidationError('Please provide a rating (1–5) for all 6 evaluation dimensions.');
      return;
    }
    setValidationError(null);
    onSave(entry);
  }

  async function handleCopy() {
    const entry = buildEntry();
    if (!entry) {
      setValidationError('Please select a rating for all 6 dimensions before copying.');
      return;
    }
    setValidationError(null);
    const row = clipboardRowForFeedback(entry);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* ignore clipboard rejection in non-secure contexts */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="animate-pop-in relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white p-6 shadow-lift sm:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sun-600">
              <span aria-hidden="true" className="inline-block size-2 rounded-full bg-sun-400" />
              Session Feedback · Row {session.rowNumber}
            </p>
            <h2
              id="feedback-modal-title"
              className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl"
            >
              {session.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                👤 PIC: {session.pic}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                📋 Sheet Row {session.rowNumber}
              </span>
              <label className="flex items-center gap-1.5 font-medium text-stone-600">
                📅 Date:
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  aria-label="Evaluation date"
                  className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-800 focus:border-stone-400 focus:outline-none"
                />
              </label>
            </div>
          </div>
          <button
            ref={firstFocusRef}
            type="button"
            onClick={onClose}
            aria-label="Close feedback modal"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-400"
          >
            ✕
          </button>
        </div>

        {/* Validation Warning */}
        {validationError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-peach-200 bg-peach-50 px-4 py-3 text-xs font-medium text-peach-900"
          >
            ⚠️ {validationError}
          </div>
        )}

        {/* 6 Likert Rating Dimensions */}
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-stone-500">
              Evaluation Ratings (1–5 Scale)
            </h3>
            <span className="text-xs text-stone-400">
              {Object.keys(ratings).length} of 6 rated
            </span>
          </div>

          {FEEDBACK_DIMENSIONS.map((dimensionRaw) => {
            const dimension = {
              ...dimensionRaw,
              label: (dimensionRaw as { label?: string }).label ?? dimensionRaw.shortLabel,
            };
            const currentScore = ratings[dimension.key];
            return (
              <div
                key={dimension.key}
                className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition-colors hover:bg-stone-50"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-stone-900">
                    {dimension.dimensionNumber}. {dimension.shortLabel}
                  </h4>
                  <span className="text-xs font-medium text-stone-400">
                    Col {dimension.columnLetter}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500 italic">
                  "{dimension.statement}"
                </p>

                {/* Likert Buttons 1 to 5 */}
                <div
                  role="radiogroup"
                  aria-label={dimension.shortLabel}
                  className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2"
                >
                  {LIKERT_OPTIONS.map((opt) => {
                    const isSelected = currentScore === opt.score;
                    return (
                      <button
                        key={opt.score}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${dimension.label}: ${opt.score}. ${opt.label}`}
                        onClick={() => handleRatingSelect(dimension.key, opt.score)}
                        className={`flex min-h-11 flex-col items-center justify-center rounded-xl p-1.5 text-center transition-all ${
                          isSelected
                            ? 'border-2 border-mint-500 bg-mint-50 text-mint-900 font-semibold shadow-xs ring-1 ring-mint-400'
                            : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-sm font-bold">{opt.score}</span>
                        <span className="hidden text-[10px] leading-tight sm:inline text-stone-500">
                          {opt.short}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Qualitative Questions Form */}
        <div className="mt-8 space-y-5 border-t border-stone-100 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-stone-500">
            Qualitative Follow-Up (Columns J–M)
          </h3>

          {/* Q1: Do you have any questions? (Col J) */}
          <div>
            <label className="block text-sm font-medium text-stone-900">
              Do you have any questions about today's topic?
            </label>
            <p className="text-xs text-stone-500">
              Matches column J of Feedback Sheet (YES/NO).
            </p>
            <div className="mt-2.5 flex gap-3">
              <button
                type="button"
                aria-pressed={!hasQuestions}
                onClick={() => setHasQuestions(false)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  !hasQuestions
                    ? 'border-2 border-mint-500 bg-mint-50 text-mint-900 shadow-xs'
                    : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                NO · Everything was clear 👍
              </button>
              <button
                type="button"
                aria-pressed={hasQuestions}
                onClick={() => setHasQuestions(true)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  hasQuestions
                    ? 'border-2 border-peach-500 bg-peach-50 text-peach-900 shadow-xs'
                    : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                YES · I have questions 💡
              </button>
            </div>
          </div>

          {/* Q2: Explanation (Col K) */}
          <div>
            <label
              htmlFor="feedback-explanation"
              className="block text-sm font-medium text-stone-900"
            >
              Please explain your answer
            </label>
            <p className="text-xs text-stone-500">
              Matches column K of Feedback Sheet. Details on questions or comments on the session.
            </p>
            <textarea
              id="feedback-explanation"
              rows={2}
              value={questionExplanation}
              onChange={(e) => setQuestionExplanation(e.target.value)}
              placeholder="e.g. The strategic overview was clear, but need more details on deployment pipeline..."
              className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
            />
          </div>

          {/* Q3: How Addressed (Col L) */}
          <div>
            <label
              htmlFor="feedback-addressing"
              className="block text-sm font-medium text-stone-900"
            >
              How would you like your question to be addressed?
            </label>
            <p className="text-xs text-stone-500">
              Matches column L of Feedback Sheet (e.g. 1-on-1 call, Slack thread, docs, or "No follow-up needed").
            </p>
            <textarea
              id="feedback-addressing"
              rows={2}
              value={questionAddressing}
              onChange={(e) => setQuestionAddressing(e.target.value)}
              placeholder="e.g. 15-minute sync with HRD or documentation link via Slack..."
              className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
            />
          </div>

          {/* Q4: Suggestions (Col M) */}
          <div>
            <label
              htmlFor="feedback-suggestions"
              className="block text-sm font-medium text-stone-900"
            >
              Any suggestions to improve the onboarding process in the future?
            </label>
            <p className="text-xs text-stone-500">
              Matches column M of Feedback Sheet. Suggestions for pacing, materials, or format.
            </p>
            <textarea
              id="feedback-suggestions"
              rows={2}
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="e.g. Distribute slide deck 1 day prior to the presentation..."
              className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-400"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`rounded-full px-4 py-2.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 ${
                copied
                  ? 'bg-mint-100 text-mint-800'
                  : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
              }`}
            >
              {copied ? '✓ Copied for Feedback Sheet!' : '📋 Copy for Feedback Sheet'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-stone-900 px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-900"
            >
              Save Evaluation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
