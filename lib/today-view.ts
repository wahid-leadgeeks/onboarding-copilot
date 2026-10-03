/**
 * Pure display helpers for the Today page (`/`).
 *
 * DISPLAY ONLY: nothing here feeds clipboard/TSV builders or request bodies.
 */
import { formatDisplayDate, jakartaDateParts, parseSheetDate, type SheetDate } from './format-date';

/** First day of the 90-day onboarding (calendar date, Asia/Jakarta). */
export const ONBOARDING_START: SheetDate = { y: 2026, m: 9, d: 1 };
export const ONBOARDING_TOTAL_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

function dayIndex(date: SheetDate): number {
  return Date.UTC(date.y, date.m - 1, date.d) / DAY_MS;
}

/**
 * "Day N" of onboarding for an instant, from the Jakarta calendar date of `now`
 * (so it agrees with the header date on any device timezone). Day 1 is the start date.
 */
export function onboardingDayNumber(now: Date, start: SheetDate = ONBOARDING_START): number {
  return dayIndex(jakartaDateParts(now)) - dayIndex(start) + 1;
}

/** "Good evening, Noah" — or just "Good evening" when the name is unknown. */
export function greetingLine(greeting: string, name: string | null | undefined): string {
  const trimmed = name?.trim() ?? '';
  return trimmed ? `${greeting}, ${trimmed}` : greeting;
}

/** "Tue 1 Sep 2026" when the sheet date parses, otherwise the raw "Monday, Day 1"-style text. */
export function activityDateLabel(day: string | null | undefined, date: string | null | undefined): string {
  if (date && parseSheetDate(date)) return formatDisplayDate(date);
  return [day, date].map((part) => part?.trim() ?? '').filter(Boolean).join(', ');
}

export interface DatedItem {
  date?: string;
}

/**
 * The next thing to do when nothing is scheduled today: the first not-done item
 * whose sheet date is today or later (Asia/Jakarta), else the first not-done item.
 */
export function nextUpcomingActivity<T extends DatedItem>(
  items: readonly T[],
  now: Date,
  isDone: (item: T) => boolean
): T | null {
  const today = dayIndex(jakartaDateParts(now));
  const open = items.filter((item) => !isDone(item));
  const dated = open.find((item) => {
    const date = parseSheetDate(item.date);
    return date !== null && dayIndex(date) >= today;
  });
  return dated ?? open[0] ?? null;
}

/** First line of a multi-line sheet topic. */
export function topicTitle(topic: string | null | undefined): string {
  return (topic ?? '').split('\n')[0].trim();
}
