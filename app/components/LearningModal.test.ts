import { initialLearningDraft, learningDraftReducer } from '@/lib/learning-draft';
import type { LearningDraftAction, LearningDraftState } from '@/lib/learning-draft';
import { canRequestSummary, deriveLearningSubmission, parseSummarizeResponse, tabWrapTarget } from './LearningModal';

const RAW = 'Learned how the sync queue defers writes to Google Sheets';

function draft(actions: LearningDraftAction[]): LearningDraftState {
  return actions.reduce(learningDraftReducer, initialLearningDraft());
}

describe('parseSummarizeResponse', () => {
  it('accepts a well-formed summarize response and returns the summary', () => {
    expect(parseSummarizeResponse({ raw: RAW, summary: 'Structured summary', confirmed: false, requiresConfirmation: true })).toBe('Structured summary');
  });

  it('ignores confirmation flags in the body and returns only the summary text', () => {
    expect(parseSummarizeResponse({ summary: 'Tempting summary', confirmed: true, requiresConfirmation: false })).toBe('Tempting summary');
  });

  it('trims surrounding whitespace from the summary', () => {
    expect(parseSummarizeResponse({ summary: '  Structured summary  ' })).toBe('Structured summary');
  });

  it('caps the summary at the boundary length', () => {
    expect(parseSummarizeResponse({ summary: 'x'.repeat(10_005) })).toHaveLength(10_000);
  });

  it('rejects a body without a summary field', () => {
    expect(parseSummarizeResponse({ raw: RAW, confirmed: false })).toBe(null);
  });

  it('rejects a non-string summary', () => {
    expect(parseSummarizeResponse({ summary: 42 })).toBe(null);
    expect(parseSummarizeResponse({ summary: null })).toBe(null);
    expect(parseSummarizeResponse({ summary: ['Summary'] })).toBe(null);
  });

  it('rejects a whitespace-only summary', () => {
    expect(parseSummarizeResponse({ summary: '   ' })).toBe(null);
  });

  it('rejects non-object bodies', () => {
    expect(parseSummarizeResponse(null)).toBe(null);
    expect(parseSummarizeResponse('Summary')).toBe(null);
    expect(parseSummarizeResponse(42)).toBe(null);
    expect(parseSummarizeResponse([{ summary: 'Summary' }])).toBe(null);
  });
});

describe('deriveLearningSubmission', () => {
  it('derives trimmed manual content from raw notes', () => {
    expect(deriveLearningSubmission(draft([{ type: 'type-raw', content: `  ${RAW}  ` }]))).toEqual({ content: RAW, source: 'manual' });
  });

  it('falls back to the manual raw notes while the summary is unconfirmed', () => {
    expect(deriveLearningSubmission(draft([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Unconfirmed summary' },
    ]))).toEqual({ content: RAW, source: 'manual' });
  });

  it('classifies a confirmed summary as ai-assisted', () => {
    expect(deriveLearningSubmission(draft([
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'confirm-summary' },
    ]))).toEqual({ content: 'Structured summary', source: 'ai-assisted' });
  });

  it('returns the manual raw notes after an edit invalidates the confirmation', () => {
    expect(deriveLearningSubmission(draft([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'confirm-summary' },
      { type: 'edit-summary', content: 'Edited by the employee' },
    ]))).toEqual({ content: RAW, source: 'manual' });
  });

  it('classifies a re-confirmed edited summary as ai-assisted', () => {
    expect(deriveLearningSubmission(draft([
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'confirm-summary' },
      { type: 'edit-summary', content: 'Edited by the employee' },
      { type: 'confirm-summary' },
    ]))).toEqual({ content: 'Edited by the employee', source: 'ai-assisted' });
  });

  it('returns null when the draft holds no saveable content', () => {
    expect(deriveLearningSubmission(initialLearningDraft())).toBe(null);
  });

  it('returns null for an unconfirmed summary without raw notes', () => {
    expect(deriveLearningSubmission(draft([{ type: 'summarize-succeeded', summary: 'Unconfirmed summary' }]))).toBe(null);
  });

  it('falls back to the manual raw notes when the confirmed summary is whitespace only', () => {
    expect(deriveLearningSubmission(draft([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: '   ' },
      { type: 'confirm-summary' },
    ]))).toEqual({ content: RAW, source: 'manual' });
  });
});

describe('canRequestSummary', () => {
  it('is true when the draft is idle with non-empty raw notes', () => {
    expect(canRequestSummary(draft([{ type: 'type-raw', content: RAW }]))).toBe(true);
  });

  it('is false when the raw notes are empty', () => {
    expect(canRequestSummary(initialLearningDraft())).toBe(false);
  });

  it('is false when the raw notes are whitespace only', () => {
    expect(canRequestSummary(draft([{ type: 'type-raw', content: '   ' }]))).toBe(false);
  });

  it('is false while a summarize request is in flight', () => {
    expect(canRequestSummary(draft([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
    ]))).toBe(false);
  });

  it('is true again after the provider fails, so the user can retry', () => {
    expect(canRequestSummary(draft([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
      { type: 'summarize-failed' },
    ]))).toBe(true);
  });

  it('is true when regenerating after a confirmed summary', () => {
    expect(canRequestSummary(draft([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Confirmed summary' },
      { type: 'confirm-summary' },
    ]))).toBe(true);
  });
});

describe('tabWrapTarget', () => {
  const focusable = ['raw-textarea', 'confirm-checkbox', 'skip-button'] as const;

  it('wraps Tab from the last focusable element back to the first', () => {
    expect(tabWrapTarget('skip-button', focusable, false)).toBe('raw-textarea');
  });

  it('wraps Shift+Tab from the first focusable element to the last', () => {
    expect(tabWrapTarget('raw-textarea', focusable, true)).toBe('skip-button');
  });

  it('lets Tab continue naturally from a middle element', () => {
    expect(tabWrapTarget('confirm-checkbox', focusable, false)).toBe(null);
  });

  it('lets Shift+Tab continue naturally from a middle element', () => {
    expect(tabWrapTarget('confirm-checkbox', focusable, true)).toBe(null);
  });

  it('traps both directions on a single focusable element', () => {
    expect(tabWrapTarget('only', ['only'], false)).toBe('only');
    expect(tabWrapTarget('only', ['only'], true)).toBe('only');
  });

  it('returns null when the dialog has no focusable elements', () => {
    expect(tabWrapTarget('raw-textarea', [], false)).toBe(null);
  });

  it('returns null when the active element sits outside the dialog', () => {
    expect(tabWrapTarget(null, focusable, false)).toBe(null);
    expect(tabWrapTarget(null, focusable, true)).toBe(null);
  });
});
