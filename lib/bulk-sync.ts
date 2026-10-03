/**
 * Planning and request-body builders for the bulk "overwrite the sheet" flows.
 *
 * The plans describe exactly what the server routes will write, so the modal
 * can state the affected rows/ranges before anything is sent:
 * - Diary: POST /api/diary/sync writes 'Onboarding Diary'!G2:H{maxRow} in one block
 *   and refuses (409, emptyRows) if any row would be blank.
 * - Schedule: POST /api/schedule/sync writes G–L for exactly the activities posted,
 *   grouped into contiguous chunks; an empty list makes the route fall back to
 *   ALL rows, so the builder refuses to send one.
 */
import { OFFICIAL_DIARY_TOPICS, type DiaryEntryRecord, type DiaryTopicItem } from './diary-cockpit';
import {
  escapeTsv,
  groupScheduleActivitiesIntoChunks,
  type ScheduleActivity,
  type ScheduleSheetRangeChunk,
} from './schedule-catalog';

/** Where the page's data came from; 'loading' means nothing trustworthy is loaded yet. */
export type BulkSyncDataSource = 'loading' | 'database' | 'catalog' | 'local';

export type DiarySyncScope = 'official' | 'all';

/** Last sheet row written for each diary scope (rows start at 2). */
export const DIARY_SCOPE_MAX_ROW: Record<DiarySyncScope, number> = { official: 25, all: 29 };

export const DIARY_SHEET_NAME = 'Onboarding Diary';
export const SCHEDULE_SHEET_NAME = 'Schedule';

export interface BulkSyncPlanRow {
  rowNumber: number;
  label: string;
  ready: boolean;
}

export interface DiaryBulkSyncPlan {
  rows: BulkSyncPlanRow[];
  /** Rows that would be written blank (the route refuses these). */
  emptyRows: number[];
  /** A1 range on the 'Onboarding Diary' sheet, e.g. "G2:H25". */
  range: string;
  /** Rows the sync would write. */
  count: number;
  readyCount: number;
  maxRow: number;
  /** Rows are exactly 2..maxRow with no gaps (the route refuses otherwise). */
  aligned: boolean;
}

function firstLine(text: string): string {
  return text.split('\n')[0]?.trim() ?? '';
}

/**
 * Plans a diary bulk sync for rows 2..maxRow. Readiness uses the page's
 * whole-entry rule (calculateDiaryCockpitProgress): a saved entry replaces the
 * topic defaults entirely, even when one of its fields is empty.
 */
export function diaryBulkSyncPlan(
  entries: readonly DiaryEntryRecord[],
  topics: readonly DiaryTopicItem[] = OFFICIAL_DIARY_TOPICS,
  maxRow: number
): DiaryBulkSyncPlan {
  const targets = topics
    .filter((topic) => topic.rowNumber >= 2 && topic.rowNumber <= maxRow)
    .sort((a, b) => a.rowNumber - b.rowNumber);
  const rows = targets.map((topic) => {
    const saved = entries.find((entry) => entry.rowNumber === topic.rowNumber);
    const learned = (saved ? saved.learned : topic.defaultLearned || '').trim();
    const notes = (saved ? saved.notes : topic.defaultNotes || '').trim();
    return { rowNumber: topic.rowNumber, label: firstLine(topic.topic), ready: Boolean(learned && notes) };
  });
  const emptyRows = rows.filter((row) => !row.ready).map((row) => row.rowNumber);
  const aligned =
    Number.isInteger(maxRow) &&
    rows.length > 0 &&
    rows.length === maxRow - 1 &&
    rows.every((row, i) => row.rowNumber === i + 2);
  return {
    rows,
    emptyRows,
    range: `G2:H${maxRow}`,
    count: rows.length,
    readyCount: rows.length - emptyRows.length,
    maxRow,
    aligned,
  };
}

export interface DiaryScopeSummary {
  scope: DiarySyncScope;
  maxRow: number;
  /** Topics the scope writes (rows 2..maxRow). */
  count: number;
  /** e.g. "Official range: 24 topics, rows 2–25" — always names the scope it counts. */
  label: string;
}

/** Both diary sync scopes with their real topic counts, for the scope choice in the bulk sync modal. */
export function diaryScopeSummaries(
  topics: readonly DiaryTopicItem[] = OFFICIAL_DIARY_TOPICS
): Record<DiarySyncScope, DiaryScopeSummary> {
  const summarize = (scope: DiarySyncScope): DiaryScopeSummary => {
    const maxRow = DIARY_SCOPE_MAX_ROW[scope];
    const count = topics.filter((topic) => topic.rowNumber >= 2 && topic.rowNumber <= maxRow).length;
    const rows = `rows 2–${maxRow}`;
    const label =
      scope === 'official'
        ? `Official range: ${count} topic${count === 1 ? '' : 's'}, ${rows}`
        : `All topics: ${count}, ${rows}`;
    return { scope, maxRow, count, label };
  };
  return { official: summarize('official'), all: summarize('all') };
}

/** True when the row would write at least one non-empty G–L cell (mirrors groupScheduleActivitiesIntoChunks). */
export function scheduleRowHasData(activity: ScheduleActivity): boolean {
  const progress = activity.progress && activity.progress !== 'Not Started' ? activity.progress : '';
  const values = [
    activity.durationMinutes !== undefined && activity.durationMinutes !== null ? String(activity.durationMinutes) : '',
    activity.startTime || '',
    activity.endTime || '',
    progress,
    activity.materialsLink || '',
    activity.notes || '',
  ];
  return values.some((value) => value !== '');
}

export interface ScheduleBulkSyncPlan {
  /** Exactly the activities that will be posted (and written). */
  rowsWithData: ScheduleActivity[];
  /** Rows with nothing to write: left unchanged in the sheet. */
  skipped: ScheduleActivity[];
  chunks: ScheduleSheetRangeChunk[];
  /** A1 ranges on the 'Schedule' sheet, e.g. ["G3:L23", "G25:L34"]. */
  ranges: string[];
  /** Human summary of the written rows, e.g. "3–23, 25–34, 58". */
  rowSummary: string;
}

/** Plans a schedule bulk sync over every week: only rows with data are written. */
export function scheduleBulkSyncPlan(activities: readonly ScheduleActivity[]): ScheduleBulkSyncPlan {
  const sorted = [...activities].sort((a, b) => a.rowNumber - b.rowNumber);
  const rowsWithData = sorted.filter(scheduleRowHasData);
  const skipped = sorted.filter((activity) => !scheduleRowHasData(activity));
  const chunks = groupScheduleActivitiesIntoChunks(rowsWithData);
  return {
    rowsWithData,
    skipped,
    chunks,
    ranges: chunks.map((chunk) => `G${chunk.startRow}:L${chunk.endRow}`),
    rowSummary: chunks
      .map((chunk) => (chunk.startRow === chunk.endRow ? `${chunk.startRow}` : `${chunk.startRow}–${chunk.endRow}`))
      .join(', '),
  };
}

/** TSV for one contiguous chunk (columns G–L), identical to the per-row clipboard builder. */
export function scheduleChunkClipboard(chunk: Pick<ScheduleSheetRangeChunk, 'values'>): string {
  return chunk.values.map((row) => row.map(escapeTsv).join('\t')).join('\n');
}

export interface ScheduleSyncBody {
  week: 'All';
  activities: ScheduleActivity[];
}

/** Body for POST /api/schedule/sync. Throws rather than send something the route would widen. */
export function buildScheduleSyncBody(plan: ScheduleBulkSyncPlan, dataSource: BulkSyncDataSource): ScheduleSyncBody {
  if (dataSource === 'loading') throw new Error('The schedule is still loading. Try again in a moment.');
  if (plan.rowsWithData.length === 0) throw new Error('There are no rows with details to sync.');
  return { week: 'All', activities: plan.rowsWithData };
}

/**
 * Data source that guards syncing. Entries from localStorage may be shown before the server has
 * answered, but they must never be posted: until the remote load settles the source stays 'loading'.
 */
export function effectiveSyncSource(remoteSettled: boolean, dataSource: BulkSyncDataSource): BulkSyncDataSource {
  return remoteSettled ? dataSource : 'loading';
}

export interface DiarySyncBody {
  scope: DiarySyncScope;
  maxRow: number;
  entries: DiaryEntryRecord[];
}

/** Body for POST /api/diary/sync; same shape as before, entries limited to the written rows. */
export function buildDiarySyncBody(
  scope: DiarySyncScope,
  maxRow: number,
  entries: readonly DiaryEntryRecord[],
  dataSource: BulkSyncDataSource
): DiarySyncBody {
  if (dataSource === 'loading') throw new Error('Your notes are still loading. Try again in a moment.');
  return { scope, maxRow, entries: entries.filter((entry) => entry.rowNumber <= maxRow) };
}
