import type { Activity } from '@/lib/types/activity';
import { isActivityList } from '@/lib/sheets/types';

export const IMPORTED_SCHEDULE_STORAGE_KEY = 'onboarding-imported-schedule';

export type ImportedSchedule = {
  activities: Activity[];
  importedAt: string;
};

/** Parses and validates a persisted imported schedule (localStorage is untrusted input). */
export function readImportedSchedule(raw: string | null): ImportedSchedule | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (!isActivityList(item.activities)) return null;
  if (typeof item.importedAt !== 'string') return null;
  return { activities: item.activities, importedAt: item.importedAt };
}

/** Serializes an imported schedule for persistence. */
export function writeImportedSchedule(schedule: ImportedSchedule): string {
  return JSON.stringify(schedule);
}
