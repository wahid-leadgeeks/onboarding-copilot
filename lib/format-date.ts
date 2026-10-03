/**
 * Display-only date helpers.
 *
 * Sheet dates ("01/09/2026") are calendar days, not instants: they are parsed
 * into {y, m, d} components and formatted in UTC so the device timezone can
 * never shift them. Instants (`now`) are converted to the business timezone,
 * Asia/Jakarta.
 *
 * DISPLAY ONLY: never use these in clipboard/TSV builders, lib/diary-cockpit.ts,
 * lib/feedback.ts, lib/timeline.ts or any request body.
 */

export const BUSINESS_TIME_ZONE = 'Asia/Jakarta';

/** A calendar date with a 1-based month. */
export interface SheetDate {
  y: number;
  m: number;
  d: number;
}

// ICU emits "Sept" for en-GB; the app always shows three-letter months.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function validComponents(y: number, m: number, d: number): SheetDate | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const probe = new Date(Date.UTC(y, m - 1, d, 12));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/**
 * Parses DD/MM/YYYY, D/M/YYYY or YYYY-MM-DD into calendar components.
 * Returns null for anything else ('Day 1', '', 'TBD', impossible dates).
 */
export function parseSheetDate(text: string | null | undefined): SheetDate | null {
  if (typeof text !== 'string') return null;
  const value = text.trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (dmy) return validComponents(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (iso) return validComponents(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return null;
}

function partsOf(instant: Date, timeZone: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).formatToParts(instant)) {
    out[part.type] = part.value;
  }
  return out;
}

function formatInstant(instant: Date, timeZone: string): string {
  const parts = partsOf(instant, timeZone, { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
  const month = MONTHS[Number(parts.month) - 1] ?? parts.month;
  return `${parts.weekday} ${Number(parts.day)} ${month} ${parts.year}`;
}

/**
 * "Tue 1 Sep 2026".
 * - string: parsed as a sheet calendar date (timezone-independent); unparseable text is returned unchanged.
 * - SheetDate: formatted as that calendar day.
 * - Date (an instant): formatted in `timeZone` (default Asia/Jakarta); an invalid Date yields ''.
 */
export function formatDisplayDate(input: string | SheetDate | Date, options: { timeZone?: string } = {}): string {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return '';
    return formatInstant(input, options.timeZone ?? BUSINESS_TIME_ZONE);
  }
  const components = typeof input === 'string' ? parseSheetDate(input) : validComponents(input.y, input.m, input.d);
  if (!components) return typeof input === 'string' ? input : '';
  return formatInstant(new Date(Date.UTC(components.y, components.m - 1, components.d)), 'UTC');
}

/** Calendar components of an instant in Asia/Jakarta. */
export function jakartaDateParts(now: Date): SheetDate {
  const parts = partsOf(now, BUSINESS_TIME_ZONE, { year: 'numeric', month: 'numeric', day: 'numeric' });
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

/** Hour of day (0–23) of an instant in Asia/Jakarta. */
export function jakartaHour(now: Date): number {
  const parts = partsOf(now, BUSINESS_TIME_ZONE, { hour: 'numeric', hourCycle: 'h23' });
  return Number(parts.hour) % 24;
}

/** "HH:MM" (24-hour) of an instant in Asia/Jakarta; '' for an invalid Date. */
export function formatJakartaTime(instant: Date): string {
  if (Number.isNaN(instant.getTime())) return '';
  const parts = partsOf(instant, BUSINESS_TIME_ZONE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${parts.hour.padStart(2, '0')}:${parts.minute.padStart(2, '0')}`;
}

/** Greeting for an hour of day: 5–11 morning, 12–17 afternoon, otherwise evening. */
export function greetingFor(hour: number): 'Good morning' | 'Good afternoon' | 'Good evening' {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** True when a sheet date names the same calendar day as `now` in Asia/Jakarta. */
export function isSameJakartaDate(sheetDateText: string, now: Date): boolean {
  const date = parseSheetDate(sheetDateText);
  if (!date || Number.isNaN(now.getTime())) return false;
  const today = jakartaDateParts(now);
  return date.y === today.y && date.m === today.m && date.d === today.d;
}
