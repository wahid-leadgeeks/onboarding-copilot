/**
 * Diary JSON -> database sync (pure planning + a small apply step).
 *
 * File rows (`data/private/diary.json`, see data/examples/diary.example.json) map to:
 * - diary_topics, matched by id (`row-${rowNumber}`). Catalog fields are always updatable;
 *   default_learned/default_notes come from the row's learned/notes.
 * - diary_entries, matched by row_number, id `entry-${rowNumber}`. learned/notes are protected
 *   working fields (D3): a non-empty DB value that differs from the file is a CONFLICT and is
 *   only overwritten with --force.
 * Prune (D3a) is opt-in, refused for an empty file, never touches keys of rejected rows, and
 * skips entries that contain text unless --force-prune.
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
  type PlanDelete,
  type Rejection,
  type SyncArgs,
} from './sync-common';

export const DIARY_ROW_NUMBER_MIN = 2;
export const DIARY_ROW_NUMBER_MAX = 200;

/** One validated row of the diary rows file. */
export interface DiaryRow {
  id: string;
  rowNumber: number;
  day: string;
  week: string;
  date: string;
  activityCount?: string | null;
  pic: string;
  topic: string;
  learned: string;
  notes: string;
}

/** diary_topics row as read from the database (snake_case column names). */
export interface ExistingDiaryTopic {
  id: string;
  row_number: number;
  day: string;
  week: string;
  date: string;
  activity_count: string | null;
  pic: string;
  topic: string;
  default_learned: string | null;
  default_notes: string | null;
}

/** diary_entries row as read from the database. */
export interface ExistingDiaryEntry {
  id: string;
  row_number: number;
  learned: string;
  notes: string;
}

/** Values written to diary_topics (column names). */
export interface DiaryTopicValues {
  id: string;
  row_number: number;
  day: string;
  week: string;
  date: string;
  activity_count: string | null;
  pic: string;
  topic: string;
  default_learned: string;
  default_notes: string;
}

/** Values written to diary_entries (column names, without updated_at). */
export interface DiaryEntryValues {
  id: string;
  row_number: number;
  learned: string;
  notes: string;
}

export type DiaryPlanFlags = Pick<SyncArgs, 'prune' | 'force' | 'forcePrune'>;

export interface DiaryPlan {
  topics: Plan<DiaryTopicValues>;
  entries: Plan<DiaryEntryValues>;
  /** File rows that failed validation (any rejection aborts the run). */
  rejections: Rejection[];
  /** Reasons the run must not proceed (not forceable). */
  blockers: Blocker[];
  /** Stale rows kept by prune safety (entries with text without --force-prune, and their topics). */
  pruneSkipped: PlanDelete[];
  /** Full file values of rows in topics.updates / entries.updates, keyed by plan id. */
  updateValues: {
    topics: Record<string, DiaryTopicValues>;
    entries: Record<string, DiaryEntryValues>;
  };
  /** Copied from the flags so callers can decide on conflicts. */
  force: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const REQUIRED_TEXT_FIELDS = ['day', 'week', 'date', 'pic', 'topic'] as const;

export interface DiaryValidationResult {
  valid: DiaryRow[];
  rejections: Rejection[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** Validates file rows. Valid rows are returned as the original objects. */
export function validateDiaryRows(rows: readonly unknown[]): DiaryValidationResult {
  const valid: DiaryRow[] = [];
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

    if (
      typeof rowNumber !== 'number' ||
      !Number.isInteger(rowNumber) ||
      rowNumber < DIARY_ROW_NUMBER_MIN ||
      rowNumber > DIARY_ROW_NUMBER_MAX
    ) {
      reasons.push(`rowNumber must be an integer ${DIARY_ROW_NUMBER_MIN}..${DIARY_ROW_NUMBER_MAX}`);
    } else if (row.id !== `row-${rowNumber}`) {
      reasons.push(`id must be "row-${rowNumber}"`);
    }
    for (const field of REQUIRED_TEXT_FIELDS) {
      if (!isNonEmptyString(row[field])) reasons.push(`${field} must be a non-empty string`);
    }
    const activityCount = row.activityCount;
    if (activityCount !== undefined && activityCount !== null && typeof activityCount !== 'string') {
      reasons.push('activityCount must be a string or null');
    }
    if (typeof row.learned !== 'string') reasons.push('learned must be a string');
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
    valid.push(raw as DiaryRow);
  });

  return { valid, rejections };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export function diaryEntryId(rowNumber: number): string {
  return `entry-${rowNumber}`;
}

function topicValues(row: DiaryRow): DiaryTopicValues {
  return {
    id: row.id,
    row_number: row.rowNumber,
    day: row.day,
    week: row.week,
    date: row.date,
    activity_count: row.activityCount ?? null,
    pic: row.pic,
    topic: row.topic,
    default_learned: row.learned,
    default_notes: row.notes,
  };
}

function entryValues(row: DiaryRow): DiaryEntryValues {
  return { id: diaryEntryId(row.rowNumber), row_number: row.rowNumber, learned: row.learned, notes: row.notes };
}

const TOPIC_COMPARED_FIELDS = [
  'row_number',
  'day',
  'week',
  'date',
  'activity_count',
  'pic',
  'topic',
  'default_learned',
  'default_notes',
] as const;

const ENTRY_PROTECTED_FIELDS = ['learned', 'notes'] as const;

/** Integer equality, or D3 text equality ('' == NULL, CRLF -> LF, trim). */
function sameValue(db: string | number | null, file: string | number | null): boolean {
  return normalizeNullable(db) === normalizeNullable(file);
}

function hasText(entry: ExistingDiaryEntry): boolean {
  return normalizeText(entry.learned) !== '' || normalizeText(entry.notes) !== '';
}

/** Row numbers parsed from `row-N` / `entry-N`-style ids, for protecting rejected keys. */
function rowNumberFromId(id: unknown): number | undefined {
  if (typeof id !== 'string') return undefined;
  const match = /^(?:row|entry)-(\d+)$/.exec(id);
  return match ? Number(match[1]) : undefined;
}

export function buildDiaryPlan(
  existingTopics: readonly ExistingDiaryTopic[],
  existingEntries: readonly ExistingDiaryEntry[],
  rows: readonly unknown[],
  flags: DiaryPlanFlags,
): DiaryPlan {
  const { valid, rejections } = validateDiaryRows(rows);
  const plan: DiaryPlan = {
    topics: emptyPlan<DiaryTopicValues>(),
    entries: emptyPlan<DiaryEntryValues>(),
    rejections,
    blockers: [],
    pruneSkipped: [],
    updateValues: { topics: {}, entries: {} },
    force: flags.force,
  };

  const topicsById = new Map(existingTopics.map((t) => [t.id, t]));
  const entriesByRow = new Map(existingEntries.map((e) => [e.row_number, e]));

  for (const row of valid) {
    // diary_topics: catalog fields, all updatable.
    const topic = topicValues(row);
    const existingTopic = topicsById.get(topic.id);
    if (!existingTopic) {
      plan.topics.inserts.push(topic);
    } else {
      const changes: Record<string, FieldChange> = {};
      for (const field of TOPIC_COMPARED_FIELDS) {
        if (!sameValue(existingTopic[field], topic[field])) {
          changes[field] = { from: existingTopic[field], to: topic[field] };
        }
      }
      if (Object.keys(changes).length > 0) {
        plan.topics.updates.push({ id: topic.id, changes });
        plan.updateValues.topics[topic.id] = topic;
      } else {
        plan.topics.unchanged.push(topic.id);
      }
    }

    // diary_entries: learned/notes are protected working fields.
    const entry = entryValues(row);
    const existingEntry = entriesByRow.get(row.rowNumber);
    if (!existingEntry) {
      plan.entries.inserts.push(entry);
      continue;
    }
    const changes: Record<string, FieldChange> = {};
    for (const field of ENTRY_PROTECTED_FIELDS) {
      const db = normalizeText(existingEntry[field]);
      if (db === normalizeText(entry[field])) continue;
      if (db !== '') {
        const conflict: Conflict = { id: existingEntry.id, field, db: existingEntry[field], file: entry[field] };
        plan.entries.conflicts.push(conflict);
        if (!flags.force) continue;
      }
      changes[field] = { from: existingEntry[field], to: entry[field] };
    }
    if (Object.keys(changes).length > 0) {
      plan.entries.updates.push({ id: existingEntry.id, changes });
      plan.updateValues.entries[existingEntry.id] = entry;
    } else if (plan.entries.conflicts.every((c) => c.id !== existingEntry.id)) {
      plan.entries.unchanged.push(existingEntry.id);
    }
  }

  if (flags.prune) addPrune(plan, existingTopics, existingEntries, valid, rows, flags);
  return plan;
}

function addPrune(
  plan: DiaryPlan,
  existingTopics: readonly ExistingDiaryTopic[],
  existingEntries: readonly ExistingDiaryEntry[],
  valid: readonly DiaryRow[],
  rows: readonly unknown[],
  flags: DiaryPlanFlags,
): void {
  if (valid.length === 0) {
    plan.blockers.push({ reason: 'refusing to prune: the file has 0 valid rows' });
    return;
  }

  // Keys that must never be pruned: every valid row plus every key a rejected row mentions.
  const keepIds = new Set<string>(valid.map((r) => r.id));
  const keepRowNumbers = new Set<number>(valid.map((r) => r.rowNumber));
  for (const rejection of plan.rejections) {
    const raw = rows[rejection.index - 1];
    const rawId = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).id : undefined;
    if (typeof rawId === 'string') keepIds.add(rawId);
    if (typeof rejection.rowNumber === 'number') keepRowNumbers.add(rejection.rowNumber);
    const fromId = rowNumberFromId(rawId);
    if (fromId !== undefined) keepRowNumbers.add(fromId);
  }

  // Entries first: an entry with text is kept unless --force-prune, and so is its topic.
  const protectedRowNumbers = new Set<number>();
  for (const entry of existingEntries) {
    if (keepRowNumbers.has(entry.row_number)) continue;
    const detail = `row_number ${entry.row_number}`;
    if (hasText(entry) && !flags.forcePrune) {
      protectedRowNumbers.add(entry.row_number);
      plan.pruneSkipped.push({ id: entry.id, detail: `${detail}, has learned/notes text; needs --force-prune` });
      continue;
    }
    plan.entries.deletes.push({ id: entry.id, detail });
  }

  for (const topic of existingTopics) {
    if (keepIds.has(topic.id) || keepRowNumbers.has(topic.row_number)) continue;
    const detail = `row_number ${topic.row_number}`;
    if (protectedRowNumbers.has(topic.row_number)) {
      plan.pruneSkipped.push({ id: topic.id, detail: `${detail}, its diary entry has text; needs --force-prune` });
      continue;
    }
    plan.topics.deletes.push({ id: topic.id, detail });
  }
}

/** Why the plan must not be applied, or [] when it may be. Conflicts count only without --force. */
export function diaryPlanAbortReasons(plan: DiaryPlan): string[] {
  const reasons: string[] = [];
  if (plan.rejections.length > 0) reasons.push(`${plan.rejections.length} rejected row(s) in the file`);
  if (plan.blockers.length > 0) reasons.push(`${plan.blockers.length} blocker(s)`);
  const conflicts = plan.topics.conflicts.length + plan.entries.conflicts.length;
  if (conflicts > 0 && !plan.force) {
    reasons.push(`${conflicts} protected-field conflict(s); re-run with --force to overwrite them`);
  }
  return reasons;
}

export function formatDiaryPlan(plan: DiaryPlan): string {
  const lines = [
    'diary_topics:',
    indent(formatPlan(plan.topics)),
    'diary_entries:',
    indent(formatPlan(plan.entries)),
    'file:',
    indent(formatPlan({ ...emptyPlan(), rejections: plan.rejections, blockers: plan.blockers })),
  ];
  if (plan.pruneSkipped.length > 0) {
    lines.push('prune skipped:');
    for (const s of plan.pruneSkipped) lines.push(`    KEEP ${s.id}${s.detail ? ` (${s.detail})` : ''}`);
  }
  return lines.join('\n');
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
 * the changed columns (plus updated_at for entries), so unchanged rows and fields keep their
 * values. Must run inside the caller's transaction after the plan was built from rows read
 * there with FOR UPDATE. No DDL.
 */
export async function applyDiaryPlan(
  tx: TransactionSql,
  plan: DiaryPlan,
  now: string = new Date().toISOString(),
): Promise<void> {
  for (const t of plan.topics.inserts) {
    await tx`
      INSERT INTO diary_topics (
        id, row_number, day, week, date, activity_count, pic, topic, default_learned, default_notes
      ) VALUES (
        ${t.id}, ${t.row_number}, ${t.day}, ${t.week}, ${t.date}, ${t.activity_count},
        ${t.pic}, ${t.topic}, ${t.default_learned}, ${t.default_notes}
      )
      ON CONFLICT (id) DO UPDATE SET
        row_number = EXCLUDED.row_number,
        day = EXCLUDED.day,
        week = EXCLUDED.week,
        date = EXCLUDED.date,
        activity_count = EXCLUDED.activity_count,
        pic = EXCLUDED.pic,
        topic = EXCLUDED.topic,
        default_learned = EXCLUDED.default_learned,
        default_notes = EXCLUDED.default_notes
    `;
  }
  for (const update of plan.topics.updates) {
    const t = plan.updateValues.topics[update.id];
    if (!t) throw new Error(`Internal error: no values for diary_topics update ${update.id}`);
    const set = changedValues(update.changes, t);
    await tx`
      INSERT INTO diary_topics (
        id, row_number, day, week, date, activity_count, pic, topic, default_learned, default_notes
      ) VALUES (
        ${t.id}, ${t.row_number}, ${t.day}, ${t.week}, ${t.date}, ${t.activity_count},
        ${t.pic}, ${t.topic}, ${t.default_learned}, ${t.default_notes}
      )
      ON CONFLICT (id) DO UPDATE SET ${tx(set)}
    `;
  }

  for (const e of plan.entries.inserts) {
    await tx`
      INSERT INTO diary_entries (id, row_number, learned, notes, updated_at)
      VALUES (${e.id}, ${e.row_number}, ${e.learned}, ${e.notes}, ${now})
      ON CONFLICT (row_number) DO UPDATE SET
        learned = EXCLUDED.learned,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `;
  }
  for (const update of plan.entries.updates) {
    const e = plan.updateValues.entries[update.id];
    if (!e) throw new Error(`Internal error: no values for diary_entries update ${update.id}`);
    const set = { ...changedValues(update.changes, e), updated_at: now };
    await tx`
      INSERT INTO diary_entries (id, row_number, learned, notes, updated_at)
      VALUES (${e.id}, ${e.row_number}, ${e.learned}, ${e.notes}, ${now})
      ON CONFLICT (row_number) DO UPDATE SET ${tx(set)}
    `;
  }

  if (plan.entries.deletes.length > 0) {
    await tx`DELETE FROM diary_entries WHERE id IN ${tx(plan.entries.deletes.map((d) => d.id))}`;
  }
  if (plan.topics.deletes.length > 0) {
    await tx`DELETE FROM diary_topics WHERE id IN ${tx(plan.topics.deletes.map((d) => d.id))}`;
  }
}

/** The file's raw values for the changed columns only. */
function changedValues<V extends object>(
  changes: Record<string, FieldChange>,
  values: V,
): Record<string, string | number | null> {
  const set: Record<string, string | number | null> = {};
  for (const field of Object.keys(changes)) {
    if (!(field in values)) throw new Error(`Internal error: unknown column ${field}`);
    set[field] = (values as Record<string, string | number | null>)[field];
  }
  return set;
}
