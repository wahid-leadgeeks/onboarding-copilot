// No 'use client': imported only from the client Today page (QuickNote/GuideTour pattern) — an entry directive would force Server-Action-style callback props.
import { useEffect, useReducer, useRef } from 'react';
import { canSaveLearning, initialLearningDraft, learningDraftReducer, resolvedContent } from '@/lib/learning-draft';
import type { LearningDraftState } from '@/lib/learning-draft';

/** Mirrors the server-side summary cap in `lib/ai/client`. */
const MAX_SUMMARY_LENGTH = 10_000;

/**
 * Parses the `/api/ai/summarize` response at the boundary. AI output is
 * untrusted (ADR-0003): only a non-empty string summary is accepted, and any
 * confirmation flags in the body are ignored — confirmation belongs to the
 * user and the reducer, never to the response.
 */
export function parseSummarizeResponse(value: unknown): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!('summary' in value)) return null;
  const summary: unknown = value.summary;
  if (typeof summary !== 'string') return null;
  const trimmed = summary.trim();
  return trimmed === '' ? null : trimmed.slice(0, MAX_SUMMARY_LENGTH);
}

export type LearningSubmissionSource = 'manual' | 'ai-assisted';

/** What the user asked to save: the resolved content plus where it came from. */
export type LearningSubmission = {
  readonly content: string;
  readonly source: LearningSubmissionSource;
};

/**
 * Derives the saveable submission from the draft, or null when nothing is
 * saveable. The source is `ai-assisted` only when the resolved content is
 * the reviewed, confirmed AI summary; an edit resets confirmation, and the
 * submission reverts to the `manual` raw notes (ADR-0003).
 */
export function deriveLearningSubmission(state: LearningDraftState): LearningSubmission | null {
  const content = resolvedContent(state);
  if (content === null) return null;
  const usesSummary = state.summary !== null && state.summaryConfirmed && state.summary.trim() !== '';
  return { content, source: usesSummary ? 'ai-assisted' : 'manual' };
}

/** Whether the user may request a summary right now: notes exist and no request is in flight. */
export function canRequestSummary(state: LearningDraftState): boolean {
  return state.status !== 'summarizing' && state.raw.trim() !== '';
}

/**
 * Focus-trap decision for the dialog: returns the element focus should move
 * to when Tab / Shift+Tab would leave the dialog, or null to let the browser
 * continue its natural tab order.
 */
export function tabWrapTarget<T>(active: T | null, focusable: readonly T[], shiftKey: boolean): T | null {
  if (focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (shiftKey && active === first) return last;
  if (!shiftKey && active === last) return first;
  return null;
}

export type LearningModalProps = {
  readonly open: boolean;
  /** Receives the user-confirmed submission (content + source). The page keeps ownership of persistence. */
  readonly onSave: (submission: LearningSubmission) => void;
  /** Called when the user skips or dismisses the capture. */
  readonly onSkip: () => void;
};

const TITLE_ID = 'learning-modal-title';

export function LearningModal({ open, onSave, onSkip }: LearningModalProps) {
  const [state, dispatch] = useReducer(learningDraftReducer, initialLearningDraft());
  const dialogRef = useRef<HTMLElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const summary = state.summary;

  async function requestSummary() {
    if (!canRequestSummary(state)) return;
    const content = state.raw.trim();
    dispatch({ type: 'summarize-started' });
    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    if (!response?.ok) {
      dispatch({ type: 'summarize-failed' });
      return;
    }
    const payload: unknown = await response.json().catch(() => null);
    const generated = parseSummarizeResponse(payload);
    if (generated === null) {
      dispatch({ type: 'summarize-failed' });
      return;
    }
    dispatch({ type: 'summarize-succeeded', summary: generated });
  }

  function save() {
    const submission = deriveLearningSubmission(state);
    if (submission === null) return;
    onSave(submission);
  }

  // A fresh draft for every capture: reopening resets any previous draft.
  useEffect(() => {
    if (open) dispatch({ type: 'reset' });
  }, [open]);

  // Keyboard-safe dialog: Escape dismisses, Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onSkip();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current !== null) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:enabled, input:enabled, textarea:enabled'));
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const target = tabWrapTarget(active, focusable, event.shiftKey);
        if (target !== null) {
          event.preventDefault();
          target.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onSkip]);

  // Move focus into the dialog on open and restore it to the caller on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    notesRef.current?.focus();
    return () => { previous?.focus(); };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-busy={state.status === 'summarizing'}
        className="animate-pop-in w-full max-w-md rounded-card bg-white p-6 shadow-lift"
      >
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mint-700">
          <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-mint-100 text-sm font-semibold">✓</span>
          Activity complete
        </p>
        <h2 id={TITLE_ID} className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">What did you learn?</h2>
        <textarea
          ref={notesRef}
          aria-label="What did you learn?"
          placeholder="Just write a few words..."
          value={state.raw}
          onChange={event => dispatch({ type: 'type-raw', content: event.target.value })}
          rows={4}
          className="mt-4 w-full rounded-2xl border border-stone-200 p-3 text-stone-900 placeholder:text-stone-400 focus:border-mint-300"
        />
        {summary !== null && (
          <div className="mt-4 rounded-2xl bg-lavender-50 p-4">
            <p className="text-xs font-medium text-lavender-700">AI-generated summary — review, edit, and confirm</p>
            <textarea
              aria-label="Editable AI summary"
              value={summary}
              onChange={event => dispatch({ type: 'edit-summary', content: event.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-2 text-stone-900"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={state.summaryConfirmed}
                onChange={event => dispatch(event.target.checked ? { type: 'confirm-summary' } : { type: 'edit-summary', content: summary })}
              />
              I reviewed and confirm this summary
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'reject-summary' })}
              className="mt-2 min-h-11 text-sm text-stone-500 underline underline-offset-4 transition hover:text-stone-700"
            >
              Use my own notes instead
            </button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void requestSummary()}
            disabled={!canRequestSummary(state)}
            className="min-h-11 rounded-full border border-stone-200 px-5 py-2 text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
          >
            {state.status === 'summarizing' ? 'Summarizing…' : '✨ Summarize for me'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSaveLearning(state)}
            className="min-h-11 rounded-full bg-stone-900 px-5 py-2 font-semibold text-white transition hover:bg-stone-700 disabled:opacity-40"
          >
            {summary !== null ? 'Confirm & save' : 'Save & continue'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 rounded-full px-3 py-2 text-sm text-stone-500 underline underline-offset-4 transition hover:text-stone-700"
          >
            Skip for now
          </button>
        </div>
        {state.status === 'summarize-failed' && (
          <p className="mt-3 text-center text-sm text-peach-700" role="status">
            The summary is unavailable right now. Your notes are safe — you can still save them as-is.
          </p>
        )}
      </section>
    </div>
  );
}
