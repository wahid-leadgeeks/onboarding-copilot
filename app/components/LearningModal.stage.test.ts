import { initialLearningDraft, learningDraftReducer } from '@/lib/learning-draft';
import type { LearningDraftAction, LearningDraftState } from '@/lib/learning-draft';
import { canSaveLearning, learningStage } from './LearningModal';

const AI_DRAFT: LearningDraftAction = {
  type: 'structure-succeeded',
  takeaways: ['Concept', 'Process', 'Application'],
};

function draft(actions: LearningDraftAction[]): LearningDraftState {
  return actions.reduce(learningDraftReducer, initialLearningDraft());
}

describe('learningStage', () => {
  it('starts on write for a fresh draft', () => {
    expect(learningStage(initialLearningDraft(), false)).toBe('write');
  });

  it('stays on write while only the free-text box has content', () => {
    expect(learningStage(draft([{ type: 'type-raw', content: 'Learned a lot' }]), false)).toBe('write');
  });

  it('opens takeaways when the user chooses to write them', () => {
    expect(learningStage(initialLearningDraft(), true)).toBe('takeaways');
  });

  it('never hides manual takeaways or notes that would be saved', () => {
    expect(learningStage(draft([{ type: 'type-takeaway2', content: 'Process' }]), false)).toBe('takeaways');
    expect(learningStage(draft([{ type: 'type-notes', content: 'Ask about deploys' }]), false)).toBe('takeaways');
  });

  it('shows an unconfirmed AI draft for review', () => {
    const state = draft([{ type: 'type-raw', content: 'raw' }, AI_DRAFT]);
    expect(state.summaryConfirmed).toBe(false);
    expect(learningStage(state, false)).toBe('review');
  });

  it('shows editable takeaways when the user edits an unconfirmed AI draft', () => {
    const state = draft([AI_DRAFT, { type: 'type-takeaway1', content: 'Edited' }]);
    expect(learningStage(state, true)).toBe('takeaways');
    expect(canSaveLearning(state)).toBe(false);
  });

  it('maps a confirmed AI draft to takeaways (never write) with Save enabled', () => {
    const state = draft([AI_DRAFT, { type: 'confirm-structure' }]);
    expect(learningStage(state, false)).toBe('takeaways');
    expect(learningStage(state, true)).toBe('takeaways');
    expect(canSaveLearning(state)).toBe(true);
  });

  it('editing a confirmed draft resets confirmation (reducer unchanged) and disables Save', () => {
    const state = draft([AI_DRAFT, { type: 'confirm-structure' }, { type: 'type-takeaway3', content: 'Changed' }]);
    expect(state.summaryConfirmed).toBe(false);
    expect(learningStage(state, true)).toBe('takeaways');
    expect(canSaveLearning(state)).toBe(false);
  });

  it('returns to write after the AI draft is reverted', () => {
    const state = draft([{ type: 'type-raw', content: 'raw' }, AI_DRAFT, { type: 'reject-structure' }]);
    expect(learningStage(state, false)).toBe('write');
    expect(canSaveLearning(state)).toBe(true);
  });

  it('an unconfirmed AI draft is never saveable (no auto-confirm)', () => {
    const state = draft([{ type: 'type-raw', content: 'raw' }, AI_DRAFT]);
    expect(canSaveLearning(state)).toBe(false);
  });
});
