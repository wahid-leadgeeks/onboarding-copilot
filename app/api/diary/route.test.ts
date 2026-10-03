import * as clientModule from '@/lib/sheets/client';
import * as sessionModule from '@/lib/auth/session';
import * as extractorModule from '@/lib/sheets/extractor';

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
    diaryTopics: { rowNumber: 'diary_topics.row_number' },
    diaryEntries: { rowNumber: 'diary_entries.row_number' },
  },
}));

const { GET, POST } = require('./route') as typeof import('./route');

const ENV_KEYS = ['DATABASE_URL', 'GOOGLE_SHEETS_ID', 'SHEETS_SCHEDULE_URL', 'SHEETS_WRITE_URL', 'SHEETS_DIARY_URL', 'SHEETS_WRITE_TOKEN'] as const;
const FAKE_DB_URL = 'postgres://fake:fake@db.invalid:5432/fake';

function post(body: unknown): Promise<Response> {
  return POST(new Request('http://localhost/api/diary', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));
}

describe('/api/diary', () => {
  const savedEnv = new Map<string, string | undefined>();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

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
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
    expect(fetchCalls).toBe(0);
  });

  afterAll(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('GET without a database', () => {
    it('returns empty topics and entries', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, topics: [], entries: [] });
    });
  });

  describe('POST legacy content payload (no database)', () => {
    it('rejects an unparseable body with 400', async () => {
      const res = await post('not json');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Learning content is required');
    });

    it('rejects a non-object body with 400', async () => {
      const res = await post('"just a string"');
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Learning content is required');
    });

    it('rejects a missing or non-string content with 400', async () => {
      expect((await post({})).status).toBe(400);
      expect((await post({ content: 42 })).status).toBe(400);
    });

    it('rejects empty and whitespace-only content with 400', async () => {
      const empty = await post({ content: '' });
      expect(empty.status).toBe(400);
      expect((await empty.json()).error).toBe('Learning content cannot be empty');
      const blank = await post({ content: '   \n\t ' });
      expect(blank.status).toBe(400);
      expect((await blank.json()).error).toBe('Learning content cannot be empty');
    });

    it('rejects content over 10,000 characters with 413', async () => {
      const writeSpy = jest.spyOn(clientModule, 'writeDiary').mockResolvedValue(true);
      const res = await post({ content: 'x'.repeat(10_001) });
      expect(res.status).toBe(413);
      expect((await res.json()).error).toBe('Learning content is too long');
      expect(writeSpy.mock.calls.length).toBe(0);
    });

    it('accepts content of exactly 10,000 characters', async () => {
      jest.spyOn(clientModule, 'writeDiary').mockResolvedValue(true);
      const res = await post({ content: 'x'.repeat(10_000) });
      expect(res.status).toBe(201);
    });

    it('measures the limit after trimming', async () => {
      jest.spyOn(clientModule, 'writeDiary').mockResolvedValue(true);
      const res = await post({ content: `  ${'x'.repeat(10_000)}  ` });
      expect(res.status).toBe(201);
    });

    it('reports synced when writeDiary resolves true, with trimmed content', async () => {
      const writeSpy = jest.spyOn(clientModule, 'writeDiary').mockResolvedValue(true);
      const res = await post({ content: '  learned things  ' });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ content: 'learned things', syncStatus: 'synced' });
      expect(writeSpy.mock.calls.length).toBe(1);
      expect(writeSpy.mock.calls[0][0]).toBe('learned things');
    });

    it('reports pending when writeDiary resolves false', async () => {
      jest.spyOn(clientModule, 'writeDiary').mockResolvedValue(false);
      const res = await post({ content: 'learned things' });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ content: 'learned things', syncStatus: 'pending' });
    });

    it('reports pending (not an error) when writeDiary throws', async () => {
      jest.spyOn(clientModule, 'writeDiary').mockRejectedValue(new Error('sheet exploded'));
      const res = await post({ content: 'learned things' });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ content: 'learned things', syncStatus: 'pending' });
    });

    it('with nothing configured the real writeDiary yields pending without any network call', async () => {
      const res = await post({ content: 'learned things' });
      expect(res.status).toBe(201);
      expect((await res.json()).syncStatus).toBe('pending');
    });

    it('ignores a rowNumber when no database is configured', async () => {
      jest.spyOn(clientModule, 'writeDiary').mockResolvedValue(true);
      const res = await post({ rowNumber: 15, learned: 'L', notes: 'N', content: 'legacy' });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ content: 'legacy', syncStatus: 'synced' });
      expect(mockInsert.mock.calls.length).toBe(0);
    });
  });

  describe('POST structured rowNumber payload (database mode)', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = FAKE_DB_URL;
    });

    it('upserts the entry and returns 201 with syncedToSheets false when there is no access token', async () => {
      process.env.GOOGLE_SHEETS_ID = 'sheet-123';
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue(undefined);
      const updateSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({ updatedRange: '', updatedRows: 1, updatedColumns: 2, updatedCells: 2 });

      const res = await post({ rowNumber: 15, learned: 'Learned L', notes: 'Notes N' });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ success: true, rowNumber: 15, learned: 'Learned L', notes: 'Notes N', syncStatus: 'synced', syncedToSheets: false });
      expect(mockInsert.mock.calls.length).toBe(1);
      expect(mockOnConflictDoUpdate.mock.calls.length).toBe(1);
      const row = mockValues.mock.calls[0][0] as Record<string, unknown>;
      expect(row.id).toBe('entry-15');
      expect(row.rowNumber).toBe(15);
      expect(row.learned).toBe('Learned L');
      expect(row.notes).toBe('Notes N');
      expect(updateSpy.mock.calls.length).toBe(0);
    });

    it('writes G15:H15 on the Onboarding Diary sheet when an access token exists', async () => {
      process.env.GOOGLE_SHEETS_ID = 'sheet-123';
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('tok-abc');
      const updateSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({ updatedRange: "'Onboarding Diary'!G15:H15", updatedRows: 1, updatedColumns: 2, updatedCells: 2 });

      const res = await post({ rowNumber: 15, learned: 'Learned L', notes: 'Notes N' });
      expect(res.status).toBe(201);
      expect((await res.json()).syncedToSheets).toBe(true);
      expect(updateSpy.mock.calls.length).toBe(1);
      expect(updateSpy.mock.calls[0][0]).toBe('sheet-123');
      expect(updateSpy.mock.calls[0][1]).toBe("'Onboarding Diary'!G15:H15");
      expect(updateSpy.mock.calls[0][2]).toEqual([['Learned L', 'Notes N']]);
      expect(updateSpy.mock.calls[0][3]).toEqual({ accessToken: 'tok-abc' });
    });

    it('does not call the Sheets API when GOOGLE_SHEETS_ID is unset, even with a token', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('tok-abc');
      const updateSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({ updatedRange: '', updatedRows: 1, updatedColumns: 2, updatedCells: 2 });
      const res = await post({ rowNumber: 15, learned: 'L', notes: 'N' });
      expect(res.status).toBe(201);
      expect((await res.json()).syncedToSheets).toBe(false);
      expect(updateSpy.mock.calls.length).toBe(0);
    });

    it('keeps the saved row and reports syncedToSheets false when the Sheets write fails', async () => {
      process.env.GOOGLE_SHEETS_ID = 'sheet-123';
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('tok-abc');
      jest.spyOn(extractorModule, 'updateSheetRange').mockRejectedValue(new Error('403'));
      const res = await post({ rowNumber: 15, learned: 'L', notes: 'N' });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.syncedToSheets).toBe(false);
      expect(mockOnConflictDoUpdate.mock.calls.length).toBe(1);
    });

    it('defaults learned to empty and notes to content when only content is given', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue(undefined);
      const res = await post({ rowNumber: 7, content: 'from content' });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.learned).toBe('');
      expect(json.notes).toBe('from content');
    });
  });
});
