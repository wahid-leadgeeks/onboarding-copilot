import {
  canRequestSummary,
  canSaveLearning,
  deriveLearningSubmission,
  formatTakeaways,
  initialLearningDraft,
  learningDraftReducer,
  parseTakeawaysFromSummary,
  resolvedContent,
} from './learning-draft';
import type { LearningDraftAction, LearningDraftState } from './learning-draft';

const RAW = 'Learned how the sync queue defers writes to Google Sheets';

const emptyBaseDraft: LearningDraftState = {
  raw: '',
  takeaway1: '',
  takeaway2: '',
  takeaway3: '',
  notes: '',
  topic: '',
  pic: '',
  day: '',
  date: '',
  week: '',
  activityCount: '',
  isListening: false,
  transcript: '',
  isStructuring: false,
  aiError: null,
  summaryConfirmed: false,
  aiGenerated: false,
  summary: null,
  status: 'idle',
};

function run(actions: LearningDraftAction[], initial: LearningDraftState = initialLearningDraft()): LearningDraftState {
  return actions.reduce(learningDraftReducer, initial);
}

describe('initialLearningDraft', () => {
  it('starts empty and idle with all fields initialized', () => {
    expect(initialLearningDraft()).toEqual(emptyBaseDraft);
  });

  it('seeds the raw notes without generating or confirming a summary', () => {
    expect(initialLearningDraft(RAW)).toEqual({ ...emptyBaseDraft, raw: RAW });
  });

  it('seeds from an options object', () => {
    const draft = initialLearningDraft({
      raw: 'Some raw notes',
      takeaway1: 'Concept',
      topic: 'Architecture Overview',
      pic: 'Arief',
      day: 'Day 1',
      date: '2026-09-07',
      week: 1,
      activityCount: 1,
    });
    expect(draft.raw).toBe('Some raw notes');
    expect(draft.takeaway1).toBe('Concept');
    expect(draft.topic).toBe('Architecture Overview');
    expect(draft.pic).toBe('Arief');
    expect(draft.day).toBe('Day 1');
    expect(draft.date).toBe('2026-09-07');
    expect(draft.week).toBe(1);
    expect(draft.activityCount).toBe(1);
  });
});

describe('learningDraftReducer - legacy & core flows', () => {
  it('records typing into the raw notes and leaves the AI flow untouched', () => {
    const confirmed = run([{ type: 'summarize-succeeded', summary: 'Structured summary' }, { type: 'confirm-summary' }]);
    const state = learningDraftReducer(confirmed, { type: 'type-raw', content: RAW });
    expect(state.raw).toBe(RAW);
    expect(state.summary).toBe('Structured summary');
    expect(state.summaryConfirmed).toBe(true);
    expect(state.status).toBe('idle');
  });

  it('marks the draft as summarizing while keeping the raw notes and any previous summary', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'summarize-started' },
    ]);
    expect(state.raw).toBe(RAW);
    expect(state.summary).toBe('Structured summary');
    expect(state.summaryConfirmed).toBe(false);
    expect(state.status).toBe('summarizing');
    expect(state.isStructuring).toBe(true);
  });

  it('stores a succeeded summary as unconfirmed and returns to idle', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
      { type: 'summarize-succeeded', summary: 'Structured summary' },
    ]);
    expect(state.raw).toBe(RAW);
    expect(state.summary).toBe('Structured summary');
    expect(state.summaryConfirmed).toBe(false);
    expect(state.status).toBe('idle');
    expect(state.isStructuring).toBe(false);
  });

  it('treats a regenerated summary as unconfirmed even after the previous one was confirmed', () => {
    const state = run([
      { type: 'summarize-succeeded', summary: 'First summary' },
      { type: 'confirm-summary' },
      { type: 'summarize-started' },
      { type: 'summarize-succeeded', summary: 'Second summary' },
    ]);
    expect(state.summary).toBe('Second summary');
    expect(state.summaryConfirmed).toBe(false);
    expect(state.status).toBe('idle');
  });

  it('marks failure without discarding the raw notes', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-started' },
      { type: 'summarize-failed' },
    ]);
    expect(state.raw).toBe(RAW);
    expect(state.summary).toBe(null);
    expect(state.summaryConfirmed).toBe(false);
    expect(state.status).toBe('summarize-failed');
    expect(state.isStructuring).toBe(false);
  });

  it('preserves a previously confirmed summary when a later summarize attempt fails', () => {
    const state = run([
      { type: 'summarize-succeeded', summary: 'First summary' },
      { type: 'confirm-summary' },
      { type: 'summarize-started' },
      { type: 'summarize-failed' },
    ]);
    expect(state.summary).toBe('First summary');
    expect(state.summaryConfirmed).toBe(true);
    expect(state.status).toBe('summarize-failed');
  });

  it('confirms the generated summary', () => {
    const state = run([{ type: 'summarize-succeeded', summary: 'Structured summary' }, { type: 'confirm-summary' }]);
    expect(state.summary).toBe('Structured summary');
    expect(state.summaryConfirmed).toBe(true);
    expect(state.status).toBe('idle');
  });

  it('returns the state unchanged when confirming without a summary or AI content', () => {
    const before = initialLearningDraft(RAW);
    expect(learningDraftReducer(before, { type: 'confirm-summary' })).toBe(before);
  });

  it('resets confirmation when the summary is edited', () => {
    const state = run([
      { type: 'summarize-succeeded', summary: 'Structured summary' },
      { type: 'confirm-summary' },
      { type: 'edit-summary', content: 'Edited by the employee' },
    ]);
    expect(state.summary).toBe('Edited by the employee');
    expect(state.summaryConfirmed).toBe(false);
    expect(state.status).toBe('idle');
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
    expect(state.raw).toBe(RAW);
    expect(state.summary).toBe(null);
    expect(state.summaryConfirmed).toBe(false);
    expect(state.status).toBe('idle');
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

describe('learningDraftReducer - 3 takeaways, voice & metadata', () => {
  it('updates takeaways individually via type-takeaway and resets confirmation', () => {
    const confirmed = run([
      { type: 'structure-succeeded', takeaways: ['Point 1', 'Point 2', 'Point 3'] },
      { type: 'confirm-structure' },
    ]);
    expect(confirmed.summaryConfirmed).toBe(true);

    const updated = learningDraftReducer(confirmed, { type: 'type-takeaway', index: 2, content: 'Modified Point 2' });
    expect(updated.takeaway1).toBe('Point 1');
    expect(updated.takeaway2).toBe('Modified Point 2');
    expect(updated.takeaway3).toBe('Point 3');
    expect(updated.summaryConfirmed).toBe(false); // ADR-0003 reset
  });

  it('updates takeaways using specific actions (type-takeaway1, 2, 3)', () => {
    let state = run([{ type: 'type-takeaway1', content: 'T1' }]);
    state = learningDraftReducer(state, { type: 'type-takeaway2', content: 'T2' });
    state = learningDraftReducer(state, { type: 'type-takeaway3', content: 'T3' });
    expect(state.takeaway1).toBe('T1');
    expect(state.takeaway2).toBe('T2');
    expect(state.takeaway3).toBe('T3');
  });

  it('updates personal notes via type-notes', () => {
    const state = run([{ type: 'type-notes', content: 'Follow up on Monday' }]);
    expect(state.notes).toBe('Follow up on Monday');
  });

  it('updates metadata fields', () => {
    let state = run([{ type: 'set-metadata', metadata: { topic: 'Security Intro', pic: 'Jane', day: 'Day 3' } }]);
    expect(state.topic).toBe('Security Intro');
    expect(state.pic).toBe('Jane');
    expect(state.day).toBe('Day 3');

    state = learningDraftReducer(state, { type: 'set-date', date: '2026-09-09' });
    state = learningDraftReducer(state, { type: 'set-week', week: 2 });
    state = learningDraftReducer(state, { type: 'set-activity-count', count: 3 });
    expect(state.date).toBe('2026-09-09');
    expect(state.week).toBe(2);
    expect(state.activityCount).toBe(3);
  });

  it('manages voice listening lifecycle and transcript', () => {
    let state = run([{ type: 'voice-start' }]);
    expect(state.isListening).toBe(true);

    state = learningDraftReducer(state, { type: 'voice-result', transcript: 'Spoken learning note' });
    expect(state.transcript).toBe('Spoken learning note');

    state = learningDraftReducer(state, { type: 'voice-end' });
    expect(state.isListening).toBe(false);

    state = learningDraftReducer(state, { type: 'apply-transcript-to-notes' });
    expect(state.notes).toBe('Spoken learning note');
    expect(state.transcript).toBe('');
  });

  it('applies voice transcript to raw thoughts', () => {
    const state = run([
      { type: 'voice-result', transcript: 'Raw voice dictation' },
      { type: 'apply-transcript-to-raw' },
    ]);
    expect(state.raw).toBe('Raw voice dictation');
    expect(state.transcript).toBe('');
  });

  it('handles voice errors gracefully', () => {
    const state = run([{ type: 'voice-start' }, { type: 'voice-error', error: 'Microphone permission denied' }]);
    expect(state.isListening).toBe(false);
    expect(state.aiError).toBe('Microphone permission denied');
  });

  it('populates 3 takeaways and notes on structure-succeeded with unconfirmed status', () => {
    const state = run([
      {
        type: 'structure-succeeded',
        takeaways: ['Core Concept', 'Standard Process', 'Practical App'],
        notes: 'Mentor suggested practice',
      },
    ]);
    expect(state.takeaway1).toBe('Core Concept');
    expect(state.takeaway2).toBe('Standard Process');
    expect(state.takeaway3).toBe('Practical App');
    expect(state.notes).toBe('Mentor suggested practice');
    expect(state.aiGenerated).toBe(true);
    expect(state.summaryConfirmed).toBe(false);
    expect(state.status).toBe('idle');
  });

  it('clears takeaways and preserves user notes on reject-structure', () => {
    const state = run([
      { type: 'type-raw', content: 'Original notes' },
      { type: 'type-notes', content: 'My personal follow up' },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
      { type: 'reject-structure' },
    ]);
    expect(state.raw).toBe('Original notes');
    expect(state.notes).toBe('My personal follow up');
    expect(state.takeaway1).toBe('');
    expect(state.takeaway2).toBe('');
    expect(state.takeaway3).toBe('');
    expect(state.aiGenerated).toBe(false);
    expect(state.summaryConfirmed).toBe(false);
  });
});

describe('deriveLearningSubmission - ADR-0003 Review & Confirmation', () => {
  it('returns manual submission for manually typed raw notes', () => {
    const state = run([{ type: 'type-raw', content: 'Manual note' }]);
    const sub = deriveLearningSubmission(state);
    expect(sub).toEqual({
      content: 'Manual note',
      source: 'manual',
    });
  });

  it('returns manual submission for manually typed 3 takeaways', () => {
    const state = run([
      { type: 'type-takeaway1', content: 'Concept A' },
      { type: 'type-takeaway2', content: 'Standard B' },
      { type: 'type-takeaway3', content: 'Apply C' },
      { type: 'type-notes', content: 'Check docs' },
    ]);
    const sub = deriveLearningSubmission(state);
    expect(sub).toEqual({
      content: '1. Concept A\n2. Standard B\n3. Apply C\n\nNotes:\nCheck docs',
      source: 'manual',
      takeaways: ['Concept A', 'Standard B', 'Apply C'],
      takeaway1: 'Concept A',
      takeaway2: 'Standard B',
      takeaway3: 'Apply C',
      notes: 'Check docs',
    });
  });

  it('blocks saving when AI structuring is unconfirmed and preserves draft', () => {
    const state = run([
      { type: 'type-raw', content: 'Draft thoughts' },
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
    ]);
    expect(state.summaryConfirmed).toBe(false);
    expect(deriveLearningSubmission(state)).toBe(null);
    expect(canSaveLearning(state)).toBe(false);
  });

  it('returns null when AI structuring is unconfirmed and no raw notes exist', () => {
    const state = run([
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
    ]);
    expect(state.summaryConfirmed).toBe(false);
    expect(deriveLearningSubmission(state)).toBe(null);
  });

  it('classifies submission as ai-assisted once confirmed by the employee', () => {
    const state = run([
      { type: 'structure-succeeded', takeaways: ['AI 1', 'AI 2', 'AI 3'] },
      { type: 'confirm-structure' },
    ]);
    expect(state.summaryConfirmed).toBe(true);
    const sub = deriveLearningSubmission(state);
    expect(sub).toEqual({
      content: '1. AI 1\n2. AI 2\n3. AI 3',
      source: 'ai-assisted',
      takeaways: ['AI 1', 'AI 2', 'AI 3'],
      takeaway1: 'AI 1',
      takeaway2: 'AI 2',
      takeaway3: 'AI 3',
    });
  });

  it('preserves activity metadata in submission', () => {
    const state = run([
      {
        type: 'set-metadata',
        metadata: {
          topic: 'Architecture',
          pic: 'Arief',
          day: 'Day 1',
          date: '2026-09-07',
          week: 1,
          activityCount: 1,
        },
      },
      { type: 'type-takeaway1', content: 'Microservices vs Monolith' },
    ]);
    const sub = deriveLearningSubmission(state);
    expect(sub?.topic).toBe('Architecture');
    expect(sub?.pic).toBe('Arief');
    expect(sub?.day).toBe('Day 1');
    expect(sub?.date).toBe('2026-09-07');
    expect(sub?.week).toBe(1);
    expect(sub?.activityCount).toBe(1);
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

  it('is true for manual takeaways', () => {
    expect(canSaveLearning(run([{ type: 'type-takeaway1', content: 'Learned something' }]))).toBe(true);
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

  it('resolves to null while the summary is unconfirmed', () => {
    const state = run([
      { type: 'type-raw', content: RAW },
      { type: 'summarize-succeeded', summary: 'Unconfirmed summary' },
    ]);
    expect(resolvedContent(state)).toBe(null);
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

describe('canRequestSummary', () => {
  it('is true when raw notes exist and draft is idle', () => {
    expect(canRequestSummary(run([{ type: 'type-raw', content: 'Some notes' }]))).toBe(true);
  });

  it('is true when voice transcript exists', () => {
    expect(canRequestSummary(run([{ type: 'voice-result', transcript: 'Spoken notes' }]))).toBe(true);
  });

  it('is false when raw notes and transcript are empty', () => {
    expect(canRequestSummary(initialLearningDraft())).toBe(false);
  });

  it('is false while summarize is in flight', () => {
    expect(canRequestSummary(run([{ type: 'type-raw', content: 'Notes' }, { type: 'summarize-started' }]))).toBe(false);
  });
});

describe('parseTakeawaysFromSummary helper', () => {
  it('parses numbered takeaways', () => {
    const text = '1. System architecture\n2. Git branch model\n3. Deployment check';
    const parsed = parseTakeawaysFromSummary(text);
    expect(parsed.takeaway1).toBe('System architecture');
    expect(parsed.takeaway2).toBe('Git branch model');
    expect(parsed.takeaway3).toBe('Deployment check');
    expect(parsed.notes).toBe(undefined);
  });

  it('parses labeled lines and notes section', () => {
    const text = `Core Concept: Event-driven architecture
Process: Follow PR checklist
Application: Configure webhook locally
Notes: Ask mentor about staging access`;
    const parsed = parseTakeawaysFromSummary(text);
    expect(parsed.takeaway1).toBe('Event-driven architecture');
    expect(parsed.takeaway2).toBe('Follow PR checklist');
    expect(parsed.takeaway3).toBe('Configure webhook locally');
    expect(parsed.notes).toBe('Ask mentor about staging access');
  });

  it('handles empty or malformed text gracefully', () => {
    expect(parseTakeawaysFromSummary('')).toEqual({ takeaway1: '', takeaway2: '', takeaway3: '' });
  });
});

describe('formatTakeaways helper', () => {
  it('formats 3 takeaways with numbers', () => {
    expect(formatTakeaways(['A', 'B', 'C'])).toBe('1. A\n2. B\n3. C');
  });

  it('formats takeaways and appends notes block', () => {
    expect(formatTakeaways(['A', 'B', 'C'], 'Remember key')).toBe('1. A\n2. B\n3. C\n\nNotes:\nRemember key');
  });
});

/* ========================================================================== */
/* Challenger M1-2 Defect Regression Prevention Test Suites                  */
/* ========================================================================== */

describe('Challenger M1-2 Defect 1: Takeaways preservation and confirmation gate during save', () => {
  it('blocks submission and save when AI takeaways are unconfirmed, even if raw notes exist', () => {
    const state = run([
      { type: 'type-raw', content: 'Raw scratchpad thoughts' },
      {
        type: 'structure-succeeded',
        takeaways: [
          'Procedure for zero-downtime DB migrations',
          'Rollback verification checklist',
          'Local secret hygiene in .env.local',
        ],
      },
    ]);

    expect(state.aiGenerated).toBe(true);
    expect(state.summaryConfirmed).toBe(false);

    expect(deriveLearningSubmission(state)).toBe(null);
    expect(canSaveLearning(state)).toBe(false);
  });

  it('enables save and preserves all 3 takeaways with source ai-assisted once confirmed', () => {
    const state = run([
      { type: 'type-raw', content: 'Raw scratchpad thoughts' },
      {
        type: 'set-metadata',
        metadata: {
          topic: 'Database Migrations',
          pic: 'Arief',
          day: 'Day 2',
          date: '2026-09-08',
          week: 1,
          activityCount: 2,
        },
      },
      {
        type: 'structure-succeeded',
        takeaways: [
          'Procedure for zero-downtime DB migrations',
          'Rollback verification checklist',
          'Local secret hygiene in .env.local',
        ],
      },
      { type: 'confirm-structure' },
    ]);

    expect(state.summaryConfirmed).toBe(true);
    expect(canSaveLearning(state)).toBe(true);

    const sub = deriveLearningSubmission(state);
    expect(sub).not.toBe(null);
    expect(sub?.source).toBe('ai-assisted');
    expect(sub?.takeaways).toEqual([
      'Procedure for zero-downtime DB migrations',
      'Rollback verification checklist',
      'Local secret hygiene in .env.local',
    ]);
    expect(sub?.takeaway1).toBe('Procedure for zero-downtime DB migrations');
    expect(sub?.takeaway2).toBe('Rollback verification checklist');
    expect(sub?.takeaway3).toBe('Local secret hygiene in .env.local');
    expect(sub?.content).toBe(
      '1. Procedure for zero-downtime DB migrations\n2. Rollback verification checklist\n3. Local secret hygiene in .env.local',
    );
    expect(sub?.topic).toBe('Database Migrations');
    expect(sub?.pic).toBe('Arief');
  });

  it('invalidates confirmation and blocks save when a takeaway is edited, and preserves edits upon reconfirmation', () => {
    let state = run([
      {
        type: 'structure-succeeded',
        takeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
      },
      { type: 'confirm-structure' },
    ]);
    expect(state.summaryConfirmed).toBe(true);
    expect(canSaveLearning(state)).toBe(true);

    // User edits takeaway 2
    state = learningDraftReducer(state, {
      type: 'type-takeaway2',
      content: 'User edited process standard',
    });

    // Confirmation must be invalidated per ADR-0003
    expect(state.summaryConfirmed).toBe(false);
    expect(canSaveLearning(state)).toBe(false);
    expect(deriveLearningSubmission(state)).toBe(null);

    // User confirms their edited takeaways
    state = learningDraftReducer(state, { type: 'confirm-structure' });
    expect(state.summaryConfirmed).toBe(true);
    expect(canSaveLearning(state)).toBe(true);

    const sub = deriveLearningSubmission(state);
    expect(sub?.takeaways).toEqual([
      'Takeaway 1',
      'User edited process standard',
      'Takeaway 3',
    ]);
  });

  it('permits saving manual raw notes ONLY after explicit reject-structure ("Use my own notes instead")', () => {
    let state = run([
      { type: 'type-raw', content: 'User raw unformatted notes' },
      {
        type: 'structure-succeeded',
        takeaways: ['AI 1', 'AI 2', 'AI 3'],
      },
    ]);

    // Unconfirmed: save blocked
    expect(canSaveLearning(state)).toBe(false);

    // User explicitly rejects AI structure
    state = learningDraftReducer(state, { type: 'reject-structure' });
    expect(state.aiGenerated).toBe(false);
    expect(state.summaryConfirmed).toBe(false);
    expect(state.takeaway1).toBe('');

    // Now manual fallback to raw notes is legitimate and intentional
    expect(canSaveLearning(state)).toBe(true);
    const sub = deriveLearningSubmission(state);
    expect(sub?.content).toBe('User raw unformatted notes');
    expect(sub?.source).toBe('manual');
    expect(sub?.takeaways).toBe(undefined);
  });
});

describe('Challenger M1-2 Defect 2: Voice dictation invalidation of confirmation', () => {
  it('resets summaryConfirmed to false when voice transcript is appended to notes on an AI draft', () => {
    let state = run([
      {
        type: 'structure-succeeded',
        takeaways: ['Concept A', 'Standard B', 'Application C'],
      },
      { type: 'confirm-structure' },
    ]);
    expect(state.summaryConfirmed).toBe(true);

    // Dictate speech notes
    state = learningDraftReducer(state, {
      type: 'voice-result',
      transcript: 'Mentor advised checking staging database first',
    });
    state = learningDraftReducer(state, { type: 'apply-transcript-to-notes' });

    expect(state.notes).toBe('Mentor advised checking staging database first');
    expect(state.transcript).toBe('');
    // ADR-0003: Speech additions modify the draft content and MUST invalidate confirmation!
    expect(state.summaryConfirmed).toBe(false);
    expect(canSaveLearning(state)).toBe(false);
  });

  it('resets summaryConfirmed to false when voice transcript is appended to raw thoughts on an AI draft', () => {
    let state = run([
      {
        type: 'structure-succeeded',
        takeaways: ['Concept A', 'Standard B', 'Application C'],
      },
      { type: 'confirm-structure' },
    ]);
    expect(state.summaryConfirmed).toBe(true);

    state = learningDraftReducer(state, {
      type: 'voice-result',
      transcript: 'Additional thought spoken after reflection',
    });
    state = learningDraftReducer(state, { type: 'apply-transcript-to-raw' });

    expect(state.raw).toBe('Additional thought spoken after reflection');
    expect(state.summaryConfirmed).toBe(false);
  });

  it('leaves summaryConfirmed unchanged when applying empty or whitespace transcript', () => {
    let state = run([
      {
        type: 'structure-succeeded',
        takeaways: ['Concept A', 'Standard B', 'Application C'],
      },
      { type: 'confirm-structure' },
      { type: 'voice-result', transcript: '   ' },
    ]);

    state = learningDraftReducer(state, { type: 'apply-transcript-to-notes' });
    expect(state.summaryConfirmed).toBe(true);
    expect(state.notes).toBe('');
  });

  it('allows speech dictation in pure manual drafts without requiring AI confirmation', () => {
    let state = run([
      { type: 'type-takeaway1', content: 'Manual takeaway' },
      { type: 'voice-result', transcript: 'Spoken personal note' },
      { type: 'apply-transcript-to-notes' },
    ]);

    expect(state.aiGenerated).toBe(false);
    expect(state.notes).toBe('Spoken personal note');
    expect(canSaveLearning(state)).toBe(true);
    const sub = deriveLearningSubmission(state);
    expect(sub?.source).toBe('manual');
    expect(sub?.notes).toBe('Spoken personal note');
  });
});

describe('Challenger M1-2 Defect 4: AI notes cleansing upon rejection', () => {
  it('cleanses AI-generated notes from state on reject-structure', () => {
    let state = run([
      { type: 'type-raw', content: 'Session notes' },
      {
        type: 'structure-succeeded',
        takeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
        notes: 'AI hallucinated reminder to schedule meeting',
      },
    ]);

    expect(state.notes).toBe('AI hallucinated reminder to schedule meeting');

    // Reject AI structure
    state = learningDraftReducer(state, { type: 'reject-structure' });

    expect(state.takeaway1).toBe('');
    expect(state.takeaway2).toBe('');
    expect(state.takeaway3).toBe('');
    // AI notes must be completely cleansed so they cannot leak as manual notes
    expect(state.notes).toBe('');
    expect(state.aiGenerated).toBe(false);
    expect(state.summaryConfirmed).toBe(false);

    const sub = deriveLearningSubmission(state);
    expect(sub?.notes).toBe(undefined);
    expect(sub?.source).toBe('manual');
  });

  it('restores user-authored notes when rejecting AI structure that replaced them', () => {
    let state = run([
      { type: 'type-raw', content: 'Raw thoughts' },
      { type: 'type-notes', content: 'User personal note to follow up' },
      {
        type: 'structure-succeeded',
        takeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
        notes: 'AI proposed notes',
      },
    ]);

    expect(state.notes).toBe('AI proposed notes');

    state = learningDraftReducer(state, { type: 'reject-structure' });

    // User's original notes must be preserved/restored, and AI notes cleansed
    expect(state.notes).toBe('User personal note to follow up');
    expect(state.aiGenerated).toBe(false);
  });

  it('cleanses AI notes on legacy reject-summary as well', () => {
    let state = run([
      {
        type: 'structure-succeeded',
        takeaways: ['T1', 'T2', 'T3'],
        notes: 'AI suggested notes',
      },
      { type: 'reject-summary' },
    ]);
    expect(state.notes).toBe('');
    expect(state.aiGenerated).toBe(false);
  });
});

describe('Challenger M1-2 Secondary Invariants (Challenges 5 & 8)', () => {
  it('resets summaryConfirmed and aiGenerated when triggering structure-started', () => {
    let state = run([
      { type: 'structure-succeeded', takeaways: ['T1', 'T2', 'T3'] },
      { type: 'confirm-structure' },
    ]);
    expect(state.summaryConfirmed).toBe(true);

    state = learningDraftReducer(state, { type: 'structure-started' });
    expect(state.summaryConfirmed).toBe(false);
    expect(state.isStructuring).toBe(true);
  });

  it('completely overwrites takeaways in summarize-succeeded without retaining stale items', () => {
    let state = run([
      {
        type: 'structure-succeeded',
        takeaways: ['Old 1', 'Old 2', 'Old 3'],
      },
    ]);

    state = learningDraftReducer(state, {
      type: 'summarize-succeeded',
      takeaways: ['New 1', 'New 2'],
    });

    expect(state.takeaway1).toBe('New 1');
    expect(state.takeaway2).toBe('New 2');
    expect(state.takeaway3).toBe('');
  });
});
