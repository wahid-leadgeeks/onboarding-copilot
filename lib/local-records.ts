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

function isDiary(value: unknown): value is StoredDiary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.content === "string" && typeof item.createdAt === "string"
    && (item.id === undefined || typeof item.id === "string")
    && (item.activityId === undefined || typeof item.activityId === "string")
    && (item.activityName === undefined || typeof item.activityName === "string")
    && (item.source === undefined || isDiarySource(item.source))
    && (item.updatedAt === undefined || typeof item.updatedAt === "string");
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
};

/** Replaces the content of every entry matching `id` (explicit or derived), keeping `createdAt` stable. */
export function editDiary(existing: StoredDiary[], edit: DiaryEdit): StoredDiary[] {
  return existing.map((entry) => resolvedDiaryId(entry) === edit.id
    ? { ...entry, id: edit.id, content: edit.content, updatedAt: edit.updatedAt }
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
