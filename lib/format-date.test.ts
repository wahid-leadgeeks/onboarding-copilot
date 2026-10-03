import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  formatDisplayDate,
  formatJakartaTime,
  greetingFor,
  isSameJakartaDate,
  jakartaDateParts,
  jakartaHour,
  parseSheetDate,
} from './format-date';

describe('parseSheetDate', () => {
  it('parses DD/MM/YYYY, D/M/YYYY and YYYY-MM-DD into calendar components', () => {
    expect(parseSheetDate('01/09/2026')).toEqual({ y: 2026, m: 9, d: 1 });
    expect(parseSheetDate('1/9/2026')).toEqual({ y: 2026, m: 9, d: 1 });
    expect(parseSheetDate('2026-09-01')).toEqual({ y: 2026, m: 9, d: 1 });
    expect(parseSheetDate(' 30/11/2026 ')).toEqual({ y: 2026, m: 11, d: 30 });
  });

  it('returns null for non-dates', () => {
    for (const text of ['Day 1', '', 'TBD', '   ', '31/02/2026', '13/13/2026', '2026/09/01', null, undefined]) {
      expect(parseSheetDate(text)).toBeNull();
    }
  });
});

describe('formatDisplayDate', () => {
  it('formats sheet dates with a three-letter month', () => {
    expect(formatDisplayDate('01/09/2026')).toBe('Tue 1 Sep 2026');
    expect(formatDisplayDate('2026-12-01')).toBe('Tue 1 Dec 2026');
    expect(formatDisplayDate({ y: 2026, m: 9, d: 30 })).toBe('Wed 30 Sep 2026');
  });

  it('returns unparseable text unchanged', () => {
    expect(formatDisplayDate('Day 1')).toBe('Day 1');
    expect(formatDisplayDate('TBD')).toBe('TBD');
    expect(formatDisplayDate('')).toBe('');
  });

  it('formats instants in Asia/Jakarta by default and honours an explicit timeZone', () => {
    const instant = new Date('2026-08-31T17:30:00Z'); // 00:30 on 1 Sep in Jakarta
    expect(formatDisplayDate(instant)).toBe('Tue 1 Sep 2026');
    expect(formatDisplayDate(instant, { timeZone: 'UTC' })).toBe('Mon 31 Aug 2026');
    expect(formatDisplayDate(new Date('invalid'))).toBe('');
  });
});

describe('timezone determinism', () => {
  // process.env.TZ cannot be changed inside a jest worker, so each zone runs in its own process.
  const probe = `import('./lib/format-date.ts').then((m) => {
    const instant = new Date('2026-08-31T17:30:00Z');
    console.log(JSON.stringify({
      offset: new Date('2026-09-01T12:00:00Z').getTimezoneOffset(),
      sheet: m.formatDisplayDate('01/09/2026'),
      parsed: m.parseSheetDate('01/09/2026'),
      instant: m.formatDisplayDate(instant),
      same: m.isSameJakartaDate('01/09/2026', instant),
      previousDay: m.isSameJakartaDate('31/08/2026', instant),
      hour: m.jakartaHour(instant),
      parts: m.jakartaDateParts(instant),
      time: m.formatJakartaTime(new Date('2026-09-01T02:05:00Z')),
    }));
  });`;
  const zones: Array<[string, number]> = [['Asia/Tokyo', -540], ['America/Los_Angeles', 420], ['UTC', 0], ['Asia/Jakarta', -420]];

  for (const [tz, offset] of zones) {
    it(`gives the same results with TZ=${tz}`, () => {
      const output = execFileSync(join(__dirname, '..', 'node_modules', '.bin', 'tsx'), ['-e', probe], {
        cwd: join(__dirname, '..'),
        env: { ...process.env, TZ: tz },
        encoding: 'utf8',
      });
      expect(JSON.parse(output)).toEqual({
        offset, // guard: the zone really applied in the child process
        sheet: 'Tue 1 Sep 2026',
        parsed: { y: 2026, m: 9, d: 1 },
        instant: 'Tue 1 Sep 2026',
        same: true,
        previousDay: false,
        hour: 0,
        parts: { y: 2026, m: 9, d: 1 },
        time: '09:05',
      });
    });
  }
});

describe('isSameJakartaDate', () => {
  it('is false for unparseable sheet dates', () => {
    expect(isSameJakartaDate('Day 1', new Date('2026-09-01T03:00:00Z'))).toBe(false);
  });
});

describe('jakartaHour and greetingFor', () => {
  it('reads the Jakarta hour of an instant', () => {
    expect(jakartaHour(new Date('2026-09-01T05:00:00Z'))).toBe(12);
    expect(jakartaHour(new Date('2026-09-01T16:59:00Z'))).toBe(23);
  });

  it('switches greeting at 5, 12 and 18', () => {
    expect(greetingFor(4)).toBe('Good evening');
    expect(greetingFor(5)).toBe('Good morning');
    expect(greetingFor(11)).toBe('Good morning');
    expect(greetingFor(12)).toBe('Good afternoon');
    expect(greetingFor(17)).toBe('Good afternoon');
    expect(greetingFor(18)).toBe('Good evening');
    expect(greetingFor(0)).toBe('Good evening');
  });
});
