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

/**
 * Escapes a cell according to RFC4180 rules for TSV clipboard export.
 */
export function escapeTsvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes('\t') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes columns H–K of the Schedule sheet for quick cell-range pasting:
 * Col H: Start Time
 * Col I: End Time
 * Col J: Progress
 * Col K: Notes
 */
export function clipboardRowForSchedule(activity: Activity): string {
  const startTime = activity.actualStart || (activity.plannedStart !== 'TBD' ? activity.plannedStart : '');
  const endTime = activity.actualEnd || (activity.plannedEnd !== 'TBD' ? activity.plannedEnd : '');
  const progress = activity.status === 'done' ? 'Done' : activity.status === 'in-progress' ? 'In Progress' : '';
  const notes = activity.notes || '';

  return [startTime, endTime, progress, notes].map(escapeTsvCell).join('\t');
}

/**
 * Serializes all 11 columns of the Schedule sheet (A–K) for a full row paste:
 * Col A: Day
 * Col B: Date
 * Col C: Activity Count
 * Col D: PIC
 * Col E: Topic
 * Col F: Main Media
 * Col G: Duration (minutes)
 * Col H: Start Time
 * Col I: End Time
 * Col J: Progress
 * Col K: Notes
 */
export function clipboardRowForScheduleFull(activity: Activity, activityIndex?: number): string {
  const count = activity.activityCount !== undefined ? String(activity.activityCount) : (activityIndex !== undefined ? String(activityIndex + 1) : '');
  const duration = activity.durationMinutes !== undefined ? String(activity.durationMinutes) : '';
  const startTime = activity.actualStart || (activity.plannedStart !== 'TBD' ? activity.plannedStart : '');
  const endTime = activity.actualEnd || (activity.plannedEnd !== 'TBD' ? activity.plannedEnd : '');
  const progress = activity.status === 'done' ? 'Done' : activity.status === 'in-progress' ? 'In Progress' : '';

  const columns = [
    activity.day || '',
    activity.date || '',
    count,
    activity.pic || '',
    activity.name,
    activity.type,
    duration,
    startTime,
    endTime,
    progress,
    activity.notes || '',
  ];

  return columns.map(escapeTsvCell).join('\t');
}

/**
 * Updates an activity in an imported schedule, recalculating duration when start and end times change.
 */
export function updateScheduleActivity(
  schedule: ImportedSchedule,
  activityId: string,
  updates: Partial<Activity>
): ImportedSchedule {
  const activities = schedule.activities.map((activity) => {
    if (activity.id !== activityId) return activity;
    const merged = { ...activity, ...updates };
    if (merged.actualStart && merged.actualEnd && !updates.durationMinutes) {
      const [sh, sm] = merged.actualStart.split(':').map(Number);
      const [eh, em] = merged.actualEnd.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        merged.durationMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
      }
    }
    return merged;
  });

  return { ...schedule, activities };
}

/**
 * Adds an ad-hoc / impromptu activity to an existing schedule.
 */
export function addScheduleActivity(
  schedule: ImportedSchedule,
  newActivity: Omit<Activity, 'id'> & { id?: string }
): ImportedSchedule {
  const id = newActivity.id || `adhoc-${Date.now()}-${schedule.activities.length + 1}`;
  const activity: Activity = {
    ...newActivity,
    id,
    activityCount: newActivity.activityCount ?? schedule.activities.length + 1,
  };

  return {
    ...schedule,
    activities: [...schedule.activities, activity],
  };
}
