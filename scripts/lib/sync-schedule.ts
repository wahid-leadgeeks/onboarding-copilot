/**
 * Schedule JSON -> database sync (pure planning + a small apply step).
 *
 * File rows (`data/private/schedule.json`, see data/examples/schedule.example.json) map to
 * `activities`, matched by id (`sched-row-${rowNumber}`).
 * - Catalog fields (row_number, week, day, date, activity_count, pic, topic, main_media) are
 *   always updatable.
 * - Working fields (duration_minutes, start_time, end_time, progress, materials_link, notes) are
 *   protected (D3): a non-empty DB value that differs from the file is a CONFLICT and is only
 *   overwritten with --force.
 * - actual_start, actual_end and created_at are never written.
 * Prune (D3a) is opt-in, refused for an empty file, never touches keys of rejected rows, and never
 * deletes an activity referenced by session_logs.activity_id (a blocker, not forceable).
 */
import type { TransactionSql } from 'postgres';
import {
  emptyPlan,
  formatPlan,
  normalizeNullable,
  normalizeText,
  type Blocker,
  type Conflict,
  type FieldChange,
  type Plan,
  type Rejection,
  type SyncArgs,
} from './sync-common';

export const SCHEDULE_ROW_NUMBER_MIN = 2;
export const SCHEDULE_ROW_NUMBER_MAX = 200;

/** Values the Schedule sheet's Progress dropdown accepts (app/api/sheets/update-cell/route.ts:380-383). */
export const SCHEDULE_PROGRESS_VALUES = ['', 'Done', 'In Progress', 'On-Hold', 'Reschedule'] as const;

/** One validated row of the schedule rows file. */
export interface ScheduleRow {
  id: string;
  rowNumber: number;
  week: string;
  day: string;
  date: string;
  activityCount: number | null;
  pic: string;
  topic: string;
  mainMedia: string;
  durationMinutes: number | null;
  /** '' or HH:MM. */
  startTime: string;
  /** '' or HH:MM. */
  endTime: string;
  progress: string;
  materialsLink: string;
  notes: string;
}

/** activities row as read from the database (compared columns only, snake_case). */
export interface ExistingActivity {
  id: string;
  row_number: number;
  week: string;
  day: string;
  date: string;
  activity_count: number | null;
  pic: string;
  topic: string;
  main_media: string;
  duration_minutes: number | null;
  start_time: string | null;
  end_time: string | null;
  progress: string | null;
  materials_link: string | null;
  notes: string | null;
}

/** Values written to activities (column names, without updated_at). */
export interface ActivityValues {
  id: string;
  row_number: number;
  week: string;
  day: string;
  date: string;
  activity_count: number | null;
  pic: string;
  topic: string;
  main_media: string;
  duration_minutes: number | null;
  /** NULL when the file has ''. */
  start_time: string | null;
  /** NULL when the file has ''. */
  end_time: string | null;
  progress: string;
  materials_link: string;
  notes: string;
}

export type SchedulePlanFlags = Pick<SyncArgs, 'prune' | 'force'>;

export interface SchedulePlan {
  activities: Plan<ActivityValues>;
  /** File rows that failed validation (any rejection aborts the run). */
  rejections: Rejection[];
  /** Reasons the run must not proceed (not forceable). */
  blockers: Blocker[];
  /** Full file values of rows in activities.updates, keyed by id. */
  updateValues: Record<string, ActivityValues>;
  /** Copied from the flags so callers can decide on conflicts. */
  force: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const REQUIRED_TEXT_FIELDS = ['week', 'day', 'date', 'pic', 'topic', 'mainMedia'] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ScheduleValidationResult {
  valid: ScheduleRow[];
  rejections: Rejection[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/** Validates file rows. Valid rows are returned as the original objects. */
export function validateScheduleRows(rows: readonly unknown[]): ScheduleValidationResult {
  const valid: ScheduleRow[] = [];
  const rejections: Rejection[] = [];
  const seenIds = new Set<unknown>();
  const seenRowNumbers = new Set<unknown>();

  rows.forEach((raw, i) => {
    const index = i + 1;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      rejections.push({ index, reason: 'row is not an object' });
      return;
    }
    const row = raw as Record<string, unknown>;
    const rowNumber = row.rowNumber;
    const id = typeof row.id === 'string' ? row.id : undefined;
    const reasons: string[] = [];

    if (!isInteger(rowNumber) || rowNumber < SCHEDULE_ROW_NUMBER_MIN || rowNumber > SCHEDULE_ROW_NUMBER_MAX) {
      reasons.push(`rowNumber must be an integer ${SCHEDULE_ROW_NUMBER_MIN}..${SCHEDULE_ROW_NUMBER_MAX}`);
    } else if (row.id !== `sched-row-${rowNumber}`) {
      reasons.push(`id must be "sched-row-${rowNumber}"`);
    }
    for (const field of REQUIRED_TEXT_FIELDS) {
      if (!isNonEmptyString(row[field])) reasons.push(`${field} must be a non-empty string`);
    }
    if (row.activityCount !== null && !isInteger(row.activityCount)) {
      reasons.push('activityCount must be an integer or null');
    }
    if (row.durationMinutes !== null && !(isInteger(row.durationMinutes) && row.durationMinutes >= 0)) {
      reasons.push('durationMinutes must be a non-negative integer or null');
    }
    for (const field of ['startTime', 'endTime'] as const) {
      const value = row[field];
      if (!(value === '' || (typeof value === 'string' && TIME_PATTERN.test(value)))) {
        reasons.push(`${field} must be '' or HH:MM`);
      }
    }
    if (!(SCHEDULE_PROGRESS_VALUES as readonly unknown[]).includes(row.progress)) {
      reasons.push(`progress must be one of ${SCHEDULE_PROGRESS_VALUES.map((v) => JSON.stringify(v)).join(', ')}`);
    }
    if (typeof row.materialsLink !== 'string') reasons.push('materialsLink must be a string');
    if (typeof row.notes !== 'string') reasons.push('notes must be a string');

    // Duplicates are checked against every earlier row (valid or not), so the later row is rejected.
    if (row.id !== undefined && seenIds.has(row.id)) reasons.push(`duplicate id ${JSON.stringify(row.id)}`);
    if (rowNumber !== undefined && seenRowNumbers.has(rowNumber)) {
      reasons.push(`duplicate rowNumber ${JSON.stringify(rowNumber)}`);
    }
    if (row.id !== undefined) seenIds.add(row.id);
    if (rowNumber !== undefined) seenRowNumbers.add(rowNumber);

    if (reasons.length > 0) {
      rejections.push({ index, rowNumber, ...(id !== undefined ? { id } : {}), reason: reasons.join('; ') });
      return;
    }
    valid.push(raw as unknown as ScheduleRow);
  });

  return { valid, rejections };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

/** File row -> column values. start/end '' -> NULL (as the old script wrote them). */
export function activityValues(row: ScheduleRow): ActivityValues {
  return {
    id: row.id,
    row_number: row.rowNumber,
    week: row.week,
    day: row.day,
    date: row.date,
    activity_count: row.activityCount,
    pic: row.pic,
    topic: row.topic,
    main_media: row.mainMedia,
    duration_minutes: row.durationMinutes,
    start_time: row.startTime === '' ? null : row.startTime,
    end_time: row.endTime === '' ? null : row.endTime,
    progress: row.progress,
    materials_link: row.materialsLink,
    notes: row.notes,
  };
}

const CATALOG_FIELDS = [
  'row_number',
  'week',
  'day',
  'date',
  'activity_count',
  'pic',
  'topic',
  'main_media',
] as const;

const PROTECTED_FIELDS = [
  'duration_minutes',
  'start_time',
  'end_time',
  'progress',
  'materials_link',
  'notes',
] as const;

/** Integer equality, or D3 text equality ('' == NULL, CRLF -> LF, trim). */
function sameValue(db: string | number | null, file: string | number | null): boolean {
  return normalizeNullable(db) === normalizeNullable(file);
}

function isEmptyValue(value: string | number | null): boolean {
  return normalizeNullable(value) === null;
}

/** Row number parsed from a `sched-row-N` id, for protecting rejected keys. */
function rowNumberFromId(id: unknown): number | undefined {
  if (typeof id !== 'string') return undefined;
  const match = /^sched-row-(\d+)$/.exec(id);
  return match ? Number(match[1]) : undefined;
}

/**
 * @param referencedActivityIds distinct `session_logs.activity_id` values (needed only for --prune).
 */
export function buildSchedulePlan(
  existing: readonly ExistingActivity[],
  referencedActivityIds: readonly string[],
  rows: readonly unknown[],
  flags: SchedulePlanFlags,
): SchedulePlan {
  const { valid, rejections } = validateScheduleRows(rows);
  const plan: SchedulePlan = {
    activities: emptyPlan<ActivityValues>(),
    rejections,
    blockers: [],
    updateValues: {},
    force: flags.force,
  };

  const byId = new Map(existing.map((a) => [a.id, a]));

  for (const row of valid) {
    const values = activityValues(row);
    const current = byId.get(values.id);
    if (!current) {
      plan.activities.inserts.push(values);
      continue;
    }
    const changes: Record<string, FieldChange> = {};
    let conflicted = false;
    for (const field of CATALOG_FIELDS) {
      if (!sameValue(current[field], values[field])) {
        changes[field] = { from: current[field], to: values[field] };
      }
    }
    for (const field of PROTECTED_FIELDS) {
      if (sameValue(current[field], values[field])) continue;
      if (!isEmptyValue(current[field])) {
        const conflict: Conflict = { id: current.id, field, db: current[field], file: values[field] };
        plan.activities.conflicts.push(conflict);
        conflicted = true;
        if (!flags.force) continue;
      }
      changes[field] = { from: current[field], to: values[field] };
    }
    if (Object.keys(changes).length > 0) {
      plan.activities.updates.push({ id: current.id, changes });
      plan.updateValues[current.id] = values;
    } else if (!conflicted) {
      plan.activities.unchanged.push(current.id);
    }
  }

  if (flags.prune) addPrune(plan, existing, referencedActivityIds, valid, rows);
  return plan;
}

function addPrune(
  plan: SchedulePlan,
  existing: readonly ExistingActivity[],
  referencedActivityIds: readonly string[],
  valid: readonly ScheduleRow[],
  rows: readonly unknown[],
): void {
  if (valid.length === 0) {
    plan.blockers.push({ reason: 'refusing to prune: the file has 0 valid rows' });
    return;
  }

  // Keys that must never be pruned: every valid row plus every key a rejected row mentions.
  const keepIds = new Set<string>(valid.map((r) => r.id));
  for (const rejection of plan.rejections) {
    const raw = rows[rejection.index - 1];
    const rawId = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).id : undefined;
    if (typeof rawId === 'string') keepIds.add(rawId);
    if (typeof rejection.rowNumber === 'number') keepIds.add(`sched-row-${rejection.rowNumber}`);
    const fromId = rowNumberFromId(rawId);
    if (fromId !== undefined) keepIds.add(`sched-row-${fromId}`);
  }

  const referenced = new Set(referencedActivityIds);
  for (const activity of existing) {
    if (keepIds.has(activity.id)) continue;
    if (referenced.has(activity.id)) {
      plan.blockers.push({
        id: activity.id,
        reason: `stale activity (row_number ${activity.row_number}) is referenced by session_logs.activity_id; handle those session_logs first (not forceable)`,
      });
      continue;
    }
    plan.activities.deletes.push({ id: activity.id, detail: `row_number ${activity.row_number}` });
  }
}

/** Why the plan must not be applied, or [] when it may be. Conflicts count only without --force. */
export function schedulePlanAbortReasons(plan: SchedulePlan): string[] {
  const reasons: string[] = [];
  if (plan.rejections.length > 0) reasons.push(`${plan.rejections.length} rejected row(s) in the file`);
  if (plan.blockers.length > 0) reasons.push(`${plan.blockers.length} blocker(s)`);
  const conflicts = plan.activities.conflicts.length;
  if (conflicts > 0 && !plan.force) {
    reasons.push(`${conflicts} protected-field conflict(s); re-run with --force to overwrite them`);
  }
  return reasons;
}

export function formatSchedulePlan(plan: SchedulePlan): string {
  return [
    'activities:',
    indent(formatPlan(plan.activities)),
    'file:',
    indent(formatPlan({ ...emptyPlan(), rejections: plan.rejections, blockers: plan.blockers })),
  ].join('\n');
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * Writes plan.inserts + plan.updates (upserts) and plan.deletes, nothing else. Updates set only
 * the changed columns plus updated_at, so unchanged rows and fields keep their values;
 * actual_start, actual_end and created_at are never written. Must run inside the caller's
 * transaction after the plan was built from rows read there with FOR UPDATE. No DDL.
 */
export async function applySchedulePlan(
  tx: TransactionSql,
  plan: SchedulePlan,
  now: string = new Date().toISOString(),
): Promise<void> {
  for (const a of plan.activities.inserts) {
    await tx`
      INSERT INTO activities (
        id, row_number, week, day, date, activity_count, pic, topic, main_media,
        duration_minutes, start_time, end_time, progress, materials_link, notes, updated_at
      ) VALUES (
        ${a.id}, ${a.row_number}, ${a.week}, ${a.day}, ${a.date}, ${a.activity_count}, ${a.pic},
        ${a.topic}, ${a.main_media}, ${a.duration_minutes}, ${a.start_time}, ${a.end_time},
        ${a.progress}, ${a.materials_link}, ${a.notes}, ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        row_number = EXCLUDED.row_number,
        week = EXCLUDED.week,
        day = EXCLUDED.day,
        date = EXCLUDED.date,
        activity_count = EXCLUDED.activity_count,
        pic = EXCLUDED.pic,
        topic = EXCLUDED.topic,
        main_media = EXCLUDED.main_media,
        duration_minutes = EXCLUDED.duration_minutes,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        progress = EXCLUDED.progress,
        materials_link = EXCLUDED.materials_link,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `;
  }
  for (const update of plan.activities.updates) {
    const a = plan.updateValues[update.id];
    if (!a) throw new Error(`Internal error: no values for activities update ${update.id}`);
    const set = { ...changedValues(update.changes, a), updated_at: now };
    await tx`
      INSERT INTO activities (
        id, row_number, week, day, date, activity_count, pic, topic, main_media,
        duration_minutes, start_time, end_time, progress, materials_link, notes, updated_at
      ) VALUES (
        ${a.id}, ${a.row_number}, ${a.week}, ${a.day}, ${a.date}, ${a.activity_count}, ${a.pic},
        ${a.topic}, ${a.main_media}, ${a.duration_minutes}, ${a.start_time}, ${a.end_time},
        ${a.progress}, ${a.materials_link}, ${a.notes}, ${now}
      )
      ON CONFLICT (id) DO UPDATE SET ${tx(set)}
    `;
  }

  if (plan.activities.deletes.length > 0) {
    await tx`DELETE FROM activities WHERE id IN ${tx(plan.activities.deletes.map((d) => d.id))}`;
  }
}

/** The file's values for the changed columns only. */
function changedValues(
  changes: Record<string, FieldChange>,
  values: ActivityValues,
): Record<string, string | number | null> {
  const set: Record<string, string | number | null> = {};
  for (const field of Object.keys(changes)) {
    if (!(field in values)) throw new Error(`Internal error: unknown column ${field}`);
    set[field] = (values as unknown as Record<string, string | number | null>)[field];
  }
  return set;
}
