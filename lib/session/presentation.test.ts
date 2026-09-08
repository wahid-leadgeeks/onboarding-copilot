import { formatStartedAt, getProgressLabel, mergeCompletedCount } from '@/lib/session/presentation';

describe('session presentation', () => {
  it('describes an active day without implying the active session is incomplete', () => {
    expect(getProgressLabel({ completed: 0, inProgress: 1, total: 3 })).toBe('1 in progress · 2 remaining');
  });

  it('formats a started timestamp without rendering an unreliable live timer', () => {
    expect(formatStartedAt(new Date(2026, 8, 2, 9, 4).getTime())).toBe('Started at 09:04');
  });

  it('describes a fully completed day as a stopping point', () => {
    expect(getProgressLabel({ completed: 3, inProgress: 0, total: 3 })).toBe('3 completed · Nothing else scheduled');
  });

  it('keeps local completions when the server has not recorded them yet', () => {
    expect(mergeCompletedCount(0, 1)).toBe(1);
  });

  it('prefers the higher count so synced records from the schedule are not lost', () => {
    expect(mergeCompletedCount(2, 1)).toBe(2);
  });

  it('falls back to local completions when server progress is unavailable', () => {
    expect(mergeCompletedCount(null, 1)).toBe(1);
    expect(mergeCompletedCount(null, 0)).toBe(0);
  });

  it('correctly reports progress labels for today with 2 tasks', () => {
    expect(getProgressLabel({ completed: 0, inProgress: 0, total: 2 })).toBe('0 completed · 2 remaining');
    expect(getProgressLabel({ completed: 0, inProgress: 1, total: 2 })).toBe('1 in progress · 1 remaining');
    expect(getProgressLabel({ completed: 1, inProgress: 0, total: 2 })).toBe('1 completed · 1 remaining');
    expect(getProgressLabel({ completed: 2, inProgress: 0, total: 2 })).toBe('2 completed · Nothing else scheduled');
  });
});
