import {
  formatStopwatch,
  calculateElapsedSeconds,
  calculateStopwatchDurationMinutes,
  formatTimeHHMM,
  calculateProgressPercentage,
} from './stopwatch';

describe('Stopwatch utilities', () => {
  describe('formatStopwatch', () => {
    it('formats seconds under one minute', () => {
      const result = formatStopwatch(25);
      expect(result.display).toBe('00:25');
      expect(result.minutes).toBe('00');
      expect(result.seconds).toBe('25');
    });

    it('formats minutes and seconds under one hour', () => {
      const result = formatStopwatch(754); // 12 mins 34 secs
      expect(result.display).toBe('12:34');
      expect(result.hours).toBe('00');
      expect(result.minutes).toBe('12');
      expect(result.seconds).toBe('34');
    });

    it('formats hours, minutes, and seconds when >= 1 hour', () => {
      const result = formatStopwatch(3665); // 1 hr 1 min 5 secs
      expect(result.display).toBe('01:01:05');
      expect(result.hours).toBe('01');
      expect(result.minutes).toBe('01');
      expect(result.seconds).toBe('05');
    });

    it('handles negative or zero gracefully', () => {
      expect(formatStopwatch(-10).display).toBe('00:00');
      expect(formatStopwatch(0).display).toBe('00:00');
    });
  });

  describe('calculateElapsedSeconds', () => {
    it('returns 0 when startedAt is null or undefined', () => {
      expect(calculateElapsedSeconds(null)).toBe(0);
      expect(calculateElapsedSeconds(undefined)).toBe(0);
    });

    it('calculates running seconds correctly', () => {
      const start = 1000000;
      const now = 1015000; // 15 seconds later
      expect(calculateElapsedSeconds(start, now)).toBe(15);
    });

    it('takes accumulated paused time into account when running', () => {
      const start = 1000000;
      const now = 1010000; // 10s running
      const accumulatedMs = 20000; // 20s from previous interval
      expect(calculateElapsedSeconds(start, now, null, accumulatedMs)).toBe(30);
    });

    it('freezes elapsed time at accumulatedMs when paused', () => {
      const start = 1000000;
      const now = 1050000; // now is irrelevant when paused
      const pausedAt = 1020000;
      const accumulatedMs = 25000; // 25 seconds accumulated
      expect(calculateElapsedSeconds(start, now, pausedAt, accumulatedMs)).toBe(25);
    });
  });

  describe('calculateStopwatchDurationMinutes', () => {
    it('returns 0 for non-positive values', () => {
      expect(calculateStopwatchDurationMinutes(0)).toBe(0);
      expect(calculateStopwatchDurationMinutes(-5)).toBe(0);
    });

    it('returns minimum 1 minute for brief test runs (< 45s)', () => {
      expect(calculateStopwatchDurationMinutes(10)).toBe(1);
      expect(calculateStopwatchDurationMinutes(40)).toBe(1);
    });

    it('rounds to nearest minute accurately', () => {
      expect(calculateStopwatchDurationMinutes(125)).toBe(2); // ~2.08m -> 2
      expect(calculateStopwatchDurationMinutes(175)).toBe(3); // ~2.91m -> 3
      expect(calculateStopwatchDurationMinutes(1800)).toBe(30); // 30m -> 30
    });
  });

  describe('formatTimeHHMM', () => {
    it('formats timestamp to 2 digits hour and minute', () => {
      const d = new Date(2026, 8, 1, 9, 5, 0); // 09:05
      expect(formatTimeHHMM(d.getTime())).toBe('09:05');
    });
  });

  describe('calculateProgressPercentage', () => {
    it('returns 0 if targetMinutes is undefined or 0', () => {
      expect(calculateProgressPercentage(300, 0)).toBe(0);
      expect(calculateProgressPercentage(300, undefined)).toBe(0);
    });

    it('calculates correct percentage up to 100%', () => {
      expect(calculateProgressPercentage(900, 30)).toBe(50); // 15m of 30m -> 50%
      expect(calculateProgressPercentage(1800, 30)).toBe(100);
      expect(calculateProgressPercentage(2400, 30)).toBe(100); // capped at 100%
    });
  });
});
