import { POST } from './route';
import * as sessionModule from '@/lib/auth/session';
import * as extractorModule from '@/lib/sheets/extractor';

jest.mock('@/lib/db', () => ({
  isDbConfigured: () => false,
  db: {
    select: jest.fn(),
  },
  schema: {
    diaryEntries: {},
  },
}));

function entriesForRows(maxRow: number, overrides: Record<number, { learned: string; notes: string }> = {}) {
  const entries = [];
  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber++) {
    const o = overrides[rowNumber] ?? { learned: 'Learned point', notes: 'Note point' };
    entries.push({ rowNumber, learned: o.learned, notes: o.notes, updatedAt: '2026-01-01T00:00:00.000Z' });
  }
  return entries;
}

describe('POST /api/diary/sync', () => {
  const originalEnv = process.env.GOOGLE_SHEETS_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_SHEETS_ID = 'test-sheet-id';
  });

  afterAll(() => {
    process.env.GOOGLE_SHEETS_ID = originalEnv;
  });

  it('returns 400 if spreadsheet ID is missing', async () => {
    delete process.env.GOOGLE_SHEETS_ID;
    const req = new Request('http://localhost/api/diary/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('GOOGLE_SHEETS_ID is not configured');
  });

  it('returns 401 if user is not authenticated with Google OAuth', async () => {
    jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/diary/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.authenticated).toBe(false);
    expect(json.loginUrl).toBe('/api/auth/login');
  });

  it('successfully syncs official 24 diary topics (rows 2 to 25) to Google Sheets', async () => {
    jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('mock-access-token');
    const updateSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({
      updatedRange: "'Onboarding Diary'!G2:H25",
      updatedRows: 24,
      updatedColumns: 2,
      updatedCells: 48,
    });

    const req = new Request('http://localhost/api/diary/sync', {
      method: 'POST',
      body: JSON.stringify({ scope: 'official', entries: entriesForRows(25) }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.range).toBe("'Onboarding Diary'!G2:H25");
    expect(json.totalUpdatedRows).toBe(24);
    expect(json.totalUpdatedCells).toBe(48);

    expect(updateSpy.mock.calls.length).toBe(1);
    const [calledSpreadsheetId, calledRange, calledValues, calledAuth] = updateSpy.mock.calls[0];
    expect(calledSpreadsheetId).toBe('test-sheet-id');
    expect(calledRange).toBe("'Onboarding Diary'!G2:H25");
    expect(calledValues.length).toBe(24);
    expect(calledAuth).toEqual({ accessToken: 'mock-access-token' });
    expect(calledValues[0]).toEqual(['Learned point', 'Note point']);
  });

  it('successfully syncs all 28 topics up to row 29 when requested', async () => {
    jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('mock-access-token');
    jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({
      updatedRange: "'Onboarding Diary'!G2:H29",
      updatedRows: 28,
      updatedColumns: 2,
      updatedCells: 56,
    });

    const req = new Request('http://localhost/api/diary/sync', {
      method: 'POST',
      body: JSON.stringify({ scope: 'all', entries: entriesForRows(29) }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.range).toBe("'Onboarding Diary'!G2:H29");
    expect(json.totalUpdatedRows).toBe(28);
    expect(json.totalUpdatedCells).toBe(56);
  });

  it('returns 409 with emptyRows and no Sheets call when a sent value is whitespace-only', async () => {
    jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('mock-access-token');
    const updateSpy = jest.spyOn(extractorModule, 'updateSheetRange');

    // Whitespace is truthy, so it overrides the catalog default and is blank after trim.
    const req = new Request('http://localhost/api/diary/sync', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'official',
        entries: entriesForRows(25, {
          5: { learned: '  \n\t ', notes: 'Note point' },
          7: { learned: 'Learned point', notes: '   ' },
        }),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.emptyRows).toEqual([5, 7]);
    expect(updateSpy.mock.calls.length).toBe(0);
  });

  it('returns 409 listing emptyRows and makes no Sheets call when rows are blank', async () => {
    jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('mock-access-token');
    const updateSpy = jest.spyOn(extractorModule, 'updateSheetRange');

    // No entries sent: catalog defaults are '' on most rows, so blanks remain.
    const req = new Request('http://localhost/api/diary/sync', {
      method: 'POST',
      body: JSON.stringify({ scope: 'official' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe('string');
    expect(json.emptyRows.length).toBeGreaterThan(0);
    expect(json.emptyRows.every((n: number) => n >= 2 && n <= 25)).toBe(true);
    expect(updateSpy.mock.calls.length).toBe(0);
  });

  it('returns 409 and makes no Sheets call when maxRow does not match the catalog rows', async () => {
    jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('mock-access-token');
    const updateSpy = jest.spyOn(extractorModule, 'updateSheetRange');

    // Catalog only has rows 2..29 (28 values); maxRow 30 would expect 29.
    const req = new Request('http://localhost/api/diary/sync', {
      method: 'POST',
      body: JSON.stringify({ maxRow: 30, entries: entriesForRows(30) }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe('string');
    expect(updateSpy.mock.calls.length).toBe(0);
  });
});
