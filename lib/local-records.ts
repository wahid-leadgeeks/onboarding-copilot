export type StoredSession = {
  activityId: string;
  name: string;
  startedAt: number;
  finishedAt: number;
};

export type StoredDiary = {
  content: string;
  createdAt: string;
};

export const ACTIVE_SESSION_STORAGE_KEY = 'onboarding-session';
export const SESSION_HISTORY_STORAGE_KEY = 'onboarding-sessions';
export const DIARY_STORAGE_KEY = 'onboarding-diary';

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

function isSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.activityId === "string"
    && typeof item.name === "string"
    && typeof item.startedAt === "number"
    && typeof item.finishedAt === "number";
}

function isDiary(value: unknown): value is StoredDiary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.content === "string" && typeof item.createdAt === "string";
}

export function appendSession(existing: StoredSession[], next: StoredSession): StoredSession[] {
  return [...existing, next];
}

export function appendDiary(existing: StoredDiary[], next: StoredDiary): StoredDiary[] {
  return [...existing, next];
}

/** Returns unique activity IDs with a completed local session. */
export function completedActivityIds(sessions: StoredSession[]): Set<string> {
  return new Set(sessions.filter((session) => session.finishedAt > session.startedAt).map((session) => session.activityId));
}
