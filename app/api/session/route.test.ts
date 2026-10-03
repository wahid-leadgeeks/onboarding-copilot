import { POST } from './route';
import * as clientModule from '@/lib/sheets/client';

const ENV_KEYS = ['DATABASE_URL', 'GOOGLE_SHEETS_ID', 'SHEETS_SCHEDULE_URL', 'SHEETS_WRITE_URL', 'SHEETS_DIARY_URL', 'SHEETS_WRITE_TOKEN'] as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function post(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/session', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));
}

function validPayload(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return { activityId: 'sched-row-5', start: new Date(now - 2 * HOUR).toISOString(), end: new Date(now - HOUR).toISOString(), ...overrides };
}

describe('POST /api/session', () => {
  const savedEnv = new Map<string, string | undefined>();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  beforeAll(() => {
    for (const key of ENV_KEYS) savedEnv.set(key, process.env[key]);
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('network access is blocked in tests');
    }) as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('validation (400)', () => {
    it('rejects an unparseable body', async () => {
      const res = await post('not json');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session payload');
    });

    it('rejects a JSON null body', async () => {
      const res = await post('null');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session payload');
    });

    it('rejects a non-object body (string)', async () => {
      const res = await post('"hello"');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session payload');
    });

    it('rejects a missing activityId', async () => {
      const { activityId: _omit, ...rest } = validPayload();
      void _omit;
      const res = await post(rest);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId, start, and end are required');
    });

    it('rejects a blank activityId', async () => {
      const res = await post(validPayload({ activityId: '   ' }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId, start, and end are required');
    });

    it('rejects a missing end', async () => {
      const { end: _omit, ...rest } = validPayload();
      void _omit;
      const res = await post(rest);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId, start, and end are required');
    });

    it('rejects non-string timestamps', async () => {
      const res = await post(validPayload({ start: 1700000000000 }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId, start, and end are required');
    });

    it('rejects unparseable (NaN) timestamps', async () => {
      const res = await post(validPayload({ start: 'not-a-date' }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid timestamps');
    });

    it('rejects a future start', async () => {
      const res = await post(validPayload({ start: new Date(Date.now() + 10 * MINUTE).toISOString() }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Session timestamps cannot be in the future');
    });

    it('rejects a future end', async () => {
      const res = await post(validPayload({ end: new Date(Date.now() + 10 * MINUTE).toISOString() }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Session timestamps cannot be in the future');
    });

    it('rejects end before start', async () => {
      const now = Date.now();
      const res = await post(validPayload({ start: new Date(now - HOUR).toISOString(), end: new Date(now - 2 * HOUR).toISOString() }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Session end must be after start');
    });

    it('rejects a session longer than 24 hours', async () => {
      const now = Date.now();
      const res = await post(validPayload({ start: new Date(now - 26 * HOUR).toISOString(), end: new Date(now - HOUR).toISOString() }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Session duration cannot exceed 24 hours');
    });

    it('never writes or fetches for an invalid payload', async () => {
      const writeSpy = jest.spyOn(clientModule, 'writeSession').mockResolvedValue(true);
      await post(validPayload({ start: 'nope' }));
      await post({});
      expect(writeSpy.mock.calls.length).toBe(0);
      expect(fetchCalls).toBe(0);
    });
  });

  describe('persistence outcome', () => {
    it('accepts a session of exactly 24 hours', async () => {
      const now = Date.now();
      jest.spyOn(clientModule, 'writeSession').mockResolvedValue(true);
      const res = await post(validPayload({ start: new Date(now - 25 * HOUR).toISOString(), end: new Date(now - HOUR).toISOString() }));
      expect(res.status).toBe(200);
      expect((await res.json()).durationMinutes).toBe(24 * 60);
    });

    it('reports synced when writeSession resolves true', async () => {
      const writeSpy = jest.spyOn(clientModule, 'writeSession').mockResolvedValue(true);
      const payload = validPayload();
      const res = await post(payload);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        activityId: 'sched-row-5',
        start: new Date(payload.start).toISOString(),
        end: new Date(payload.end).toISOString(),
        durationMinutes: 60,
        status: 'done',
        syncStatus: 'synced',
      });
      expect(writeSpy.mock.calls.length).toBe(1);
      expect(writeSpy.mock.calls[0][0]).toBe('sched-row-5');
      expect(writeSpy.mock.calls[0][1]).toEqual({ actualStart: new Date(payload.start).toISOString(), actualEnd: new Date(payload.end).toISOString(), durationMinutes: 60 });
    });

    it('reports pending with a pendingSync item when writeSession resolves false', async () => {
      jest.spyOn(clientModule, 'writeSession').mockResolvedValue(false);
      const payload = validPayload();
      const res = await post(payload);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.syncStatus).toBe('pending');
      expect(json.status).toBe('done');
      expect(json.durationMinutes).toBe(60);
      expect(json.pendingSync.activityId).toBe('sched-row-5');
      expect(json.pendingSync.actualStart).toBe(new Date(payload.start).toISOString());
      expect(json.pendingSync.actualEnd).toBe(new Date(payload.end).toISOString());
      expect(json.pendingSync.durationMinutes).toBe(60);
      expect(json.pendingSync.attempts).toBe(0);
      expect(typeof json.pendingSync.queuedAt).toBe('string');
    });

    it('reports pending (not an error) when writeSession throws', async () => {
      jest.spyOn(clientModule, 'writeSession').mockRejectedValue(new Error('sheet exploded'));
      const payload = validPayload();
      const res = await post(payload);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.syncStatus).toBe('pending');
      expect(json.status).toBe('done');
      expect(json.pendingSync.activityId).toBe('sched-row-5');
      expect(json.pendingSync.actualStart).toBe(new Date(payload.start).toISOString());
      expect(json.pendingSync.attempts).toBe(0);
    });

    it('with nothing configured the real writeSession yields pending without any network call', async () => {
      const res = await post(validPayload());
      expect(res.status).toBe(200);
      expect((await res.json()).syncStatus).toBe('pending');
      expect(fetchCalls).toBe(0);
    });
  });
});
