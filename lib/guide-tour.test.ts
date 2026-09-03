import { clampStep, GUIDE_TOUR_STORAGE_KEY, readGuideTourState, writeGuideTourState } from './guide-tour';

describe('guide tour storage', () => {
  it('exposes the storage key used by the app', () => {
    expect(GUIDE_TOUR_STORAGE_KEY).toBe('onboarding-guide-tour');
  });

  it('returns null for missing or malformed persisted state', () => {
    expect(readGuideTourState(null)).toBe(null);
    expect(readGuideTourState('not json')).toBe(null);
    expect(readGuideTourState('"a string"')).toBe(null);
    expect(readGuideTourState('[]')).toBe(null);
    expect(readGuideTourState('{}')).toBe(null);
    expect(readGuideTourState('{"completed":"yes"}')).toBe(null);
  });

  it('reads a completed tour state', () => {
    expect(readGuideTourState('{"completed":true,"completedAt":"2026-09-03T09:00:00.000Z"}')).toEqual({
      completed: true,
      completedAt: '2026-09-03T09:00:00.000Z',
    });
  });

  it('reads an incomplete tour state and drops invalid optional fields', () => {
    expect(readGuideTourState('{"completed":false}')).toEqual({ completed: false });
    expect(readGuideTourState('{"completed":true,"completedAt":42}')).toEqual({ completed: true });
  });

  it('round-trips a tour state through write and read', () => {
    const state = { completed: true, completedAt: '2026-09-03T09:00:00.000Z' };
    expect(readGuideTourState(writeGuideTourState(state))).toEqual(state);
    expect(readGuideTourState(writeGuideTourState({ completed: false }))).toEqual({ completed: false });
  });
});

describe('clampStep', () => {
  it('keeps in-range step indexes unchanged', () => {
    expect(clampStep(0, 8)).toBe(0);
    expect(clampStep(4, 8)).toBe(4);
    expect(clampStep(7, 8)).toBe(7);
  });

  it('clamps out-of-range step indexes into bounds', () => {
    expect(clampStep(-1, 8)).toBe(0);
    expect(clampStep(8, 8)).toBe(7);
    expect(clampStep(99, 3)).toBe(2);
  });

  it('degrades safely for empty step lists', () => {
    expect(clampStep(0, 0)).toBe(0);
    expect(clampStep(5, 0)).toBe(0);
  });
});
