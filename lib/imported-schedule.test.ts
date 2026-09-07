import {
  IMPORTED_SCHEDULE_STORAGE_KEY,
  readImportedSchedule,
  writeImportedSchedule,
  clipboardRowForSchedule,
  clipboardRowForScheduleFull,
  updateScheduleActivity,
  addScheduleActivity,
} from './imported-schedule';
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

  describe('schedule TSV clipboard and mutations', () => {
    const fullActivity: Activity = {
      id: 'activity-1',
      name: 'Introduction to IT Systems',
      type: 'Online Meeting',
      plannedStart: '08:30',
      plannedEnd: '09:00',
      status: 'done',
      actualStart: '08:30',
      actualEnd: '09:05',
      durationMinutes: 35,
      date: '01/09/2026',
      day: 'Tuesday',
      activityCount: 1,
      pic: 'HRD',
      notes: 'Reviewed frameworks\nAgreed on next steps',
    };

    it('formats columns H-K for quick range copy', () => {
      const row = clipboardRowForSchedule(fullActivity);
      expect(row).toContain('08:30\t09:05\tDone\t"Reviewed frameworks\nAgreed on next steps"');
    });

    it('formats full 11-column TSV matching columns A-K of Schedule sheet', () => {
      const row = clipboardRowForScheduleFull(fullActivity);
      const cells = row.split('\t');
      expect(cells).toHaveLength(11);
      expect(cells[0]).toBe('Tuesday');
      expect(cells[1]).toBe('01/09/2026');
      expect(cells[2]).toBe('1');
      expect(cells[3]).toBe('HRD');
      expect(cells[4]).toBe('Introduction to IT Systems');
      expect(cells[5]).toBe('Online Meeting');
      expect(cells[6]).toBe('35');
      expect(cells[7]).toBe('08:30');
      expect(cells[8]).toBe('09:05');
      expect(cells[9]).toBe('Done');
      expect(cells[10]).toBe('"Reviewed frameworks\nAgreed on next steps"');
    });

    it('updates an activity and recalculates durationMinutes from times', () => {
      const schedule = { activities: [activity], importedAt: '2026-09-03T09:00:00.000Z' };
      const updated = updateScheduleActivity(schedule, 'intro-it', {
        status: 'done',
        actualStart: '09:15',
        actualEnd: '10:45',
        notes: 'Session finished successfully',
      });
      const target = updated.activities[0];
      expect(target.status).toBe('done');
      expect(target.actualStart).toBe('09:15');
      expect(target.actualEnd).toBe('10:45');
      expect(target.durationMinutes).toBe(90);
      expect(target.notes).toBe('Session finished successfully');
    });

    it('adds an ad-hoc activity to the schedule', () => {
      const schedule = { activities: [activity], importedAt: '2026-09-03T09:00:00.000Z' };
      const next = addScheduleActivity(schedule, {
        name: 'Ad-hoc Architecture Review',
        type: 'meeting',
        plannedStart: '14:00',
        plannedEnd: '15:00',
        status: 'not-started',
      });
      expect(next.activities).toHaveLength(2);
      expect(next.activities[1].name).toBe('Ad-hoc Architecture Review');
      expect(next.activities[1].id).toContain('adhoc-');
      expect(next.activities[1].activityCount).toBe(2);
    });
  });
});
