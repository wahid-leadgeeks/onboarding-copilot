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
import {
  IconCheck,
  IconUser,
  IconCalendar,
  IconClock,
  IconEdit,
  IconMic,
  IconMicOff,
  IconSparkles,
  IconChevronDown,
} from './Icons';
import { SheetToolsMenu, type SheetToolsMenuItem } from './SheetToolsMenu';
import { useRestoreFocus } from './useRestoreFocus';

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

export type LearningStage = 'write' | 'review' | 'takeaways';

/**
 * Which part of the capture is on screen. Render-only: the draft reducer is
 * unchanged, this only decides what to disclose.
 * - 'write': one "What did you learn?" box, dictation and "Summarize for me".
 * - 'review': an unconfirmed AI draft waiting for Confirm / Edit / Revert.
 * - 'takeaways': the three takeaway fields (opened by the user, or a confirmed
 *   AI draft — never 'write', so Save stays reachable).
 * Manual takeaways or notes already typed keep 'takeaways' open so nothing that
 * would be saved is ever hidden.
 */
export function learningStage(state: LearningDraftState, takeawaysOpen: boolean): LearningStage {
  if (state.aiGenerated) {
    return state.summaryConfirmed || takeawaysOpen ? 'takeaways' : 'review';
  }
  if (takeawaysOpen) return 'takeaways';
  const hasManualContent = [state.takeaway1, state.takeaway2, state.takeaway3, state.notes].some((v) => v.trim() !== '');
  return hasManualContent ? 'takeaways' : 'write';
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
  const [takeawaysOpen, setTakeawaysOpen] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const dialogRef = useRef<HTMLElement | null>(null);
  const rawNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const takeaway1Ref = useRef<HTMLTextAreaElement | null>(null);
  const saveRef = useRef<HTMLButtonElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Move focus into the dialog on open and give it back to the opener on close.
  useRestoreFocus(open, rawNotesRef);

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
      setTakeawaysOpen(false);
    }
  }, [open, activity]);

  /** Focus an element once the stage change it depends on has rendered. */
  function focusSoon(ref: { readonly current: HTMLElement | null }) {
    window.setTimeout(() => ref.current?.focus(), 0);
  }

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

  // ADR-0003: never confirm AI output on the user's behalf. Save is only enabled
  // when canSaveLearning(state) holds, so an unconfirmed AI draft cannot be saved.
  function save() {
    if (!canSaveLearning(state)) return;
    const submission = deriveLearningSubmission(state, activity);
    if (submission === null) return;
    onSave(submission);
  }

  function confirmDraft() {
    dispatch({ type: 'confirm-structure' });
    setTakeawaysOpen(true);
    focusSoon(saveRef);
  }

  function editDraft() {
    setTakeawaysOpen(true);
    focusSoon(takeaway1Ref);
  }

  function revertDraft() {
    dispatch({ type: 'reject-structure' });
    setTakeawaysOpen(false);
    focusSoon(rawNotesRef);
  }

  function writeTakeawaysMyself() {
    setTakeawaysOpen(true);
    focusSoon(takeaway1Ref);
  }

  // Keyboard-safe dialog: Escape dismisses, Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // React's listeners share `document` with this one, so the Sheet tools menu's
      // stopPropagation cannot stop it. Listening in the capture phase sees the menu
      // still open (React has not handled the key yet), so an Escape meant for the
      // menu — from an item or from its trigger — closes only the menu.
      if (event.target instanceof Element && event.target.closest('[role="menu"], [aria-haspopup="menu"][aria-expanded="true"]')) return;
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
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onSkip]);

  if (!open) return null;

  const stage = learningStage(state, takeawaysOpen);
  const topicName = activity?.topic || state.topic || 'Learning Reflection';
  const canSave = canSaveLearning(state);
  const isUnconfirmedAi = state.aiGenerated && !state.summaryConfirmed;
  const copyDisabled = isUnconfirmedAi || !canCopyDiary(state);
  const isSummarizing = state.status === 'summarizing' || state.isStructuring;
  const showNotes = notesOpen || state.notes.trim() !== '';
  const draftTakeaways = [state.takeaway1, state.takeaway2, state.takeaway3].map((t) => t.trim()).filter(Boolean);
  const saveHint = isUnconfirmedAi ? 'Confirm the AI draft to save it.' : null;

  const sheetItems: SheetToolsMenuItem[] = [
    {
      id: 'copy-diary-row',
      label: 'Copy for the spreadsheet',
      hint: isUnconfirmedAi ? 'Confirm the AI draft first' : 'Paste it into your onboarding diary',
      onSelect: handleCopyTsv,
      disabled: copyDisabled,
      state: copied ? 'done' : 'idle',
      doneLabel: 'Copied',
    },
  ];

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-mint-400 focus:ring-mint-400';
  const secondaryButton =
    'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-40 sm:min-h-9';
  const quietLink =
    'inline-flex min-h-11 items-center text-xs font-medium text-stone-600 underline underline-offset-4 transition hover:text-stone-900 sm:min-h-9';

  const takeawayFields = [
    {
      id: 'takeaway-1-input',
      label: '1. Core idea',
      help: 'What concept or system did you learn?',
      placeholder: 'e.g. How the sync queue batches writes made on this device',
      value: state.takeaway1,
      action: 'type-takeaway1' as const,
    },
    {
      id: 'takeaway-2-input',
      label: '2. How it’s done here',
      help: 'What process, workflow or standard was covered?',
      placeholder: 'e.g. The 4-step deployment review and its checklist',
      value: state.takeaway2,
      action: 'type-takeaway2' as const,
    },
    {
      id: 'takeaway-3-input',
      label: '3. How you’ll use it',
      help: 'How will you apply this in your day-to-day work?',
      placeholder: 'e.g. Keep local secrets out of commits when I set up my machine',
      value: state.takeaway3,
      action: 'type-takeaway3' as const,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 p-3 sm:p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-busy={isSummarizing}
        className="animate-pop-in flex max-h-[90vh] max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-white shadow-lift"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-8 sm:pt-8">
          {/* Activity context */}
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-700">
              <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-mint-100">
                <IconCheck className="h-3.5 w-3.5 text-mint-800" />
              </span>
              Activity complete · Learning reflection
            </p>
            <h2 id={TITLE_ID} className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">{topicName}</h2>

            <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs text-stone-600">
              {activity?.pic && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                  <IconUser className="h-3 w-3 text-stone-500" />
                  {activity.pic}
                </span>
              )}
              {activity?.date && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                  <IconCalendar className="h-3 w-3 text-stone-500" />
                  {activity.date}
                </span>
              )}
              {activity?.day && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-2.5 py-1 font-medium text-sun-800">
                  <IconClock className="h-3 w-3 text-sun-600" />
                  {activity.day}
                </span>
              )}
              {activity?.week !== undefined && activity.week !== '' && (
                <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                  {typeof activity.week === 'number' ? `Week ${activity.week}` : activity.week}
                </span>
              )}
              {activity?.activityCount !== undefined && activity.activityCount !== '' && (
                <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                  Activity #{activity.activityCount}
                </span>
              )}
            </div>
          </div>

          {/* Stage 1: write it down (always visible; later stages build on it) */}
          <div className="mt-5">
            <label htmlFor="raw-thoughts-input" className="block text-base font-semibold text-stone-900">
              What did you learn?
            </label>
            <p id="raw-thoughts-help" className="mt-0.5 text-xs text-stone-500">
              In your own words — bullet points are fine.
            </p>
            <textarea
              id="raw-thoughts-input"
              ref={rawNotesRef}
              aria-describedby="raw-thoughts-help"
              placeholder="Type or dictate what stood out…"
              value={state.raw}
              onChange={event => dispatch({ type: 'type-raw', content: event.target.value })}
              rows={stage === 'write' ? 4 : 3}
              className={fieldClass}
            />

            {state.transcript && (
              <div className="mt-3 rounded-xl bg-peach-50 p-3 text-xs text-peach-900">
                <p className="font-semibold">What we heard</p>
                <p className="mt-1">{state.transcript}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'apply-transcript-to-raw' })}
                    className="min-h-11 rounded-lg bg-peach-200 px-2.5 py-1 text-xs font-medium text-peach-900 transition hover:bg-peach-300 sm:min-h-8"
                  >
                    Add to what I learned
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'apply-transcript-to-notes' })}
                    className="min-h-11 rounded-lg bg-peach-200 px-2.5 py-1 text-xs font-medium text-peach-900 transition hover:bg-peach-300 sm:min-h-8"
                  >
                    Add to follow-up notes
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'voice-clear' })}
                    className="min-h-11 rounded-lg px-2 py-1 text-xs text-stone-600 hover:text-stone-900 sm:min-h-8"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {speechSupported ? (
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  aria-pressed={state.isListening}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition sm:min-h-9 ${
                    state.isListening
                      ? 'animate-pulse-soft bg-peach-100 text-peach-800 ring-2 ring-peach-300'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {state.isListening ? (
                    <>
                      <IconMicOff className="h-3.5 w-3.5" />
                      <span>Stop listening</span>
                    </>
                  ) : (
                    <>
                      <IconMic className="h-3.5 w-3.5" />
                      <span>Dictate</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                  <IconMicOff className="h-3.5 w-3.5" />
                  Voice dictation isn’t available in this browser
                </span>
              )}

              {stage === 'write' && (
                <button
                  type="button"
                  onClick={() => void requestSummary()}
                  disabled={!canRequestSummary(state)}
                  className={secondaryButton}
                >
                  {isSummarizing ? (
                    'Summarizing…'
                  ) : (
                    <>
                      <IconSparkles className="h-3.5 w-3.5 text-lavender-700" />
                      <span>Summarize for me</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {stage === 'write' && (
              <button type="button" onClick={writeTakeawaysMyself} className={`mt-1 ${quietLink}`}>
                Write takeaways myself
              </button>
            )}

            {state.status === 'summarize-failed' && (
              <p className="mt-2 text-sm text-peach-800" role="status">
                The summary isn’t available right now. Your notes are safe — you can still save them as they are.
              </p>
            )}
            {state.aiError && state.status !== 'summarize-failed' && (
              <p className="mt-2 text-xs text-peach-800" role="status">
                {state.aiError}
              </p>
            )}
          </div>

          {/* Stage 2: review the AI draft (ADR-0003 — nothing is saved until the user confirms) */}
          {stage === 'review' && (
            <div className="mt-5 rounded-2xl bg-lavender-50 p-4" role="group" aria-labelledby="ai-draft-title">
              <p id="ai-draft-title" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-lavender-800">
                <IconSparkles className="h-3.5 w-3.5 shrink-0" />
                AI draft
              </p>
              <p className="mt-1 text-xs text-stone-600">Check it matches what you learned. Nothing is saved until you confirm it.</p>
              {draftTakeaways.length > 0 ? (
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-stone-800">
                  {draftTakeaways.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-stone-700">The draft came back empty. Edit it or use your own notes instead.</p>
              )}
              {state.notes.trim() !== '' && (
                <p className="mt-3 whitespace-pre-line text-sm text-stone-700">
                  <span className="font-medium text-stone-800">Follow-up notes: </span>
                  {state.notes.trim()}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={confirmDraft}
                  disabled={draftTakeaways.length === 0}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-lavender-200 bg-white px-4 py-2 text-xs font-semibold text-lavender-900 transition hover:bg-lavender-100 disabled:opacity-40 sm:min-h-9"
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  <span>Looks right — confirm</span>
                </button>
                <button type="button" onClick={editDraft} className={secondaryButton}>
                  <IconEdit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button type="button" onClick={revertDraft} className={quietLink}>
                  Use my own notes instead
                </button>
              </div>
            </div>
          )}

          {/* Stage 3: the three takeaways */}
          {stage === 'takeaways' && (
            <div className="mt-6">
              {state.aiGenerated && (
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-lavender-50 px-4 py-3">
                  <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-lavender-900" role="status">
                    <IconSparkles className="h-3.5 w-3.5 shrink-0" />
                    {state.summaryConfirmed
                      ? 'AI draft confirmed. If you change it, you’ll confirm again.'
                      : 'Check your edits to the AI draft, then confirm.'}
                  </p>
                  {!state.summaryConfirmed && (
                    <button
                      type="button"
                      onClick={confirmDraft}
                      disabled={draftTakeaways.length === 0}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-lavender-200 bg-white px-4 py-2 text-xs font-semibold text-lavender-900 transition hover:bg-lavender-100 disabled:opacity-40 sm:min-h-9"
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                      <span>Confirm takeaways</span>
                    </button>
                  )}
                  <button type="button" onClick={revertDraft} className={quietLink}>
                    Use my own notes instead
                  </button>
                </div>
              )}

              <h3 className="text-base font-semibold text-stone-900">Your 3 takeaways</h3>
              <p className="mt-0.5 text-xs text-stone-500">Short answers are fine. Leave any you don’t need blank.</p>

              <div className="mt-3 space-y-4">
                {takeawayFields.map((field, index) => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="block text-sm font-medium text-stone-800">
                      {field.label}
                    </label>
                    <p id={`${field.id}-help`} className="text-xs text-stone-500">{field.help}</p>
                    <textarea
                      id={field.id}
                      ref={index === 0 ? takeaway1Ref : undefined}
                      aria-describedby={`${field.id}-help`}
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={event => dispatch({ type: field.action, content: event.target.value })}
                      rows={2}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-stone-100 pt-3">
                <button
                  type="button"
                  onClick={() => setNotesOpen(!notesOpen)}
                  aria-expanded={showNotes}
                  aria-controls="learning-notes-input"
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-stone-600 hover:text-stone-900 sm:min-h-9"
                >
                  <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? 'rotate-0' : '-rotate-90'}`} />
                  Follow-up notes (optional)
                </button>
                {showNotes && (
                  <textarea
                    id="learning-notes-input"
                    aria-label="Follow-up notes"
                    placeholder="Reminders, questions for your mentor, things to look into…"
                    value={state.notes}
                    onChange={event => dispatch({ type: 'type-notes', content: event.target.value })}
                    rows={3}
                    className={fieldClass}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer: always visible, so Save never needs scrolling */}
        <div className="shrink-0 border-t border-stone-100 bg-white px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:pb-4">
          {saveHint && (
            <p id="learning-save-hint" className="mb-2 text-right text-xs text-stone-500">
              {saveHint}
            </p>
          )}
          <div className="flex items-center gap-2">
            <SheetToolsMenu items={sheetItems} placement="up" align="start" className="mr-auto" />
            <button
              type="button"
              onClick={onSkip}
              className="min-h-11 rounded-full px-3 py-2 text-xs font-medium text-stone-600 underline underline-offset-4 transition hover:text-stone-900"
            >
              Skip for now
            </button>
            <button
              ref={saveRef}
              type="button"
              onClick={save}
              disabled={!canSave}
              aria-describedby={saveHint ? 'learning-save-hint' : undefined}
              className="min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
