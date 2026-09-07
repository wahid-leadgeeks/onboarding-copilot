export type StoredSession = {
  activityId: string;
  name: string;
  startedAt: number;
  finishedAt: number;
};

/** Provenance only: keeps AI-assisted entries distinguishable (ADR 0003); never attendance or authorship. */
export type DiarySource = 'manual' | 'quick-note' | 'ai-assisted';

export type StoredDiary = {
  content: string;
  createdAt: string;
  id?: string;
  activityId?: string;
  activityName?: string;
  source?: DiarySource;
  updatedAt?: string;
  takeaways?: [string, string, string] | string[];
  topic?: string;
  day?: string;
  date?: string;
  week?: string | number;
  pic?: string;
  activityCount?: string | number;
  notes?: string;
};

export type StoredQuickNote = {
  content: string;
  createdAt: string;
  id?: string;
};

export const ACTIVE_SESSION_STORAGE_KEY = 'onboarding-session';
export const SESSION_HISTORY_STORAGE_KEY = 'onboarding-sessions';
export const DIARY_STORAGE_KEY = 'onboarding-diary';
export const QUICK_NOTES_STORAGE_KEY = 'onboarding-quick-notes';

function parseUnknown(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function readSessions(raw: string | null): StoredSession[] {
  const value = parseUnknown(raw);
  if (Array.isArray(value)) {
    return value.filter(isSession);
  }
  if (isSession(value)) return [value];
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (typeof item.startedAt === "number") {
      const finishedAt = typeof item.finishedAt === "number" ? item.finishedAt : 0;
      if (finishedAt) {
        return [{
          activityId: typeof item.activityId === "string" ? item.activityId : "unknown",
          name: typeof item.name === "string" ? item.name : "Completed session",
          startedAt: item.startedAt,
          finishedAt,
        }];
      }
    }
  }
  return [];
}

export function readDiary(raw: string | null): StoredDiary[] {
  const value = parseUnknown(raw);
  if (Array.isArray(value)) return value.filter(isDiary);
  if (isDiary(value)) return [value];
  return [];
}

export function readQuickNotes(raw: string | null): StoredQuickNote[] {
  const value = parseUnknown(raw);
  if (Array.isArray(value)) return value.filter(isQuickNote);
  if (isQuickNote(value)) return [value];
  return [];
}

function isSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.activityId === "string"
    && typeof item.name === "string"
    && typeof item.startedAt === "number"
    && typeof item.finishedAt === "number";
}

const DIARY_SOURCES = new Set<string>(['manual', 'quick-note', 'ai-assisted']);

function isDiarySource(value: unknown): value is DiarySource {
  return typeof value === 'string' && DIARY_SOURCES.has(value);
}

function isTakeaways(value: unknown): value is [string, string, string] | string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDiary(value: unknown): value is StoredDiary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.content === "string" && typeof item.createdAt === "string"
    && (item.id === undefined || typeof item.id === "string")
    && (item.activityId === undefined || typeof item.activityId === "string")
    && (item.activityName === undefined || typeof item.activityName === "string")
    && (item.source === undefined || isDiarySource(item.source))
    && (item.updatedAt === undefined || typeof item.updatedAt === "string")
    && (item.takeaways === undefined || isTakeaways(item.takeaways))
    && (item.topic === undefined || typeof item.topic === "string")
    && (item.day === undefined || typeof item.day === "string")
    && (item.date === undefined || typeof item.date === "string")
    && (item.week === undefined || typeof item.week === "string" || typeof item.week === "number")
    && (item.pic === undefined || typeof item.pic === "string")
    && (item.activityCount === undefined || typeof item.activityCount === "string" || typeof item.activityCount === "number")
    && (item.notes === undefined || typeof item.notes === "string");
}

function isQuickNote(value: unknown): value is StoredQuickNote {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.content === "string" && typeof item.createdAt === "string"
    && (item.id === undefined || typeof item.id === "string");
}

export function appendSession(existing: StoredSession[], next: StoredSession): StoredSession[] {
  return [...existing, next];
}

export function appendDiary(existing: StoredDiary[], next: StoredDiary): StoredDiary[] {
  return [...existing, next];
}

export function appendQuickNote(existing: StoredQuickNote[], next: StoredQuickNote): StoredQuickNote[] {
  return [...existing, next];
}

/** Returns unique activity IDs with a completed local session. */
export function completedActivityIds(sessions: StoredSession[]): Set<string> {
  return new Set(sessions.filter((session) => session.finishedAt > session.startedAt).map((session) => session.activityId));
}

/** FNV-1a, 32-bit, base-36. Deterministic across sessions; not cryptographic. */
function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Derives the stable ID for a diary entry from its content and creation time. */
export function diaryId(entry: Pick<StoredDiary, 'content' | 'createdAt'>): string {
  return `d-${stableHash(JSON.stringify([entry.createdAt, entry.content]))}`;
}

/** Derives the stable ID for a quick note from its content and creation time. */
export function quickNoteId(note: Pick<StoredQuickNote, 'content' | 'createdAt'>): string {
  return `q-${stableHash(JSON.stringify([note.createdAt, note.content]))}`;
}

function resolvedDiaryId(entry: StoredDiary): string {
  return entry.id ?? diaryId(entry);
}

function resolvedQuickNoteId(note: StoredQuickNote): string {
  return note.id ?? quickNoteId(note);
}

export type DiaryDraft = {
  content: string;
  activityId?: string;
  activityName?: string;
  source?: DiarySource;
  takeaways?: [string, string, string] | string[];
  topic?: string;
  day?: string;
  date?: string;
  week?: string | number;
  pic?: string;
  activityCount?: string | number;
  notes?: string;
};

/** Creates a diary entry with a derived stable ID. `createdAt` is injected so callers control the clock. */
export function createDiaryEntry(draft: DiaryDraft, createdAt: string): StoredDiary {
  return {
    content: draft.content,
    createdAt,
    id: diaryId({ content: draft.content, createdAt }),
    ...(draft.activityId === undefined ? {} : { activityId: draft.activityId }),
    ...(draft.activityName === undefined ? {} : { activityName: draft.activityName }),
    ...(draft.source === undefined ? {} : { source: draft.source }),
    ...(draft.takeaways === undefined ? {} : { takeaways: draft.takeaways }),
    ...(draft.topic === undefined ? {} : { topic: draft.topic }),
    ...(draft.day === undefined ? {} : { day: draft.day }),
    ...(draft.date === undefined ? {} : { date: draft.date }),
    ...(draft.week === undefined ? {} : { week: draft.week }),
    ...(draft.pic === undefined ? {} : { pic: draft.pic }),
    ...(draft.activityCount === undefined ? {} : { activityCount: draft.activityCount }),
    ...(draft.notes === undefined ? {} : { notes: draft.notes }),
  };
}

/** Creates a quick note with a derived stable ID. `createdAt` is injected so callers control the clock. */
export function createQuickNote(content: string, createdAt: string): StoredQuickNote {
  return { content, createdAt, id: quickNoteId({ content, createdAt }) };
}

export type DiaryEdit = {
  id: string;
  content: string;
  updatedAt: string;
  takeaways?: [string, string, string] | string[];
  topic?: string;
  day?: string;
  date?: string;
  week?: string | number;
  pic?: string;
  activityCount?: string | number;
  notes?: string;
};

/** Replaces the content of every entry matching `id` (explicit or derived), keeping `createdAt` stable. */
export function editDiary(existing: StoredDiary[], edit: DiaryEdit): StoredDiary[] {
  return existing.map((entry) => resolvedDiaryId(entry) === edit.id
    ? {
        ...entry,
        id: edit.id,
        content: edit.content,
        updatedAt: edit.updatedAt,
        ...(edit.takeaways !== undefined ? { takeaways: edit.takeaways } : {}),
        ...(edit.topic !== undefined ? { topic: edit.topic } : {}),
        ...(edit.day !== undefined ? { day: edit.day } : {}),
        ...(edit.date !== undefined ? { date: edit.date } : {}),
        ...(edit.week !== undefined ? { week: edit.week } : {}),
        ...(edit.pic !== undefined ? { pic: edit.pic } : {}),
        ...(edit.activityCount !== undefined ? { activityCount: edit.activityCount } : {}),
        ...(edit.notes !== undefined ? { notes: edit.notes } : {}),
      }
    : entry);
}

export function removeDiary(existing: StoredDiary[], id: string): StoredDiary[] {
  return existing.filter((entry) => resolvedDiaryId(entry) !== id);
}

export function removeQuickNote(existing: StoredQuickNote[], id: string): StoredQuickNote[] {
  return existing.filter((note) => resolvedQuickNoteId(note) !== id);
}

export type QuickNoteConversion = {
  quickNotes: StoredQuickNote[];
  diary: StoredDiary[];
};

/** Converts a quick note into a diary entry, preserving the note's original timestamp. */
export function convertQuickNote(notes: StoredQuickNote[], diary: StoredDiary[], id: string): QuickNoteConversion {
  const note = notes.find((item) => resolvedQuickNoteId(item) === id);
  if (!note) return { quickNotes: notes, diary };
  const entry = createDiaryEntry({ content: note.content, source: 'quick-note' }, note.createdAt);
  return { quickNotes: removeQuickNote(notes, id), diary: appendDiary(diary, entry) };
}

/** Merges imported diary entries, skipping any content that already exists locally or earlier in the batch. */
export function mergeImportedDiary(existing: StoredDiary[], imported: StoredDiary[]): StoredDiary[] {
  const seen = new Set(existing.map((entry) => entry.content));
  const additions: StoredDiary[] = [];
  for (const entry of imported) {
    if (seen.has(entry.content)) continue;
    seen.add(entry.content);
    additions.push(entry);
  }
  return [...existing, ...additions];
}

/** Escapes a cell value for TSV clipboard export according to RFC4180. */
export function escapeTsvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes('\t') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a 3-takeaway array into a numbered multiline block.
 * Preserves user-supplied numbering if already present.
 */
export function formatTakeawaysForDiary(takeaways?: readonly string[] | string[]): string {
  if (!takeaways || takeaways.length === 0) return '';
  const filtered = takeaways
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (filtered.length === 0) return '';

  return filtered
    .map((item, index) => {
      if (/^\d+[\.\)\-]\s+/.test(item)) {
        return item;
      }
      return `${index + 1}. ${item}`;
    })
    .join('\n');
}

export type DiaryClipboardInput = {
  day?: string;
  week?: string | number;
  date?: string;
  activityCount?: string | number;
  pic?: string;
  topic?: string;
  takeaways?: [string, string, string] | string[];
  notes?: string;
  itmNotes?: string;
  activityName?: string;
  content?: string;
  createdAt?: string;
};

/**
 * Serializes a diary entry into an exact 9-column TSV row for the Onboarding Diary sheet.
 * Ready for 1-click clipboard paste (`Ctrl+V`) into cell A.
 *
 * Columns:
 * 0: Day
 * 1: Week
 * 2: Date
 * 3: Activity Count
 * 4: PIC
 * 5: Topic
 * 6: List 3 things you learned from the topic
 * 7: Your Notes
 * 8: ITM Notes
 */
export function clipboardRowForDiary(entry: DiaryClipboardInput): string {
  const day = entry.day ?? '';
  const week = entry.week !== undefined && entry.week !== null ? String(entry.week) : '';
  const date = entry.date ?? '';
  const activityCount = entry.activityCount !== undefined && entry.activityCount !== null ? String(entry.activityCount) : '';
  const pic = entry.pic ?? '';
  const topic = entry.topic ?? entry.activityName ?? '';

  let learnings = formatTakeawaysForDiary(entry.takeaways);
  if (!learnings && entry.content) {
    learnings = entry.content;
  }

  const notes = entry.notes ?? '';
  const itmNotes = entry.itmNotes ?? '';

  const columns = [
    day,
    week,
    date,
    activityCount,
    pic,
    topic,
    learnings,
    notes,
    itmNotes,
  ];

  return columns.map(escapeTsvCell).join('\t');
}
