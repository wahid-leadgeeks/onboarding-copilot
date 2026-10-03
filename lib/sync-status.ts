import { formatJakartaTime } from './format-date';
import {
  pendingSyncStorageKey,
  readPendingSyncs,
  removePendingSync,
  writePendingSyncs,
  type PendingSessionSync,
} from './sync-queue';

/** Shape of GET /api/health that the status chip relies on. */
export interface HealthSnapshot {
  mode: string;
  spreadsheetId?: string | null;
  integrations: {
    sheets: boolean;
    sheetsRead?: boolean;
    sheetsWrite?: boolean;
    diaryWrite?: boolean;
    oauth: boolean;
    ai: boolean;
  };
}

export function isHealthSnapshot(value: unknown): value is HealthSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const integrations = record.integrations;
  if (!integrations || typeof integrations !== 'object') return false;
  const flags = integrations as Record<string, unknown>;
  const optionalBoolean = (flag: unknown) => flag === undefined || typeof flag === 'boolean';
  return (
    typeof record.mode === 'string' &&
    typeof flags.sheets === 'boolean' &&
    typeof flags.oauth === 'boolean' &&
    typeof flags.ai === 'boolean' &&
    optionalBoolean(flags.sheetsRead) &&
    optionalBoolean(flags.sheetsWrite) &&
    optionalBoolean(flags.diaryWrite) &&
    (record.spreadsheetId === undefined || record.spreadsheetId === null || typeof record.spreadsheetId === 'string')
  );
}

export type SyncStateKind = 'checking' | 'local' | 'synced' | 'never-synced' | 'error';
export type SyncTone = 'mint' | 'stone' | 'peach';

export interface SyncState {
  kind: SyncStateKind;
  label: string;
  tone: SyncTone;
}

export interface SyncStateInput {
  health: HealthSnapshot | null;
  healthFailed: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
}

/**
 * One user-facing sync status, in priority order:
 * health failed → error; no health yet → checking; local mode or no sheet → saved on this device;
 * pending writes → error (even after an earlier success); a recorded success → "Synced HH:MM";
 * otherwise connected but never synced.
 */
export function deriveSyncState({ health, healthFailed, pendingCount, lastSyncedAt }: SyncStateInput): SyncState {
  if (healthFailed) return { kind: 'error', label: 'Couldn’t sync — retry', tone: 'peach' };
  if (!health) return { kind: 'checking', label: 'Checking…', tone: 'stone' };
  if (health.mode !== 'connected' || !health.integrations.sheets) {
    return { kind: 'local', label: 'Saved on this device', tone: 'stone' };
  }
  if (pendingCount > 0) return { kind: 'error', label: 'Couldn’t sync — retry', tone: 'peach' };
  const time = lastSyncedAt ? formatJakartaTime(new Date(lastSyncedAt)) : '';
  if (time) return { kind: 'synced', label: `Synced ${time}`, tone: 'mint' };
  return { kind: 'never-synced', label: 'Not synced yet', tone: 'stone' };
}

export const LAST_SYNCED_STORAGE_KEY = 'nova-last-synced-at';
export const SYNC_CHANGED_EVENT = 'nova:sync-changed';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

/** Records a confirmed successful write to the sheet. Never throws. */
export function markSynced(storage: WriteStorage | null | undefined, now: Date = new Date()): void {
  try {
    storage?.setItem(LAST_SYNCED_STORAGE_KEY, now.toISOString());
  } catch {
    /* storage unavailable: the chip falls back to "Not synced yet" */
  }
}

export function readLastSyncedAt(storage: ReadStorage | null | undefined): string | null {
  try {
    const value = storage?.getItem(LAST_SYNCED_STORAGE_KEY) ?? null;
    return value && !Number.isNaN(new Date(value).getTime()) ? value : null;
  } catch {
    return null;
  }
}

export function readPendingCount(storage: ReadStorage | null | undefined): number {
  try {
    return readPendingSyncs(storage?.getItem(pendingSyncStorageKey()) ?? null).length;
  } catch {
    return 0;
  }
}

/** Tells every status chip to re-check. */
export function notifySyncChanged(target: Pick<EventTarget, 'dispatchEvent'> | null | undefined = typeof window === 'undefined' ? null : window): void {
  try {
    target?.dispatchEvent(new Event(SYNC_CHANGED_EVENT));
  } catch {
    /* no event target */
  }
}

/** POST /api/session marked the row synced only when it says so; failures and 4xx never count. */
export function isSessionSynced(payload: unknown): boolean {
  return Boolean(payload && typeof payload === 'object' && (payload as Record<string, unknown>).syncStatus === 'synced');
}

export interface RetryPendingResult {
  synced: PendingSessionSync[];
  remaining: PendingSessionSync[];
}

/**
 * Replays every queued session through POST /api/session/retry (same requests
 * as the Settings page always made), drops the ones the server confirms with
 * `{ synced: true }`, and persists the rest. Records a sync when any succeeded.
 */
export async function retryPendingSessionSyncs(
  storage: ReadStorage & WriteStorage,
  fetchImpl: typeof fetch,
  now: () => Date = () => new Date()
): Promise<RetryPendingResult> {
  let pending: PendingSessionSync[] = [];
  try {
    pending = readPendingSyncs(storage.getItem(pendingSyncStorageKey()));
  } catch {
    return { synced: [], remaining: [] };
  }
  const results = await Promise.all(
    pending.map(async (item) => {
      const response = await fetchImpl('/api/session/retry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item),
      }).catch(() => null);
      const value = response?.ok ? ((await response.json().catch(() => null)) as { synced?: boolean } | null) : null;
      return value?.synced ? item : null;
    })
  );
  const synced = results.filter((item): item is PendingSessionSync => item !== null);
  const remaining = synced.reduce((items, item) => removePendingSync(items, item), pending);
  try {
    writePendingSyncs(storage, remaining);
  } catch {
    /* storage unavailable */
  }
  if (synced.length > 0) markSynced(storage, now());
  return { synced, remaining };
}
