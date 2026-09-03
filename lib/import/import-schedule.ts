import type { Activity, ActivityStatus } from '@/lib/types/activity';
import { ImportError } from './error';
import { parseCsv } from './csv';
import { parseXlsx } from './xlsx';

export type ImportScheduleResult = {
  activities: Activity[];
  skipped: number;
  warnings: string[];
};

const MAX_ROWS = 201;
const MAX_COLUMNS = 26;
const MAX_WARNINGS = 5;
const DEFAULT_TYPE = 'learning';

const NAME_COLUMNS = ['name', 'activity', 'activityname', 'task', 'title'];
const START_COLUMNS = ['start', 'plannedstart', 'starttime', 'from', 'begin'];
const END_COLUMNS = ['end', 'plannedend', 'endtime', 'to', 'until', 'finish'];
const TYPE_COLUMNS = ['type', 'category', 'kind'];
const STATUS_COLUMNS = ['status', 'state'];

const STATUS_MAP: Record<string, ActivityStatus> = {
  completed: 'done',
  done: 'done',
  inprogress: 'in-progress',
  overdue: 'overdue',
  late: 'overdue',
};

type HeaderRow = {
  index: number;
  name: number;
  start: number;
  end: number;
  type: number | null;
  status: number | null;
};

/** Parses an uploaded schedule file into validated activities. Untrusted input. */
export function importScheduleFromFile(bytes: Uint8Array, filename: string): ImportScheduleResult {
  const matrix = toMatrix(bytes, filename);
  enforceCaps(matrix);
  const header = findHeader(matrix);
  const activities: Activity[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  const dataRows = matrix.slice(header.index + 1);
  dataRows.forEach((row, offset) => {
    const n = offset + 1;
    const activity = rowToActivity(row, n, header);
    if (typeof activity === 'string') {
      skipped++;
      if (warnings.length < MAX_WARNINGS) warnings.push(activity);
      return;
    }
    if (activity !== null) activities.push(activity);
  });
  if (activities.length === 0) throw new ImportError('No valid activities were found in this file.');
  return { activities, skipped, warnings };
}

function toMatrix(bytes: Uint8Array, filename: string): string[][] {
  if (isZip(bytes)) return parseXlsx(bytes);
  const lower = filename.toLowerCase();
  if (/\.(csv|tsv|txt)$/.test(lower)) return parseCsv(new TextDecoder().decode(bytes));
  if (lower.endsWith('.xlsx')) throw new ImportError('This file is not a valid Excel workbook.');
  throw new ImportError('Unsupported file type. Use .xlsx, .csv, or .tsv.');
}

function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function enforceCaps(matrix: string[][]): void {
  if (matrix.length > MAX_ROWS) throw new ImportError('The file has too many rows. Keep it under 200 activities.');
  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  if (width > MAX_COLUMNS) throw new ImportError('The file has too many columns.');
}

function findHeader(matrix: string[][]): HeaderRow {
  let scanned = 0;
  for (let i = 0; i < matrix.length && scanned < 5; i++) {
    if (matrix[i].every((cell) => cell.trim() === '')) continue;
    scanned++;
    const columns = mapColumns(matrix[i]);
    if (columns !== null) return { index: i, ...columns };
  }
  throw new ImportError('Could not find the schedule columns. Expected columns like "Activity", "Start", and "End".');
}

/** Maps column roles for a candidate header row; requires at least 2 of name/start/end. */
function mapColumns(row: string[]): { name: number; start: number; end: number; type: number | null; status: number | null } | null {
  const name = indexOfColumn(row, NAME_COLUMNS);
  const start = indexOfColumn(row, START_COLUMNS);
  const end = indexOfColumn(row, END_COLUMNS);
  const found = [name, start, end].filter((index) => index !== null).length;
  if (found < 2) return null;
  return {
    name: name ?? 0,
    start: start ?? 0,
    end: end ?? 0,
    type: indexOfColumn(row, TYPE_COLUMNS),
    status: indexOfColumn(row, STATUS_COLUMNS),
  };
}

function indexOfColumn(row: string[], candidates: string[]): number | null {
  for (let i = 0; i < row.length; i++) {
    if (candidates.includes(normalizeKey(row[i]))) return i;
  }
  return null;
}

/** A row becomes an Activity, null when silently skipped, or a warning message when rejected. */
function rowToActivity(row: string[], n: number, header: HeaderRow): Activity | string | null {
  const name = cell(row, header.name).trim();
  if (name === '') return null;
  const plannedStart = parseTime(cell(row, header.start));
  const plannedEnd = parseTime(cell(row, header.end));
  if (plannedStart === null || plannedEnd === null) return `Row ${n}: could not read the start/end time`;
  const type = header.type === null ? DEFAULT_TYPE : cell(row, header.type).trim();
  return {
    id: `import-${n}-${slug(name)}`,
    name,
    type: type === '' ? DEFAULT_TYPE : type,
    plannedStart,
    plannedEnd,
    status: parseStatus(header.status === null ? '' : cell(row, header.status)),
  };
}

function cell(row: string[], index: number): string {
  const value = row[index];
  return typeof value === 'string' ? value : '';
}

/** Accepts 'H:MM' (24h), 'H:MM am/pm', or an Excel time-of-day fraction in [0, 1). */
function parseTime(value: string): string | null {
  const text = value.trim();
  const meridiem = text.match(/^([0-9]{1,2}):([0-9]{2})\s*(am|pm)$/i);
  if (meridiem !== null) {
    const hours = Number(meridiem[1]);
    const minutes = Number(meridiem[2]);
    if (hours > 12 || minutes > 59) return null;
    return formatTime(meridiemTo24(hours, meridiem[3].toLowerCase()) * 60 + minutes);
  }
  const clock = text.match(/^([0-9]{1,2}):([0-9]{2})$/);
  if (clock !== null) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (hours > 23 || minutes > 59) return null;
    return formatTime(hours * 60 + minutes);
  }
  if (text !== '' && /^[0-9]*(\.[0-9]+)?$/.test(text)) {
    const fraction = Number(text);
    if (fraction >= 0 && fraction < 1) return formatTime(Math.round(fraction * 1440) % 1440);
  }
  return null;
}

function meridiemTo24(hours: number, suffix: string): number {
  if (suffix === 'am') return hours === 12 ? 0 : hours;
  return hours === 12 ? 12 : hours + 12;
}

/** Formats minutes since midnight as 'HH:MM'. */
function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseStatus(value: string): ActivityStatus {
  return STATUS_MAP[normalizeKey(value)] ?? 'not-started';
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
