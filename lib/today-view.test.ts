import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  activityDateLabel,
  greetingLine,
  nextUpcomingActivity,
  onboardingDayNumber,
  topicTitle,
} from './today-view';

describe('onboardingDayNumber', () => {
  it('counts Jakarta calendar days from 1 Sep 2026 (Day 1)', () => {
    expect(onboardingDayNumber(new Date('2026-09-01T00:00:00+07:00'))).toBe(1);
    expect(onboardingDayNumber(new Date('2026-09-01T23:59:00+07:00'))).toBe(1);
    expect(onboardingDayNumber(new Date('2026-10-03T09:00:00+07:00'))).toBe(33);
  });

  it('uses the Jakarta date, not the UTC date', () => {
    // 17:30 UTC on 31 Aug is 00:30 on 1 Sep in Jakarta.
    expect(onboardingDayNumber(new Date('2026-08-31T17:30:00Z'))).toBe(1);
    expect(onboardingDayNumber(new Date('2026-08-31T16:59:00Z'))).toBe(0);
  });

  it('is independent of the process timezone', () => {
    // process.env.TZ cannot be changed inside a jest worker, so each zone runs in its own process.
    const probe = `import('./lib/today-view.ts').then((m) => {
      console.log(JSON.stringify({
        offset: new Date('2026-09-01T12:00:00Z').getTimezoneOffset(),
        day: m.onboardingDayNumber(new Date('2026-08-31T17:30:00Z')),
      }));
    });`;
    const zones: Array<[string, number]> = [['Asia/Tokyo', -540], ['America/Los_Angeles', 420], ['UTC', 0]];
    for (const [tz, offset] of zones) {
      const output = execFileSync(join(__dirname, '..', 'node_modules', '.bin', 'tsx'), ['-e', probe], {
        cwd: join(__dirname, '..'),
        env: { ...process.env, TZ: tz },
        encoding: 'utf8',
      });
      expect(JSON.parse(output)).toEqual({ offset, day: 1 });
    }
  });
});

describe('greetingLine', () => {
  it('adds the name only when there is one', () => {
    expect(greetingLine('Good evening', 'Noah')).toBe('Good evening, Noah');
    expect(greetingLine('Good evening', '')).toBe('Good evening');
    expect(greetingLine('Good evening', '   ')).toBe('Good evening');
    expect(greetingLine('Good evening', null)).toBe('Good evening');
  });
});

describe('activityDateLabel', () => {
  it('formats parseable sheet dates and keeps other text', () => {
    expect(activityDateLabel('Tuesday', '01/09/2026')).toBe('Tue 1 Sep 2026');
    expect(activityDateLabel('Monday', 'TBD')).toBe('Monday, TBD');
    expect(activityDateLabel('Monday', '')).toBe('Monday');
    expect(activityDateLabel(undefined, undefined)).toBe('');
  });
});

describe('nextUpcomingActivity', () => {
  const items = [
    { id: 'a', date: '01/09/2026', done: false },
    { id: 'b', date: '02/10/2026', done: true },
    { id: 'c', date: 'TBD', done: false },
    { id: 'd', date: '05/10/2026', done: false },
  ];
  const isDone = (item: { done: boolean }) => item.done;

  it('picks the first open item dated today or later (Jakarta)', () => {
    expect(nextUpcomingActivity(items, new Date('2026-10-03T09:00:00+07:00'), isDone)?.id).toBe('d');
    expect(nextUpcomingActivity(items, new Date('2026-09-01T09:00:00+07:00'), isDone)?.id).toBe('a');
  });

  it('falls back to the first open item when nothing is dated ahead', () => {
    expect(nextUpcomingActivity(items, new Date('2026-12-01T09:00:00+07:00'), isDone)?.id).toBe('a');
  });

  it('returns null when everything is done', () => {
    expect(nextUpcomingActivity([{ date: '01/09/2026', done: true }], new Date(), isDone)).toBeNull();
  });
});

describe('topicTitle', () => {
  it('takes the first line', () => {
    expect(topicTitle('Welcome\n- agenda\n- tour')).toBe('Welcome');
    expect(topicTitle(undefined)).toBe('');
  });
});
