import { POST } from './route';

function post(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/session/start', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));
}

const MINUTE = 60_000;

describe('POST /api/session/start', () => {
  describe('validation (400)', () => {
    it('rejects an unparseable body', async () => {
      const res = await post('not json');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId is required');
    });

    it('rejects a non-object body', async () => {
      const res = await post('"activity"');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId is required');
    });

    it('rejects a missing activityId', async () => {
      const res = await post({ startedAt: new Date().toISOString() });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('activityId is required');
    });

    it('rejects an empty activityId', async () => {
      const res = await post({ activityId: '' });
      expect(res.status).toBe(400);
    });

    it('rejects a non-string activityId', async () => {
      const res = await post({ activityId: 42 });
      expect(res.status).toBe(400);
    });

    it('rejects an unparseable startedAt', async () => {
      const res = await post({ activityId: 'sched-row-5', startedAt: 'yesterday-ish' });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid start timestamp');
    });

    it('rejects a startedAt in the future', async () => {
      const res = await post({ activityId: 'sched-row-5', startedAt: new Date(Date.now() + 10 * MINUTE).toISOString() });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Invalid start timestamp');
    });
  });

  describe('success (201)', () => {
    it('defaults startedAt to now when omitted', async () => {
      const before = Date.now();
      const res = await post({ activityId: 'sched-row-5' });
      const after = Date.now();
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.activityId).toBe('sched-row-5');
      expect(json.status).toBe('in-progress');
      expect(json.lateStart).toBe(false);
      const started = new Date(json.startedAt).getTime();
      expect(started).toBeGreaterThanOrEqual(before);
      expect(started).toBeLessThanOrEqual(after);
    });

    it('echoes a past startedAt as ISO', async () => {
      const startedAt = new Date(Date.now() - 5 * MINUTE).toISOString();
      const res = await post({ activityId: 'sched-row-5', startedAt });
      expect(res.status).toBe(201);
      expect((await res.json()).startedAt).toBe(startedAt);
    });

    it('flags lateStart true when started after plannedStart', async () => {
      const now = Date.now();
      const res = await post({ activityId: 'sched-row-5', startedAt: new Date(now - MINUTE).toISOString(), plannedStart: new Date(now - 10 * MINUTE).toISOString() });
      expect(res.status).toBe(201);
      expect((await res.json()).lateStart).toBe(true);
    });

    it('flags lateStart false when started before plannedStart', async () => {
      const now = Date.now();
      const res = await post({ activityId: 'sched-row-5', startedAt: new Date(now - 10 * MINUTE).toISOString(), plannedStart: new Date(now - MINUTE).toISOString() });
      expect(res.status).toBe(201);
      expect((await res.json()).lateStart).toBe(false);
    });

    it('flags lateStart false when started exactly at plannedStart', async () => {
      const at = new Date(Date.now() - 5 * MINUTE).toISOString();
      const res = await post({ activityId: 'sched-row-5', startedAt: at, plannedStart: at });
      expect((await res.json()).lateStart).toBe(false);
    });

    it('treats a missing or unparseable plannedStart as not late', async () => {
      const missing = await post({ activityId: 'sched-row-5' });
      expect((await missing.json()).lateStart).toBe(false);
      const bad = await post({ activityId: 'sched-row-5', plannedStart: 'garbage' });
      expect(bad.status).toBe(201);
      expect((await bad.json()).lateStart).toBe(false);
    });
  });
});
