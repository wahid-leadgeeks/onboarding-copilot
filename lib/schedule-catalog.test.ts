import {
  OFFICIAL_SCHEDULE_ACTIVITIES,
  calculateDurationFromTimes,
  clipboardRowForScheduleGtoK,
  clipboardRowForScheduleFull,
  readScheduleCustomizations,
  writeScheduleCustomizations,
  type ScheduleActivity,
} from './schedule-catalog';

describe('Official Schedule Catalog', () => {
  it('contains 59 activities across Weeks 1 to 4 and Monthly Reviews', () => {
    expect(OFFICIAL_SCHEDULE_ACTIVITIES.length).toBe(59);

    const first = OFFICIAL_SCHEDULE_ACTIVITIES[0];
    expect(first.rowNumber).toBe(3);
    expect(first.topic).toBe('Introduction to Onboarding Framework');
    expect(first.durationMinutes).toBe(30);
    expect(first.startTime).toBe('08:30');
    expect(first.endTime).toBe('09:00');
    expect(first.progress).toBe('Done');

    const itWorkflow = OFFICIAL_SCHEDULE_ACTIVITIES.find((a) => a.rowNumber === 20);
    expect(itWorkflow).toBeDefined();
    expect(itWorkflow?.pic).toBe('IT Manager');
    expect(itWorkflow?.topic).toContain('How IT Works at LeadGeeks');
    expect(itWorkflow?.durationMinutes).toBe(155);
    expect(itWorkflow?.notes).toContain('drive.google.com');
  });

  it('calculates duration in minutes from start and end times', () => {
    expect(calculateDurationFromTimes('09:00', '10:30')).toBe(90);
    expect(calculateDurationFromTimes('10:15', '11:00')).toBe(45);
    expect(calculateDurationFromTimes('11:00', '10:00')).toBeUndefined();
    expect(calculateDurationFromTimes('', '10:00')).toBeUndefined();
  });

  it('generates a 5-column TSV for Columns G–K of sheet Schedule', () => {
    const item: ScheduleActivity = {
      id: 'sched-row-20',
      rowNumber: 20,
      week: 'Week 1',
      day: 'Thursday',
      date: '03/09/2026',
      activityCount: 18,
      pic: 'IT Manager',
      topic: 'How IT Works at LeadGeeks',
      mainMedia: 'Knowledge Sharing',
      durationMinutes: 155,
      startTime: '10:00',
      endTime: '12:35',
      progress: 'Done',
      notes: 'Review complete',
    };

    const tsv = clipboardRowForScheduleGtoK(item);
    const cols = tsv.split('\t');
    expect(cols).toHaveLength(5);
    expect(cols[0]).toBe('155'); // Col G: Duration (minutes)
    expect(cols[1]).toBe('10:00'); // Col H: Start Time
    expect(cols[2]).toBe('12:35'); // Col I: End Time
    expect(cols[3]).toBe('Done'); // Col J: Progress
    expect(cols[4]).toBe('Review complete'); // Col K: Notes
  });

  it('generates an 11-column TSV for Columns A–K of sheet Schedule', () => {
    const item = OFFICIAL_SCHEDULE_ACTIVITIES[0];
    const tsv = clipboardRowForScheduleFull(item);
    const cols = tsv.split('\t');
    expect(cols).toHaveLength(11);
    expect(cols[0]).toBe(item.day);
    expect(cols[4]).toBe(item.topic);
    expect(cols[6]).toBe('30');
    expect(cols[7]).toBe('08:30');
    expect(cols[8]).toBe('09:00');
    expect(cols[9]).toBe('Done');
  });

  it('reads and writes schedule customizations', () => {
    const custom = {
      'sched-row-20': {
        durationMinutes: 160,
        startTime: '10:00',
        endTime: '12:40',
        progress: 'Done',
        notes: 'Extended discussion with IT Manager',
      },
    };
    const raw = writeScheduleCustomizations(custom);
    const parsed = readScheduleCustomizations(raw);
    expect(parsed).toEqual(custom);
  });
});
