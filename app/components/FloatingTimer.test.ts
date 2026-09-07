import { formatStopwatch, calculateElapsedSeconds } from '@/lib/session/stopwatch';

describe('FloatingTimer logic & lifecycle rules', () => {
  it('determines visibility correctly based on startedAt, finishedAt, and scroll', () => {
    function shouldShowFloatingTimer(
      startedAt: number | null,
      finishedAt: number | null,
      scrollY: number,
      hasActivity: boolean
    ): boolean {
      if (!startedAt || finishedAt || !hasActivity) return false;
      return scrollY > 300;
    }

    // 1. Not started
    expect(shouldShowFloatingTimer(null, null, 400, true)).toBe(false);

    // 2. Started but scrolled near top (< 300px)
    expect(shouldShowFloatingTimer(100000, null, 150, true)).toBe(false);

    // 3. Started and scrolled down (> 300px) -> VISIBLE
    expect(shouldShowFloatingTimer(100000, null, 450, true)).toBe(true);

    // 4. Finished (finishedAt is set) -> MUST BE HIDDEN even when scrolled down!
    expect(shouldShowFloatingTimer(100000, 200000, 450, true)).toBe(false);

    // 5. No activity selected
    expect(shouldShowFloatingTimer(100000, null, 450, false)).toBe(false);
  });

  it('freezes or clears elapsed time when activity is finished', () => {
    const start = 1000000;
    const end = 1060000; // 60 seconds later

    // Running
    const runningElapsed = calculateElapsedSeconds(start, 1030000);
    expect(runningElapsed).toBe(30);
    expect(formatStopwatch(runningElapsed).display).toBe('00:30');

    // Finished
    const finalElapsed = calculateElapsedSeconds(start, end);
    expect(finalElapsed).toBe(60);
    expect(formatStopwatch(finalElapsed).display).toBe('01:00');
  });
});
