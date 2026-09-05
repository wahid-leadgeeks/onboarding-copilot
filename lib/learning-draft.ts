/**
 * Pure state machine for the post-session learning capture (ADR-0003).
 *
 * AI output is untrusted: a generated summary reaches the saved record only
 * after explicit user confirmation, editing or rejecting it resets that
 * confirmation, and a provider failure never blocks manual capture.
 */

/** Status of the summarize flow: settled, in flight, or failed. */
export type LearningDraftStatus = 'idle' | 'summarizing' | 'summarize-failed';

export type LearningDraftState = {
  /** Raw, user-authored notes. Always the fallback content. */
  raw: string;
  /** AI-generated summary; null until one has been generated. */
  summary: string | null;
  /** True only after the user explicitly confirmed the current summary. */
  summaryConfirmed: boolean;
  status: LearningDraftStatus;
};

export type LearningDraftAction =
  | { type: 'type-raw'; content: string }
  | { type: 'summarize-started' }
  | { type: 'summarize-succeeded'; summary: string }
  | { type: 'summarize-failed' }
  | { type: 'confirm-summary' }
  | { type: 'edit-summary'; content: string }
  | { type: 'reject-summary' }
  | { type: 'reset' };

/** Fresh draft, optionally seeded with existing raw notes. */
export function initialLearningDraft(raw = ''): LearningDraftState {
  return { raw, summary: null, summaryConfirmed: false, status: 'idle' };
}

export function learningDraftReducer(state: LearningDraftState, action: LearningDraftAction): LearningDraftState {
  switch (action.type) {
    case 'type-raw':
      return { ...state, raw: action.content };
    case 'summarize-started':
      return { ...state, status: 'summarizing' };
    case 'summarize-succeeded':
      return { ...state, summary: action.summary, summaryConfirmed: false, status: 'idle' };
    case 'summarize-failed':
      return { ...state, status: 'summarize-failed' };
    case 'confirm-summary':
      return state.summary === null ? state : { ...state, summaryConfirmed: true };
    case 'edit-summary':
      return state.summary === null ? state : { ...state, summary: action.content, summaryConfirmed: false };
    case 'reject-summary':
      return { ...state, summary: null, summaryConfirmed: false };
    case 'reset':
      return initialLearningDraft();
  }
}

/** Content that would be persisted: the confirmed summary, else the raw notes; null when empty. */
export function resolvedContent(state: LearningDraftState): string | null {
  if (state.summaryConfirmed && state.summary !== null) {
    const summary = state.summary.trim();
    if (summary !== '') return summary;
  }
  const raw = state.raw.trim();
  return raw !== '' ? raw : null;
}

/** Whether the draft holds saveable, user-owned content. */
export function canSaveLearning(state: LearningDraftState): boolean {
  return resolvedContent(state) !== null;
}
