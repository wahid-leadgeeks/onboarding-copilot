import {
  deriveSyncState,
  isHealthSnapshot,
  isSessionSynced,
  LAST_SYNCED_STORAGE_KEY,
  markSynced,
  notifySyncChanged,
  readLastSyncedAt,
  readPendingCount,
  retryPendingSessionSyncs,
  SYNC_CHANGED_EVENT,
  type HealthSnapshot,
} from './sync-status';
import { pendingSyncStorageKey, type PendingSessionSync } from './sync-queue';

const connected: HealthSnapshot = {
  mode: 'connected',
  spreadsheetId: 'sheet-id',
  integrations: { sheets: true, oauth: true, ai: false },
};
const local: HealthSnapshot = { mode: 'local', spreadsheetId: null, integrations: { sheets: false, oauth: false, ai: false } };

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

const item = (activityId: string): PendingSessionSync => ({
  activityId,
  actualStart: '2026-09-02T02:00:00.000Z',
  actualEnd: '2026-09-02T03:00:00.000Z',
  durationMinutes: 60,
  queuedAt: '2026-09-02T03:00:00.000Z',
  attempts: 0,
});

describe('deriveSyncState', () => {
  it('reports local mode as saved on this device', () => {
    expect(deriveSyncState({ health: local, healthFailed: false, pendingCount: 0, lastSyncedAt: null }).label).toBe('Saved on this device');
    const noSheets = { ...connected, integrations: { ...connected.integrations, sheets: false } };
    expect(deriveSyncState({ health: noSheets, healthFailed: false, pendingCount: 2, lastSyncedAt: null })).toEqual({
      kind: 'local', label: 'Saved on this device', tone: 'stone',
    });
  });

  it('reports a recorded sync as Synced HH:MM in Asia/Jakarta', () => {
    const state = deriveSyncState({ health: connected, healthFailed: false, pendingCount: 0, lastSyncedAt: '2026-09-01T02:05:00.000Z' });
    expect(state).toEqual({ kind: 'synced', label: 'Synced 09:05', tone: 'mint' });
  });

  it('reports failures as Couldn’t sync — retry', () => {
    expect(deriveSyncState({ health: null, healthFailed: true, pendingCount: 0, lastSyncedAt: null }).label).toBe('Couldn’t sync — retry');
    expect(deriveSyncState({ health: connected, healthFailed: false, pendingCount: 1, lastSyncedAt: null }).tone).toBe('peach');
  });

  it('keeps the error when items are pending even after a fresh sync', () => {
    const state = deriveSyncState({ health: connected, healthFailed: false, pendingCount: 1, lastSyncedAt: new Date().toISOString() });
    expect(state.label).toBe('Couldn’t sync — retry');
  });

  it('distinguishes checking and never-synced', () => {
    expect(deriveSyncState({ health: null, healthFailed: false, pendingCount: 0, lastSyncedAt: null }).label).toBe('Checking…');
    expect(deriveSyncState({ health: connected, healthFailed: false, pendingCount: 0, lastSyncedAt: null }).label).toBe('Not synced yet');
    expect(deriveSyncState({ health: connected, healthFailed: false, pendingCount: 0, lastSyncedAt: 'garbage' }).label).toBe('Not synced yet');
  });

  it('never mentions storage technology', () => {
    const labels = [
      deriveSyncState({ health: local, healthFailed: false, pendingCount: 0, lastSyncedAt: null }),
      deriveSyncState({ health: connected, healthFailed: false, pendingCount: 0, lastSyncedAt: '2026-09-01T02:05:00.000Z' }),
      deriveSyncState({ health: connected, healthFailed: true, pendingCount: 0, lastSyncedAt: null }),
      deriveSyncState({ health: connected, healthFailed: false, pendingCount: 0, lastSyncedAt: null }),
    ].map((s) => s.label).join(' ');
    expect(labels).not.toMatch(/PostgreSQL|Dual|DB/);
  });
});

describe('isHealthSnapshot', () => {
  it('accepts the /api/health shape and rejects others', () => {
    expect(isHealthSnapshot({ status: 'ok', ...connected })).toBe(true);
    expect(isHealthSnapshot({ mode: 'local' })).toBe(false);
    expect(isHealthSnapshot(null)).toBe(false);
  });
});

describe('last-synced storage', () => {
  it('round-trips and survives throwing storage', () => {
    const storage = memoryStorage();
    markSynced(storage, new Date('2026-09-01T02:05:00.000Z'));
    expect(storage.data.get(LAST_SYNCED_STORAGE_KEY)).toBe('2026-09-01T02:05:00.000Z');
    expect(readLastSyncedAt(storage)).toBe('2026-09-01T02:05:00.000Z');
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(() => markSynced(throwing)).not.toThrow();
    expect(readLastSyncedAt(throwing)).toBeNull();
    expect(readPendingCount(throwing)).toBe(0);
  });

  it('counts the pending queue', () => {
    const storage = memoryStorage({ [pendingSyncStorageKey()]: JSON.stringify([item('a'), item('b')]) });
    expect(readPendingCount(storage)).toBe(2);
  });

  it('dispatches the change event', () => {
    const events: string[] = [];
    notifySyncChanged({ dispatchEvent: (event: Event) => { events.push(event.type); return true; } });
    expect(events).toEqual([SYNC_CHANGED_EVENT]);
  });
});

describe('isSessionSynced', () => {
  it('only counts an explicit synced status', () => {
    expect(isSessionSynced({ syncStatus: 'synced' })).toBe(true);
    expect(isSessionSynced({ syncStatus: 'pending', pendingSync: item('a') })).toBe(false);
    expect(isSessionSynced(null)).toBe(false);
    expect(isSessionSynced({ error: 'activityId, start, and end are required' })).toBe(false);
  });
});

describe('retryPendingSessionSyncs', () => {
  it('sends one retry request per item, keeps failures and records the sync', async () => {
    const storage = memoryStorage({ [pendingSyncStorageKey()]: JSON.stringify([item('a'), item('b'), item('c')]) });
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const id = JSON.parse(String(init?.body)).activityId;
      if (id === 'c') throw new Error('offline');
      return { ok: true, json: async () => ({ synced: id === 'a' }) } as Response;
    }) as unknown as typeof fetch;

    const result = await retryPendingSessionSyncs(storage, fetchImpl, () => new Date('2026-09-01T02:05:00.000Z'));

    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual({
      url: '/api/session/retry',
      init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item('a')) },
    });
    expect(result.synced.map((s) => s.activityId)).toEqual(['a']);
    expect(result.remaining.map((s) => s.activityId)).toEqual(['b', 'c']);
    expect(JSON.parse(storage.data.get(pendingSyncStorageKey()) ?? '[]')).toHaveLength(2);
    expect(storage.data.get(LAST_SYNCED_STORAGE_KEY)).toBe('2026-09-01T02:05:00.000Z');
  });

  it('does not record a sync when nothing synced (failed or 400 responses)', async () => {
    const storage = memoryStorage({ [pendingSyncStorageKey()]: JSON.stringify([item('a'), item('b')]) });
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      const id = JSON.parse(String(init?.body)).activityId;
      return id === 'a'
        ? ({ ok: false, json: async () => ({ error: 'Invalid session timing' }) } as Response)
        : ({ ok: true, json: async () => ({ synced: false }) } as Response);
    }) as unknown as typeof fetch;

    const result = await retryPendingSessionSyncs(storage, fetchImpl);

    expect(result.synced).toEqual([]);
    expect(result.remaining).toHaveLength(2);
    expect(storage.data.has(LAST_SYNCED_STORAGE_KEY)).toBe(false);
  });
});
