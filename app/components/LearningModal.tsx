// No 'use client': imported only from the client Today page (QuickNote/GuideTour pattern) — an entry directive would force Server-Action-style callback props.
import { useEffect, useReducer, useRef, useState } from 'react';
import {
  canRequestSummary,
  canSaveLearning,
  deriveLearningSubmission,
  formatTakeaways,
  initialLearningDraft,
  learningDraftReducer,
  parseTakeawaysFromSummary,
  resolvedContent,
} from '@/lib/learning-draft';
import type {
  LearningDraftState,
  LearningSubmission,
  LearningSubmissionSource,
} from '@/lib/learning-draft';
import { clipboardRowForDiary } from '@/lib/local-records';

export {
  canRequestSummary,
  canSaveLearning,
  deriveLearningSubmission,
  formatTakeaways,
  parseTakeawaysFromSummary,
  resolvedContent,
};
export type { LearningSubmission, LearningSubmissionSource };

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
  const summary: unknown = (value as Record<string, unknown>).summary;
  if (typeof summary !== 'string') return null;
  const trimmed = summary.trim();
  return trimmed === '' ? null : trimmed.slice(0, MAX_SUMMARY_LENGTH);
}

/** Formats 3 takeaways and optional notes into human-readable text. */
export function formatDiaryContent(takeaways: [string, string, string], notes?: string): string {
  return formatTakeaways(takeaways, notes);
}

/**
 * Predicate determining whether the draft can be exported to the diary clipboard.
 * Per ADR-0003, unconfirmed AI takeaways must NEVER be exported.
 */
export function canCopyDiary(state: LearningDraftState): boolean {
  if (state.aiGenerated && !state.summaryConfirmed) return false;
  const hasTakeaways = Boolean(state.takeaway1.trim() || state.takeaway2.trim() || state.takeaway3.trim());
  const hasRaw = Boolean(state.raw.trim());
  const hasNotes = Boolean(state.notes.trim());
  return hasTakeaways || hasRaw || hasNotes;
}

/**
 * Derives the exact 9-column TSV row for clipboard copy.
 * Returns null if AI structuring is active but unconfirmed (ADR-0003).
 */
export function deriveDiaryClipboardRow(
  state: LearningDraftState,
  activity?: LearningActivityContext | null,
): string | null {
  if (state.aiGenerated && !state.summaryConfirmed) return null;

  const takeaways: [string, string, string] = [state.takeaway1, state.takeaway2, state.takeaway3];
  const hasTakeaways = Boolean(state.takeaway1.trim() || state.takeaway2.trim() || state.takeaway3.trim());

  return clipboardRowForDiary({
    day: state.day || activity?.day,
    week: state.week !== '' ? state.week : activity?.week,
    date: state.date || activity?.date,
    activityCount: state.activityCount !== '' ? state.activityCount : activity?.activityCount,
    pic: state.pic || activity?.pic,
    topic: state.topic || activity?.topic || 'Learning Reflection',
    takeaways: hasTakeaways ? takeaways : undefined,
    notes: state.notes,
    content: state.raw,
  });
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

export interface LearningActivityContext {
  readonly id?: string;
  readonly topic: string;
  readonly pic?: string;
  readonly day?: string;
  readonly date?: string;
  readonly week?: string | number;
  readonly activityCount?: string | number;
}

export type LearningModalProps = {
  readonly open: boolean;
  readonly activity?: LearningActivityContext | null;
  /** Receives the user-confirmed submission. The page keeps ownership of persistence. */
  readonly onSave: (submission: LearningSubmission) => void;
  /** Called when the user skips or dismisses the capture. */
  readonly onSkip: () => void;
};

// Web Speech API interfaces for runtime detection
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionClass(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

const TITLE_ID = 'learning-modal-title';

export function LearningModal({ open, activity, onSave, onSkip }: LearningModalProps) {
  const [state, dispatch] = useReducer(learningDraftReducer, initialLearningDraft());
  const [copied, setCopied] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const dialogRef = useRef<HTMLElement | null>(null);
  const rawNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check browser speech recognition support
  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionClass() !== null);
  }, []);

  // Stop listening and abort pending AI requests if modal closes
  useEffect(() => {
    if (!open) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [open]);

  // Abort pending AI requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // A fresh draft for every capture, pre-populated with activity context
  useEffect(() => {
    if (open) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      dispatch({
        type: 'reset',
        seed: {
          topic: activity?.topic ?? '',
          pic: activity?.pic ?? '',
          day: activity?.day ?? '',
          date: activity?.date ?? '',
          week: activity?.week ?? '',
          activityCount: activity?.activityCount ?? '',
        },
      });
      setCopied(false);
      setNotesOpen(false);
    }
  }, [open, activity]);

  function toggleVoiceDictation() {
    if (state.isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      dispatch({ type: 'voice-end' });
      return;
    }

    const SpeechClass = getSpeechRecognitionClass();
    if (!SpeechClass) return;

    try {
      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        dispatch({ type: 'voice-start' });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcriptText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptText += event.results[i][0].transcript;
        }
        dispatch({ type: 'voice-result', transcript: transcriptText });
      };

      recognition.onerror = (err) => {
        dispatch({ type: 'voice-error', error: `Voice dictation error: ${err.error}` });
      };

      recognition.onend = () => {
        dispatch({ type: 'voice-end' });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      dispatch({ type: 'voice-error', error: 'Could not access microphone' });
    }
  }

  async function requestSummary() {
    const rawText = [state.raw.trim(), state.transcript.trim()].filter(Boolean).join('\n');
    if (!rawText) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch({ type: 'structure-started' });
    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: rawText }),
      signal: controller.signal,
    }).catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return null;
      return null;
    });

    if (controller.signal.aborted) {
      return;
    }

    if (!response?.ok) {
      dispatch({ type: 'structure-failed', error: 'AI service unavailable' });
      return;
    }

    const payload: unknown = await response.json().catch(() => null);
    if (controller.signal.aborted) {
      return;
    }

    const generated = parseSummarizeResponse(payload);
    if (generated === null) {
      dispatch({ type: 'structure-failed', error: 'Structuring failed' });
      return;
    }

    const parsed = parseTakeawaysFromSummary(generated);
    dispatch({
      type: 'structure-succeeded',
      takeaways: [parsed.takeaway1, parsed.takeaway2, parsed.takeaway3],
      notes: parsed.notes,
    });
  }

  async function handleCopyTsv() {
    if (state.aiGenerated && !state.summaryConfirmed) return;
    const row = deriveDiaryClipboardRow(state, activity);
    if (!row) return;

    try {
      await navigator.clipboard.writeText(row);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore clipboard rejection in non-https */
    }
  }

  function save() {
    let effectiveState = state;
    if (effectiveState.aiGenerated && !effectiveState.summaryConfirmed) {
      dispatch({ type: 'confirm-structure' });
      effectiveState = { ...effectiveState, summaryConfirmed: true };
    }
    const submission = deriveLearningSubmission(effectiveState, activity);
    if (submission === null) return;
    onSave(submission);
  }

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
    rawNotesRef.current?.focus();
    return () => { previous?.focus(); };
  }, [open]);

  if (!open) return null;

  const topicName = activity?.topic || state.topic || 'Learning Reflection';
  const hasStructuredTakeaways = Boolean(
    state.takeaway1.trim() ||
    state.takeaway2.trim() ||
    state.takeaway3.trim() ||
    state.summary?.trim()
  );
  const canSave = state.aiGenerated
    ? hasStructuredTakeaways
    : canSaveLearning(state);
  const isUnconfirmedAi = state.aiGenerated && !state.summaryConfirmed;
  const copyDisabled = isUnconfirmedAi || !canCopyDiary(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-busy={state.status === 'summarizing' || state.isStructuring}
        className="animate-pop-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-white p-6 shadow-lift sm:p-8"
      >
        {/* Pre-filled Metadata Header */}
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-mint-700">
            <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-mint-100 text-sm font-semibold">✓</span>
            Activity complete · Onboarding Diary
          </p>
          <h2 id={TITLE_ID} className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">{topicName}</h2>

          {/* Activity Metadata Badges */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
            {activity?.pic && (
              <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">
                👤 {activity.pic}
              </span>
            )}
            {activity?.date && (
              <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">
                📅 {activity.date}
              </span>
            )}
            {activity?.day && (
              <span className="rounded-full bg-sun-50 px-3 py-1 font-medium text-sun-800">
                ☀️ {activity.day}
              </span>
            )}
            {activity?.week !== undefined && activity.week !== '' && (
              <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">
                {typeof activity.week === 'number' ? `Week ${activity.week}` : activity.week}
              </span>
            )}
            {activity?.activityCount !== undefined && activity.activityCount !== '' && (
              <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">
                Activity #{activity.activityCount}
              </span>
            )}
          </div>
        </div>

        {/* Scratchpad & Voice Dictation */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
          <label htmlFor="raw-thoughts-input" className="block text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
            Raw Thoughts / Voice Scratchpad
          </label>
          <textarea
            id="raw-thoughts-input"
            ref={rawNotesRef}
            aria-label="Raw thoughts or voice scratchpad"
            placeholder="Speak or type raw thoughts, bullet points, or session reflections here..."
            value={state.raw}
            onChange={event => dispatch({ type: 'type-raw', content: event.target.value })}
            rows={3}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-mint-400 focus:ring-mint-400"
          />

          {/* Live Voice Transcript Banner if active */}
          {state.transcript && (
            <div className="mt-3 rounded-xl bg-peach-50 p-3 text-xs text-peach-900">
              <p className="font-semibold">Live Speech Transcript:</p>
              <p className="mt-1">{state.transcript}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'apply-transcript-to-raw' })}
                  className="rounded-lg bg-peach-200 px-2.5 py-1 text-xs font-medium text-peach-900 transition hover:bg-peach-300"
                >
                  Append to Raw Thoughts
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'apply-transcript-to-notes' })}
                  className="rounded-lg bg-peach-200 px-2.5 py-1 text-xs font-medium text-peach-900 transition hover:bg-peach-300"
                >
                  Append to Notes
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'voice-clear' })}
                  className="rounded-lg px-2 py-1 text-xs text-stone-500 hover:text-stone-700"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Voice Dictate & AI Structuring buttons */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              {speechSupported ? (
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  aria-pressed={state.isListening}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    state.isListening
                      ? 'animate-pulse-soft bg-peach-100 text-peach-700 ring-2 ring-peach-300'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {state.isListening ? '🛑 Stop Listening' : '🎙️ Voice Dictate'}
                </button>
              ) : (
                <span className="text-xs text-stone-400">🎙️ Voice dictation unavailable in this browser</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => void requestSummary()}
              disabled={!canRequestSummary(state)}
              className="min-h-11 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-40"
            >
              {state.status === 'summarizing' || state.isStructuring ? 'Structuring…' : '✨ Structure with AI'}
            </button>
          </div>
        </div>

        {/* ADR-0003 Review and Confirmation Banner */}
        {state.aiGenerated && (
          <div className="mt-4 rounded-2xl bg-lavender-50 p-4">
            <p className="text-xs font-medium text-lavender-700">
              ✨ AI structured these takeaways from your notes. Review, edit, and confirm below:
            </p>
            <label className="mt-2.5 flex items-center gap-2 text-sm font-medium text-stone-800">
              <input
                type="checkbox"
                checked={state.summaryConfirmed}
                onChange={event => dispatch(event.target.checked ? { type: 'confirm-structure' } : { type: 'type-takeaway1', content: state.takeaway1 })}
                className="h-4 w-4 rounded border-stone-300 text-mint-600 focus:ring-mint-500"
              />
              I reviewed and confirm these takeaways
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'reject-structure' })}
              className="mt-2 min-h-11 text-xs text-stone-500 underline underline-offset-4 transition hover:text-stone-700"
            >
              Use my own notes instead
            </button>
          </div>
        )}

        {/* Guided 3 Takeaways */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Guided 3 Takeaways (Diary Sheet Column G)
            </h3>
          </div>

          <div>
            <label htmlFor="takeaway-1-input" className="block text-xs font-medium text-stone-700">
              1. Core Concept / Knowledge
            </label>
            <p className="text-xs text-stone-400">What fundamental concept or architecture did you learn?</p>
            <textarea
              id="takeaway-1-input"
              aria-label="1. Core Concept / Knowledge"
              placeholder="e.g. Understood how the Google Sheets sync queue batches local writes"
              value={state.takeaway1}
              onChange={event => dispatch({ type: 'type-takeaway1', content: event.target.value })}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-stone-200 p-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-mint-400 focus:ring-mint-400"
            />
          </div>

          <div>
            <label htmlFor="takeaway-2-input" className="block text-xs font-medium text-stone-700">
              2. Process & Standard
            </label>
            <p className="text-xs text-stone-400">What process, workflow, or operating standard was covered?</p>
            <textarea
              id="takeaway-2-input"
              aria-label="2. Process & Standard"
              placeholder="e.g. Followed the 4-step deployment review procedure and checklist"
              value={state.takeaway2}
              onChange={event => dispatch({ type: 'type-takeaway2', content: event.target.value })}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-stone-200 p-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-mint-400 focus:ring-mint-400"
            />
          </div>

          <div>
            <label htmlFor="takeaway-3-input" className="block text-xs font-medium text-stone-700">
              3. Practical Application
            </label>
            <p className="text-xs text-stone-400">How will you apply this in your daily responsibilities?</p>
            <textarea
              id="takeaway-3-input"
              aria-label="3. Practical Application"
              placeholder="e.g. Will configure local environment secrets in .env.local without committing"
              value={state.takeaway3}
              onChange={event => dispatch({ type: 'type-takeaway3', content: event.target.value })}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-stone-200 p-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-mint-400 focus:ring-mint-400"
            />
          </div>
        </div>

        {/* Expandable Personal Notes & Follow-ups */}
        <div className="mt-5 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => setNotesOpen(!notesOpen)}
            aria-expanded={notesOpen}
            className="flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-700"
          >
            <span>{notesOpen || state.notes.trim() ? '▾' : '▸'}</span>
            Personal Notes & Follow-ups (Optional)
          </button>

          {(notesOpen || state.notes.trim() !== '') && (
            <textarea
              aria-label="Personal Notes & Follow-ups"
              placeholder="Add reminders, mentor questions, observations, or follow-up items..."
              value={state.notes}
              onChange={event => dispatch({ type: 'type-notes', content: event.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border border-stone-200 p-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-mint-400 focus:ring-mint-400"
            />
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => void handleCopyTsv()}
            disabled={copyDisabled}
            title={isUnconfirmedAi ? 'Please review and confirm takeaways above before copying' : undefined}
            className={`min-h-11 rounded-full px-4 py-2 text-xs font-semibold transition ${
              copyDisabled
                ? 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400 opacity-60'
                : copied
                  ? 'border border-mint-300 bg-mint-100 text-mint-800 ring-1 ring-mint-300'
                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            {copied
              ? '✓ Copied for Diary Sheet!'
              : isUnconfirmedAi
                ? '📋 Confirm to Copy'
                : '📋 Copy for Diary Sheet'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="min-h-11 rounded-full px-3 py-2 text-xs font-medium text-stone-500 underline underline-offset-4 transition hover:text-stone-700"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-40"
            >
              {state.aiGenerated ? 'Confirm & save' : 'Save & continue'}
            </button>
          </div>
        </div>

        {state.status === 'summarize-failed' && (
          <p className="mt-3 text-center text-sm text-peach-700" role="status">
            The summary is unavailable right now. Your notes are safe — you can still save them as-is.
          </p>
        )}
        {state.aiError && state.status !== 'summarize-failed' && (
          <p className="mt-3 text-center text-xs text-peach-700" role="status">
            {state.aiError}
          </p>
        )}
      </section>
    </div>
  );
}
