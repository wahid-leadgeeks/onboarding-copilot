import { IMPORTED_SCHEDULE_STORAGE_KEY, readImportedSchedule, writeImportedSchedule } from './imported-schedule';
import type { Activity } from '@/lib/types/activity';

const activity: Activity = { id: 'intro-it', name: 'Introduction to IT Systems', type: 'learning', plannedStart: '09:00', plannedEnd: '11:00', status: 'not-started' };

describe('imported schedule storage', () => {
  it('exposes the storage key used by the app', () => {
    expect(IMPORTED_SCHEDULE_STORAGE_KEY).toBe('onboarding-imported-schedule');
  });

  it('returns null for missing or malformed persisted schedules', () => {
    expect(readImportedSchedule(null)).toBe(null);
    expect(readImportedSchedule('not json')).toBe(null);
    expect(readImportedSchedule('"a string"')).toBe(null);
    expect(readImportedSchedule('[]')).toBe(null);
    expect(readImportedSchedule('{}')).toBe(null);
    expect(readImportedSchedule('{"activities":"no","importedAt":"2026-09-03T09:00:00.000Z"}')).toBe(null);
    expect(readImportedSchedule('{"activities":[],"importedAt":42}')).toBe(null);
    expect(readImportedSchedule('{"importedAt":"2026-09-03T09:00:00.000Z"}')).toBe(null);
    expect(readImportedSchedule('[{"id":"a"}]')).toBe(null);
  });

  it('rejects activity lists containing invalid entries', () => {
    expect(readImportedSchedule('{"activities":[{"id":"a"}],"importedAt":"2026-09-03T09:00:00.000Z"}')).toBe(null);
    expect(readImportedSchedule('{"activities":["intro-it"],"importedAt":"2026-09-03T09:00:00.000Z"}')).toBe(null);
  });

  it('reads a valid imported schedule', () => {
    expect(readImportedSchedule('{"activities":[{"id":"intro-it","name":"Introduction to IT Systems","type":"learning","plannedStart":"09:00","plannedEnd":"11:00","status":"not-started"}],"importedAt":"2026-09-03T09:00:00.000Z"}')).toEqual({
      activities: [activity],
      importedAt: '2026-09-03T09:00:00.000Z',
    });
  });

  it('reads an empty activity list', () => {
    expect(readImportedSchedule('{"activities":[],"importedAt":"2026-09-03T09:00:00.000Z"}')).toEqual({
      activities: [],
      importedAt: '2026-09-03T09:00:00.000Z',
    });
  });

  it('round-trips a schedule through write and read', () => {
    const schedule = { activities: [activity], importedAt: '2026-09-03T09:00:00.000Z' };
    expect(readImportedSchedule(writeImportedSchedule(schedule))).toEqual(schedule);
  });

  it('serializes a schedule to a JSON string', () => {
    expect(writeImportedSchedule({ activities: [], importedAt: '2026-09-03T09:00:00.000Z' })).toBe('{"activities":[],"importedAt":"2026-09-03T09:00:00.000Z"}');
  });

  it('keeps activity counts intact through a round trip', () => {
    const schedule = { activities: [activity, { ...activity, id: 'security' }], importedAt: '2026-09-03T09:00:00.000Z' };
    const restored = readImportedSchedule(writeImportedSchedule(schedule));
    expect(restored?.activities).toHaveLength(2);
  });
});
