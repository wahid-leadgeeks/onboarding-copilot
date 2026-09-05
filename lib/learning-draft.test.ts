import { canSaveLearning, initialLearningDraft, learningDraftReducer, resolvedContent } from './learning-draft';
import type { LearningDraftAction, LearningDraftState } from './learning-draft';

const RAW = 'Learned how the sync queue defers writes to Google Sheets';

function run(actions: LearningDraftAction[], initial: LearningDraftState = initialLearningDraft()): LearningDraftState {
  return actions.reduce(learningDraftReducer, initial);
}

describe('initialLearningDraft', () => {
  it('starts empty and idle', () => {
    expect(initialLearningDraft()).toEqual({ raw: '', summary: null, summaryConfirmed: false, status: 'idle' });
  });

  it('seeds the raw notes without generating or confirming a summary', () => {
    expect(initialLearningDraft(RAW)).toEqual({ raw: RAW, summary: null, summaryConfirmed: false, status: 'idle' });
  });
});

describe('learningDraftReducer', () => {
  it('records typing into the raw notes and leaves the AI flow untouched', () => {
    const confirmed = run([{ type: 'summarize-succeeded', summary: 'Structured summary' }, { type: 'confirm-summary' }]);
    const state = learningDraftReducer(confirmed, { type: 'type-raw', content: RAW });
    expect(state).toEqual({ raw: RAW, summary: 'Structured summary', summaryConfirmed: true, status: 'idle' });
  });

  it('marks the draft as summarizing while keeping the raw notes and any previous summary', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'summarize-started' },
    ]);
    expect(state).toEqual({ raw: RAW, summary: 'Structured summary', summaryConfirmed: false, status: 'summarizing' });
  });

  it('stores a succeeded summary as unconfirmed and returns to idle', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
      { type: 'summarize-succeeded', summary: 'Structured summary' },
    ]);
    expect(state).toEqual({ raw: RAW, summary: 'Structured summary', summaryConfirmed: false, status: 'idle' });
  });

  it('treats a regenerated summary as unconfirmed even after the previous one was confirmed', () => {
    const state = run([
      { type: 'summarize-succeeded', summary: 'First summary' },
      { type: 'confirm-summary' },
      { type: 'summarize-started' },
      { type: 'summarize-succeeded', summary: 'Second summary' },
    ]);
    expect(state).toEqual({ raw: '', summary: 'Second summary', summaryConfirmed: false, status: 'idle' });
  });

  it('marks failure without discarding the raw notes', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
      { type: 'summarize-failed' },
    ]);
    expect(state).toEqual({ raw: RAW, summary: null, summaryConfirmed: false, status: 'summarize-failed' });
  });

  it('preserves a previously confirmed summary when a later summarize attempt fails', () => {
    const state = run([
      { type: 'summarize-succeeded', summary: 'First summary' },
      { type: 'confirm-summary' },
      { type: 'summarize-started' },
      { type: 'summarize-failed' },
    ]);
    expect(state).toEqual({ raw: '', summary: 'First summary', summaryConfirmed: true, status: 'summarize-failed' });
  });

  it('confirms the generated summary', () => {
    const state = run([{ type: 'summarize-succeeded', summary: 'Structured summary' }, { type: 'confirm-summary' }]);
    expect(state).toEqual({ raw: '', summary: 'Structured summary', summaryConfirmed: true, status: 'idle' });
  });

  it('returns the state unchanged when confirming without a summary', () => {
    const before = initialLearningDraft(RAW);
    expect(learningDraftReducer(before, { type: 'confirm-summary' })).toBe(before);
  });

  it('resets confirmation when the summary is edited', () => {
    const state = run([
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'confirm-summary' },
      { type: 'edit-summary', content: 'Edited by the employee' },
    ]);
    expect(state).toEqual({ raw: '', summary: 'Edited by the employee', summaryConfirmed: false, status: 'idle' });
  });

  it('returns the state unchanged when editing without a summary', () => {
    const before = initialLearningDraft(RAW);
    expect(learningDraftReducer(before, { type: 'edit-summary', content: 'Edited by the employee' })).toBe(before);
  });

  it('clears the summary but preserves the raw notes on rejection', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'confirm-summary' },
      { type: 'reject-summary' },
    ]);
    expect(state).toEqual({ raw: RAW, summary: null, summaryConfirmed: false, status: 'idle' });
  });

  it('resets a dirty draft back to the empty initial state', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'confirm-summary' },
      { type: 'reset' },
    ]);
    expect(state).toEqual(initialLearningDraft());
  });
});

describe('canSaveLearning', () => {
  it('is false for an empty draft', () => {
    expect(canSaveLearning(initialLearningDraft())).toBe(false);
  });

  it('is false for whitespace-only notes', () => {
    expect(canSaveLearning(run([{ type: 'type-raw', content: '   ' }]))).toBe(false);
  });

  it('is false when only an unconfirmed summary exists', () => {
    expect(canSaveLearning(run([{ type: 'summarize-succeeded', summary: 'Unconfirmed summary' }]))).toBe(false);
  });

  it('is true once the summary is confirmed', () => {
    expect(canSaveLearning(run([
      { type: 'summarize-succeeded', summary: 'Confirmed summary' },
      { type: 'confirm-summary' },
    ]))).toBe(true);
  });

  it('stays true for manual notes after the provider fails', () => {
    expect(canSaveLearning(run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
      { type: 'summarize-failed' },
    ]))).toBe(true);
  });
});

describe('resolvedContent', () => {
  it('resolves to null for an empty draft', () => {
    expect(resolvedContent(initialLearningDraft())).toBe(null);
  });

  it('prefers a confirmed summary over the raw notes', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Confirmed summary' },
      { type: 'confirm-summary' },
    ]);
    expect(resolvedContent(state)).toBe('Confirmed summary');
  });

  it('falls back to the raw notes while the summary is unconfirmed', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Unconfirmed summary' },
    ]);
    expect(resolvedContent(state)).toBe(RAW);
  });

  it('resolves the manual notes after the provider fails', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
      { type: 'summarize-failed' },
    ]);
    expect(resolvedContent(state)).toBe(RAW);
  });

  it('trims surrounding whitespace from the resolved content', () => {
    expect(resolvedContent(run([{ type: 'type-raw', content: `  ${RAW}  ` }]))).toBe(RAW);
  });

  it('falls back to the raw notes when a confirmed summary is whitespace only', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: '   ' },
      { type: 'confirm-summary' },
    ]);
    expect(resolvedContent(state)).toBe(RAW);
  });

  it('resolves to null after rejection leaves no raw notes', () => {
    expect(resolvedContent(run([
      { type: 'summarize-succeeded', summary: 'Rejected summary' },
      { type: 'reject-summary' },
    ]))).toBe(null);
  });
});
