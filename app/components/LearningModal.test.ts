import { initialLearningDraft, learningDraftReducer } from '@/lib/learning-draft';
import type { LearningDraftAction, LearningDraftState } from '@/lib/learning-draft';
import {
  canCopyDiary,
  canRequestSummary,
  canSaveLearning,
  deriveDiaryClipboardRow,
  deriveLearningSubmission,
  formatDiaryContent,
  parseSummarizeResponse,
  tabWrapTarget,
} from './LearningModal';

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

describe('deriveLearningSubmission & canSaveLearning (Defect 1: Confirmation Gate)', () => {
  it('derives trimmed manual content from raw notes', () => {
    expect(deriveLearningSubmission(draft([{ type: 'type-raw', content: `  ${RAW}  ` }]))).toEqual({ content: RAW, source: 'manual' });
  });

  it('blocks submission and returns null when AI structuring is unconfirmed, even with raw notes', () => {
    const state = draft([
      { type: 'type-raw', content: RAW },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
    ]);
    expect(deriveLearningSubmission(state)).toBe(null);
    expect(canSaveLearning(state)).toBe(false);
  });

  it('classifies a confirmed summary as ai-assisted with takeaways intact', () => {
    const state = draft([
      { type: 'type-raw', content: RAW },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
      { type: 'confirm-structure' },
    ]);
    expect(canSaveLearning(state)).toBe(true);
    const sub = deriveLearningSubmission(state);
    expect(sub?.content).toBe('1. AI 1\n2. AI 2\n3. AI 3');
    expect(sub?.source).toBe('ai-assisted');
    expect(sub?.takeaways).toEqual(['AI 1', 'AI 2', 'AI 3']);
  });

  it('blocks save when editing takeaways invalidates confirmation', () => {
    const state = draft([
      { type: 'type-raw', content: RAW },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
      { type: 'confirm-structure' },
      { type: 'type-takeaway1', content: 'User edited takeaway' },
    ]);
    expect(canSaveLearning(state)).toBe(false);
    expect(deriveLearningSubmission(state)).toBe(null);
  });

  it('allows save after re-confirming edited takeaways and preserves user edits', () => {
    const state = draft([
      { type: 'type-raw', content: RAW },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
      { type: 'confirm-structure' },
      { type: 'type-takeaway1', content: 'User edited takeaway' },
      { type: 'confirm-structure' },
    ]);
    expect(canSaveLearning(state)).toBe(true);
    expect(deriveLearningSubmission(state)?.takeaways).toEqual([
      'User edited takeaway',
      'AI 2',
      'AI 3',
    ]);
  });

  it('allows saving manual raw notes after explicit rejection of AI structure', () => {
    const state = draft([
      { type: 'type-raw', content: RAW },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
      { type: 'reject-structure' },
    ]);
    expect(canSaveLearning(state)).toBe(true);
    expect(deriveLearningSubmission(state)).toEqual({ content: RAW, source: 'manual' });
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

  it('derives submission with activity context', () => {
    const activity = {
      topic: 'Architecture Overview',
      pic: 'Arief',
      day: 'Day 1',
      date: '2026-09-07',
      week: 1,
      activityCount: 1,
    };
    const state = draft([{ type: 'type-raw', content: RAW }]);
    const sub = deriveLearningSubmission(state, activity);
    expect(sub).toEqual({
      content: RAW,
      source: 'manual',
      topic: 'Architecture Overview',
      pic: 'Arief',
      day: 'Day 1',
      date: '2026-09-07',
      week: 1,
      activityCount: 1,
    });
  });
});

describe('Challenger M1-2 Defect 3: Clipboard Copy Confirmation Gate', () => {
  const activity = {
    topic: 'Architecture Overview',
    pic: 'Arief',
    day: 'Day 1',
    date: '2026-09-07',
    week: 1,
    activityCount: 1,
  };

  it('disables clipboard copy (canCopyDiary is false) when AI takeaways are unconfirmed', () => {
    const state = draft([
      { type: 'type-raw', content: 'Raw thoughts' },
      { type: 'structure-succeeded', takeaways: ['AI Point 1', 'AI Point 2', 'AI Point 3'] },
    ]);
    expect(state.summaryConfirmed).toBe(false);
    expect(canCopyDiary(state)).toBe(false);
  });

  it('prevents unconfirmed AI takeaways from leaking into clipboard TSV row', () => {
    const state = draft([
      { type: 'type-raw', content: 'Raw thoughts' },
      { type: 'structure-succeeded', takeaways: ['Unverified AI Claim 1', 'Unverified AI Claim 2', 'Unverified AI Claim 3'] },
    ]);

    const row = deriveDiaryClipboardRow(state, activity);
    // Either returns null or serializes only manual content, NEVER unconfirmed AI takeaways
    if (row !== null) {
      expect(row.includes('Unverified AI Claim 1')).toBe(false);
      expect(row.includes('Unverified AI Claim 2')).toBe(false);
      expect(row.includes('Unverified AI Claim 3')).toBe(false);
    }
  });

  it('enables clipboard copy once AI takeaways are confirmed, producing exact 9-column TSV', () => {
    const state = draft([
      { type: 'type-raw', content: 'Raw thoughts' },
      { type: 'structure-succeeded', takeaways: ['Confirmed 1', 'Confirmed 2', 'Confirmed 3'], notes: 'Verified notes' },
      { type: 'confirm-structure' },
    ]);

    expect(canCopyDiary(state)).toBe(true);

    const row = deriveDiaryClipboardRow(state, activity);
    expect(row).not.toBe(null);

    const cells = row!.split('\t');
    expect(cells).toHaveLength(9);
    expect(cells[0]).toBe('Day 1');
    expect(cells[1]).toBe('1');
    expect(cells[2]).toBe('2026-09-07');
    expect(cells[3]).toBe('1');
    expect(cells[4]).toBe('Arief');
    expect(cells[5]).toBe('Architecture Overview');
    // Column 6: Takes exact 3 takeaways
    expect(cells[6].includes('1. Confirmed 1\n2. Confirmed 2\n3. Confirmed 3')).toBe(true);
    // Column 7: Notes
    expect(cells[7]).toBe('Verified notes');
  });

  it('invalidates clipboard copy when takeaways are edited post-confirmation', () => {
    const state = draft([
      { type: 'structure-succeeded', takeaways: ['T1', 'T2', 'T3'] },
      { type: 'confirm-structure' },
      { type: 'type-takeaway1', content: 'New unconfirmed edit' },
    ]);

    expect(state.summaryConfirmed).toBe(false);
    expect(canCopyDiary(state)).toBe(false);
  });

  it('allows clipboard copy immediately for pure manual entries without AI confirmation flags', () => {
    const state = draft([
      { type: 'type-takeaway1', content: 'Manual 1' },
      { type: 'type-takeaway2', content: 'Manual 2' },
      { type: 'type-takeaway3', content: 'Manual 3' },
    ]);

    expect(state.aiGenerated).toBe(false);
    expect(canCopyDiary(state)).toBe(true);

    const row = deriveDiaryClipboardRow(state, activity);
    expect(row).not.toBe(null);
    const cells = row!.split('\t');
    expect(cells[6].includes('1. Manual 1\n2. Manual 2\n3. Manual 3')).toBe(true);
  });

  it('allows clipboard copy of raw notes after AI structure rejection', () => {
    const state = draft([
      { type: 'type-raw', content: 'My manual session reflection' },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
      { type: 'reject-structure' },
    ]);

    expect(state.aiGenerated).toBe(false);
    expect(canCopyDiary(state)).toBe(true);

    const row = deriveDiaryClipboardRow(state, activity);
    expect(row).not.toBe(null);
    expect(row!.includes('My manual session reflection')).toBe(true);
    expect(row!.includes('AI 1')).toBe(false);
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

describe('formatDiaryContent', () => {
  it('formats takeaways into numbered lines', () => {
    expect(formatDiaryContent(['Point 1', 'Point 2', 'Point 3'])).toBe(
      '1. Point 1\n2. Point 2\n3. Point 3',
    );
  });

  it('includes notes when provided', () => {
    expect(formatDiaryContent(['Point 1', 'Point 2', 'Point 3'], 'Discuss on Friday')).toBe(
      '1. Point 1\n2. Point 2\n3. Point 3\n\nNotes:\nDiscuss on Friday',
    );
  });
});
