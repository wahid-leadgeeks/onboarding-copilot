/**
 * Utilities for the onboarding cockpit stopwatch and timer experience.
 */

export interface StopwatchFormattedTime {
  hours: string;
  minutes: string;
  seconds: string;
  display: string;
  totalSeconds: number;
}

/** Formats elapsed seconds into HH:MM:SS or MM:SS format with clean zero-padding. */
export function formatStopwatch(totalSeconds: number): StopwatchFormattedTime {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  const hoursStr = String(hrs).padStart(2, '0');
  const minsStr = String(mins).padStart(2, '0');
  const secsStr = String(secs).padStart(2, '0');

  const display = hrs > 0 ? `${hoursStr}:${minsStr}:${secsStr}` : `${minsStr}:${secsStr}`;

  return {
    hours: hoursStr,
    minutes: minsStr,
    seconds: secsStr,
    display,
    totalSeconds: safeSeconds,
  };
}

/** Calculates current elapsed seconds taking paused states and accumulated duration into account. */
export function calculateElapsedSeconds(
  startedAt: number | null | undefined,
  now: number = Date.now(),
  pausedAt?: number | null,
  accumulatedMs: number = 0
): number {
  if (!startedAt) return 0;
  if (pausedAt) {
    return Math.max(0, Math.floor(accumulatedMs / 1000));
  }
  const currentElapsed = now - startedAt + accumulatedMs;
  return Math.max(0, Math.floor(currentElapsed / 1000));
}

/** Converts elapsed seconds to whole duration minutes for Schedule Column G. Clamps to at least 1 min once started. */
export function calculateStopwatchDurationMinutes(elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  if (elapsedSeconds < 45) return 1;
  return Math.round(elapsedSeconds / 60);
}

/** Formats a timestamp into HH:MM for Schedule Columns H and I. */
export function formatTimeHHMM(timestamp: number): string {
  const d = new Date(timestamp);
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
}

/** Calculates percentage completed against a target duration in minutes. */
export function calculateProgressPercentage(elapsedSeconds: number, targetMinutes?: number): number {
  if (!targetMinutes || targetMinutes <= 0) return 0;
  const targetSeconds = targetMinutes * 60;
  return Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));
}
