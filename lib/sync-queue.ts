export type PendingSessionSync = {
  activityId: string;
  actualStart: string;
  actualEnd: string;
  durationMinutes: number;
  queuedAt: string;
  attempts: number;
};

const STORAGE_KEY = 'onboarding-pending-session-syncs';

export function readPendingSyncs(raw: string | null): PendingSessionSync[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is PendingSessionSync => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return typeof record.activityId === 'string' && typeof record.actualStart === 'string'
        && typeof record.actualEnd === 'string' && typeof record.durationMinutes === 'number'
        && typeof record.queuedAt === 'string' && typeof record.attempts === 'number';
    });
  } catch { return []; }
}

export function enqueueSync(existing: PendingSessionSync[], item: Omit<PendingSessionSync, 'queuedAt' | 'attempts'>): PendingSessionSync[] {
  if (existing.some((entry) => entry.activityId === item.activityId && entry.actualStart === item.actualStart)) return existing;
  return [...existing, { ...item, queuedAt: new Date().toISOString(), attempts: 0 }];
}

export function pendingSyncStorageKey(): string { return STORAGE_KEY; }

export function writePendingSyncs(storage: Pick<Storage, 'setItem'>, items: PendingSessionSync[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function removePendingSync(items: PendingSessionSync[], target: PendingSessionSync): PendingSessionSync[] {
  return items.filter((item) => !(item.activityId === target.activityId && item.actualStart === target.actualStart));
}
