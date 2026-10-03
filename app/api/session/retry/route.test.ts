import { POST } from './route';
import * as clientModule from '@/lib/sheets/client';

const ENV_KEYS = ['DATABASE_URL', 'GOOGLE_SHEETS_ID', 'SHEETS_SCHEDULE_URL', 'SHEETS_WRITE_URL', 'SHEETS_DIARY_URL', 'SHEETS_WRITE_TOKEN'] as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function post(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/session/retry', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));
}

function validPayload(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    activityId: 'sched-row-5',
    actualStart: new Date(now - 2 * HOUR).toISOString(),
    actualEnd: new Date(now - HOUR).toISOString(),
    durationMinutes: 60,
    ...overrides,
  };
}

describe('POST /api/session/retry', () => {
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
      expect((await res.json()).error).toBe('Invalid retry payload');
    });

    it('rejects a non-object body', async () => {
      const res = await post('"retry"');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid retry payload');
    });

    it('rejects a missing activityId', async () => {
      const { activityId: _omit, ...rest } = validPayload();
      void _omit;
      const res = await post(rest);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId, actualStart, actualEnd, and durationMinutes are required');
    });

    it('rejects a blank activityId', async () => {
      const res = await post(validPayload({ activityId: '  ' }));
      expect(res.status).toBe(400);
    });

    it('rejects a missing actualStart', async () => {
      const { actualStart: _omit, ...rest } = validPayload();
      void _omit;
      const res = await post(rest);
      expect(res.status).toBe(400);
    });

    it('rejects a missing actualEnd', async () => {
      const { actualEnd: _omit, ...rest } = validPayload();
      void _omit;
      const res = await post(rest);
      expect(res.status).toBe(400);
    });

    it('rejects a missing or non-numeric durationMinutes', async () => {
      const { durationMinutes: _omit, ...rest } = validPayload();
      void _omit;
      expect((await post(rest)).status).toBe(400);
      expect((await post(validPayload({ durationMinutes: '60' }))).status).toBe(400);
    });

    it('rejects a durationMinutes that does not match end minus start', async () => {
      const res = await post(validPayload({ durationMinutes: 59 }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session timing');
    });

    it('rejects an actualEnd in the future', async () => {
      const now = Date.now();
      const res = await post(validPayload({ actualStart: new Date(now - HOUR).toISOString(), actualEnd: new Date(now + 10 * MINUTE).toISOString(), durationMinutes: 70 }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session timing');
    });

    it('rejects unparseable timestamps', async () => {
      const res = await post(validPayload({ actualStart: 'not-a-date' }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session timing');
    });

    it('rejects end before start', async () => {
      const now = Date.now();
      const res = await post(validPayload({ actualStart: new Date(now - HOUR).toISOString(), actualEnd: new Date(now - 2 * HOUR).toISOString(), durationMinutes: 0 }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session timing');
    });

    it('rejects a session longer than 24 hours', async () => {
      const now = Date.now();
      const res = await post(validPayload({ actualStart: new Date(now - 26 * HOUR).toISOString(), actualEnd: new Date(now - HOUR).toISOString(), durationMinutes: 25 * 60 }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid session timing');
    });

    it('never calls writeSession for an invalid payload', async () => {
      const writeSpy = jest.spyOn(clientModule, 'writeSession').mockResolvedValue(true);
      await post(validPayload({ durationMinutes: 1 }));
      await post({});
      expect(writeSpy.mock.calls.length).toBe(0);
    });
  });

  describe('persistence outcome', () => {
    it('returns synced:true when writeSession resolves true, passing the normalized session', async () => {
      const writeSpy = jest.spyOn(clientModule, 'writeSession').mockResolvedValue(true);
      const payload = validPayload();
      const res = await post(payload);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ synced: true });
      expect(writeSpy.mock.calls.length).toBe(1);
      expect(writeSpy.mock.calls[0][0]).toBe('sched-row-5');
      expect(writeSpy.mock.calls[0][1]).toEqual({ actualStart: new Date(payload.actualStart).toISOString(), actualEnd: new Date(payload.actualEnd).toISOString(), durationMinutes: 60 });
    });

    it('returns synced:false when writeSession resolves false', async () => {
      jest.spyOn(clientModule, 'writeSession').mockResolvedValue(false);
      const res = await post(validPayload());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ synced: false });
    });

    it('returns synced:false (not an error) when writeSession throws', async () => {
      jest.spyOn(clientModule, 'writeSession').mockRejectedValue(new Error('sheet exploded'));
      const res = await post(validPayload());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ synced: false });
    });

    it('with nothing configured the real writeSession yields synced:false without any network call', async () => {
      const res = await post(validPayload());
      expect(await res.json()).toEqual({ synced: false });
      expect(fetchCalls).toBe(0);
    });
  });
});
