import { FEEDBACK_SESSIONS } from '@/lib/feedback';

// jest.mock is not hoisted by this repo's transform, so it runs before the route is required below.
const mockOnConflictDoUpdate = jest.fn();
const mockValues = jest.fn((_row: unknown) => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
const mockInsert = jest.fn((_table: unknown) => ({ values: mockValues }));

jest.mock('@/lib/db', () => ({
  isDbConfigured: () => {
    const url = process.env.DATABASE_URL || '';
    return url.startsWith('postgres://') || url.startsWith('postgresql://');
  },
  db: { insert: mockInsert },
  schema: {
    feedbackSessions: { rowNumber: 'feedback_sessions.row_number' },
    feedbackEntries: { rowNumber: 'feedback_entries.row_number', sessionId: 'feedback_entries.session_id' },
  },
}));

const { GET, POST } = require('./route') as typeof import('./route');

const ENV_KEYS = ['DATABASE_URL', 'GOOGLE_SHEETS_ID', 'SHEETS_SCHEDULE_URL', 'SHEETS_WRITE_URL', 'SHEETS_DIARY_URL', 'SHEETS_WRITE_TOKEN'] as const;
const FAKE_DB_URL = 'postgres://fake:fake@db.invalid:5432/fake';

function post(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/feedback', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));
}

describe('/api/feedback', () => {
  const savedEnv = new Map<string, string | undefined>();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(() => {
    for (const key of ENV_KEYS) savedEnv.set(key, process.env[key]);
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    mockInsert.mockClear();
    mockValues.mockClear();
    mockOnConflictDoUpdate.mockReset();
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('network access is blocked in tests');
    }) as typeof fetch;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    globalThis.fetch = originalFetch;
    expect(fetchCalls).toBe(0);
  });

  afterAll(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('without a database', () => {
    it('GET returns the static catalog and no entries', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.sessions).toEqual(FEEDBACK_SESSIONS);
      expect(json.entries).toEqual([]);
    });

    it('POST reports "Database not configured" and does not touch the db', async () => {
      const res = await post({ sessionId: 's1', rowNumber: 3 });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, message: 'Database not configured' });
      expect(mockInsert.mock.calls.length).toBe(0);
    });

    it('POST ignores a non-postgres DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'mysql://nope/x';
      const res = await post({ sessionId: 's1', rowNumber: 3 });
      expect((await res.json()).message).toBe('Database not configured');
      expect(mockInsert.mock.calls.length).toBe(0);
    });
  });

  describe('with a database configured', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = FAKE_DB_URL;
    });

    it('POST rejects an unparseable body with 400', async () => {
      const res = await post('not json');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('sessionId and rowNumber are required');
      expect(mockInsert.mock.calls.length).toBe(0);
    });

    it('POST rejects a missing sessionId with 400', async () => {
      const res = await post({ rowNumber: 3 });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('sessionId and rowNumber are required');
      expect(mockInsert.mock.calls.length).toBe(0);
    });

    it('POST rejects a missing rowNumber with 400', async () => {
      const res = await post({ sessionId: 's1' });
      expect(res.status).toBe(400);
      expect(mockInsert.mock.calls.length).toBe(0);
    });

    it('POST rejects a non-numeric rowNumber with 400', async () => {
      const res = await post({ sessionId: 's1', rowNumber: '3' });
      expect(res.status).toBe(400);
      expect(mockInsert.mock.calls.length).toBe(0);
    });

    it('POST upserts once and returns 200 with the sessionId', async () => {
      const res = await post({ sessionId: 's1', rowNumber: 3, date: '2026-01-02', pic: 'Pat', topic: 'Intro', ratings: { clarity: 4 }, hasQuestions: true, questionExplanation: 'why', suggestions: 'more' });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, sessionId: 's1' });
      expect(mockInsert.mock.calls.length).toBe(1);
      expect(mockValues.mock.calls.length).toBe(1);
      expect(mockOnConflictDoUpdate.mock.calls.length).toBe(1);
      const row = mockValues.mock.calls[0][0] as Record<string, unknown>;
      expect(row.id).toBe('fb-s1');
      expect(row.sessionId).toBe('s1');
      expect(row.rowNumber).toBe(3);
      expect(row.date).toBe('2026-01-02');
      expect(row.pic).toBe('Pat');
      expect(row.hasQuestions).toBe(true);
    });

    it('POST fills defaults for optional fields', async () => {
      const res = await post({ sessionId: 's2', rowNumber: 4 });
      expect(res.status).toBe(200);
      const row = mockValues.mock.calls[0][0] as Record<string, unknown>;
      expect(row.pic).toBe('');
      expect(row.topic).toBe('');
      expect(row.hasQuestions).toBe(false);
      expect(row.suggestions).toBe('');
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('POST returns 500 with the error message when the upsert rejects', async () => {
      mockOnConflictDoUpdate.mockRejectedValue(new Error('connection refused'));
      const res = await post({ sessionId: 's1', rowNumber: 3 });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'connection refused' });
      expect(mockOnConflictDoUpdate.mock.calls.length).toBe(1);
    });

    it('POST returns 500 with a generic message when a non-Error is thrown', async () => {
      mockOnConflictDoUpdate.mockRejectedValue('boom');
      const res = await post({ sessionId: 's1', rowNumber: 3 });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Failed to update feedback entry' });
    });
  });
});
