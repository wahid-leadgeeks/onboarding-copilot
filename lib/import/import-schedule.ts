import type { Activity, ActivityStatus } from '@/lib/types/activity';
import type { StoredDiary } from '@/lib/local-records';
import { ImportError } from './error';
import { parseCsv } from './csv';
import { parseXlsxSheets } from './xlsx';

export type ImportScheduleResult = {
  activities: Activity[];
  skipped: number;
  warnings: string[];
  diary?: StoredDiary[];
};

const MAX_ROWS = 201;
const MAX_COLUMNS = 26;
const MAX_WARNINGS = 5;
const DEFAULT_TYPE = 'learning';

const NAME_COLUMNS = ['name', 'activity', 'activityname', 'task', 'title', 'topic', 'topics', 'topik', 'subject', 'agenda', 'description'];
const START_COLUMNS = ['start', 'plannedstart', 'starttime', 'from', 'begin', 'mulai', 'waktumulai', 'jam'];
const END_COLUMNS = ['end', 'plannedend', 'endtime', 'to', 'until', 'finish', 'selesai', 'waktuselesai'];
const TYPE_COLUMNS = ['type', 'category', 'kind', 'mainmedia', 'media', 'format', 'mode', 'kategori', 'tipe', 'method'];
const STATUS_COLUMNS = ['status', 'state', 'progress', 'progres'];
const DURATION_COLUMNS = ['duration', 'durationminutes', 'durasi', 'length', 'time'];
const DATE_COLUMNS = ['date', 'tanggal'];

const STATUS_MAP: Record<string, ActivityStatus> = {
  completed: 'done',
  done: 'done',
  inprogress: 'in-progress',
  overdue: 'overdue',
  late: 'overdue',
  reschedule: 'not-started',
  rescheduled: 'not-started',
};

type HeaderRow = {
  index: number;
  name: number;
  start: number;
  end: number;
  type: number | null;
  status: number | null;
  duration: number | null;
  date: number | null;
};

/** Parses an uploaded schedule file into validated activities. Untrusted input. */
export function importScheduleFromFile(bytes: Uint8Array, filename: string): ImportScheduleResult {
  const { matrix, diary } = loadMatrix(bytes, filename);
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
  return { activities, skipped, warnings, diary };
}

function loadMatrix(bytes: Uint8Array, filename: string): { matrix: string[][]; diary?: StoredDiary[] } {
  if (isZip(bytes)) {
    const sheets = parseXlsxSheets(bytes);
    let scheduleSheet = sheets.find((s) => s.name.toLowerCase().includes('schedule'));
    if (!scheduleSheet) {
      for (const sheet of sheets) {
        if (hasHeader(sheet.matrix)) {
          scheduleSheet = sheet;
          break;
        }
      }
    }
    const matrix = scheduleSheet ? scheduleSheet.matrix : sheets[0].matrix;
    const diarySheet = sheets.find((s) => s.name.toLowerCase().includes('diary'));
    const diary = diarySheet ? parseDiarySheet(diarySheet.matrix) : undefined;
    return { matrix, diary };
  }
  const lower = filename.toLowerCase();
  if (/\.(csv|tsv|txt)$/.test(lower)) return { matrix: parseCsv(new TextDecoder().decode(bytes)) };
  if (lower.endsWith('.xlsx')) throw new ImportError('This file is not a valid Excel workbook.');
  throw new ImportError('Unsupported file type. Use .xlsx, .csv, or .tsv.');
}

function hasHeader(matrix: string[][]): boolean {
  let scanned = 0;
  for (let i = 0; i < matrix.length && scanned < 5; i++) {
    if (matrix[i].every((cell) => cell.trim() === '')) continue;
    scanned++;
    if (mapColumns(matrix[i]) !== null) return true;
  }
  return false;
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
function mapColumns(row: string[]): { name: number; start: number; end: number; type: number | null; status: number | null; duration: number | null; date: number | null } | null {
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
    duration: indexOfColumn(row, DURATION_COLUMNS),
    date: indexOfColumn(row, DATE_COLUMNS),
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

  const rawStart = cell(row, header.start).trim();
  const rawEnd = cell(row, header.end).trim();
  const durationMinutes = header.duration !== null ? parseDuration(cell(row, header.duration)) : undefined;

  let plannedStart: string | null = null;
  let plannedEnd: string | null = null;

  if (rawStart === '' && rawEnd === '') {
    plannedStart = 'TBD';
    plannedEnd = 'TBD';
  } else {
    plannedStart = rawStart !== '' ? parseTime(rawStart) : null;
    plannedEnd = rawEnd !== '' ? parseTime(rawEnd) : null;

    if (plannedStart !== null && plannedEnd === null && durationMinutes && durationMinutes > 0) {
      plannedEnd = addMinutes(plannedStart, durationMinutes);
    }
  }

  if (plannedStart === null || plannedEnd === null) return `Row ${n}: could not read the start/end time`;

  const rawType = header.type === null ? DEFAULT_TYPE : cell(row, header.type).trim();
  const type = rawType === '' ? DEFAULT_TYPE : normalizeType(rawType);
  const status = parseStatus(header.status === null ? '' : cell(row, header.status));
  const date = header.date !== null ? parseDate(cell(row, header.date)) : undefined;

  const activity: Activity = {
    id: `import-${n}-${slug(name)}`,
    name,
    type,
    plannedStart,
    plannedEnd,
    status,
  };

  if (durationMinutes !== undefined && durationMinutes > 0) {
    activity.durationMinutes = durationMinutes;
  }
  if (status === 'done' && plannedStart !== 'TBD' && plannedEnd !== 'TBD') {
    activity.actualStart = plannedStart;
    activity.actualEnd = plannedEnd;
    if (activity.durationMinutes === undefined) {
      activity.durationMinutes = calculateDuration(plannedStart, plannedEnd);
    }
  }
  if (date) {
    activity.date = date;
  }

  return activity;
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

function parseDuration(value: string): number | undefined {
  const text = value.trim();
  if (/^[0-9]+(\.[0-9]+)?$/.test(text)) {
    const num = Number(text);
    if (Number.isFinite(num) && num > 0) return Math.round(num);
  }
  return undefined;
}

function parseDate(value: string): string | undefined {
  const text = value.trim();
  if (!text || text.toLowerCase() === 'dd/mm/yyyy') return undefined;
  if (/^[0-9]+(\.[0-9]+)?$/.test(text)) {
    const num = Number(text);
    if (num > 10000 && num < 100000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const ddmmyyyy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calculateDuration(start: string, end: string): number {
  const startM = toMinutes(start);
  const endM = toMinutes(end);
  return Math.max(0, endM - startM);
}

function addMinutes(start: string, minutes: number): string {
  const total = toMinutes(start) + minutes;
  return formatTime(total % 1440);
}

function normalizeType(raw: string): string {
  const key = normalizeKey(raw);
  if (key.includes('meeting')) return 'meeting';
  if (key.includes('video')) return 'video';
  if (key.includes('learn') || key.includes('knowledge')) return 'learning';
  if (key.includes('setup') || key.includes('access')) return 'setup';
  if (key.includes('checkin')) return 'check-in';
  if (key.includes('review')) return 'review';
  if (key.includes('task')) return 'task';
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || DEFAULT_TYPE;
}

function parseDiarySheet(matrix: string[][]): StoredDiary[] {
  if (matrix.length < 2) return [];
  const headerRow = matrix[0];
  const topicCol = indexOfColumn(headerRow, ['topic', 'activity', 'name', 'title']);
  const learnCol = indexOfColumn(headerRow, ['thingsyoulearned', 'list3thingsyoulearnedfromthetopic', 'learn', 'learned', 'learning', 'learnings']);
  const notesCol = indexOfColumn(headerRow, ['yournotes', 'notes', 'catatan']);
  const dateCol = indexOfColumn(headerRow, ['date', 'tanggal']);

  if (topicCol === null) return [];

  const entries: StoredDiary[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    const topic = cell(row, topicCol).trim();
    const learnings = learnCol !== null ? cell(row, learnCol).trim() : '';
    const notes = notesCol !== null ? cell(row, notesCol).trim() : '';
    const dateRaw = dateCol !== null ? cell(row, dateCol).trim() : '';

    if (!topic || (!learnings && !notes)) continue;

    const sections: string[] = [`## ${topic}`];
    if (learnings) sections.push(`Key Learnings:\n${learnings}`);
    if (notes) sections.push(`Your Notes:\n${notes}`);

    const dateStr = parseDate(dateRaw);
    const createdAt = dateStr ? `${dateStr}T09:00:00.000Z` : new Date().toISOString();
    entries.push({ content: sections.join('\n\n'), createdAt });
  }
  return entries;
}

function parseStatus(value: string): ActivityStatus {
  return STATUS_MAP[normalizeKey(value)] ?? 'not-started';
}

function slug(name: string): string {
  const firstLine = name.split('\n')[0].trim();
  return firstLine
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
