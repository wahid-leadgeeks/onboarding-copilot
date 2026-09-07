import { POST, GET } from './route';
import * as sessionModule from '@/lib/auth/session';
import * as extractorModule from '@/lib/sheets/extractor';

jest.mock('@/lib/auth/session');
jest.mock('@/lib/sheets/extractor');

describe('/api/sheets/update-cell route', () => {
  const originalEnv = process.env.GOOGLE_SHEETS_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_SHEETS_ID = 'test-spreadsheet-id-123';
  });

  afterAll(() => {
    process.env.GOOGLE_SHEETS_ID = originalEnv;
  });

  describe('GET', () => {
    it('returns 400 when GOOGLE_SHEETS_ID is not configured', async () => {
      delete process.env.GOOGLE_SHEETS_ID;
      const req = new Request('http://localhost/api/sheets/update-cell');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('GOOGLE_SHEETS_ID is not configured');
    });

    it('returns 401 when user is not authenticated with Google OAuth', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue(undefined);
      const req = new Request('http://localhost/api/sheets/update-cell');
      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.authenticated).toBe(false);
    });

    it('returns cell value when authenticated', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');
      jest.spyOn(extractorModule, 'getSheetRange').mockResolvedValue([['Learned XYZ']]);

      const req = new Request('http://localhost/api/sheets/update-cell?range=\'Schedule\'!G3');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.value).toBe('Learned XYZ');
    });
  });

  describe('POST', () => {
    it('returns 400 when GOOGLE_SHEETS_ID is not configured', async () => {
      delete process.env.GOOGLE_SHEETS_ID;
      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({ sheet: 'Schedule', rowNumber: 3 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 401 when user has no access token', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue(undefined);
      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({ sheet: 'Schedule', rowNumber: 3 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.authenticated).toBe(false);
    });

    it('updates Schedule Cols G–K for a valid rowNumber', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');
      const updateRangeSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({
        updatedRange: "'Schedule'!G20:K20",
        updatedRows: 1,
        updatedColumns: 5,
        updatedCells: 5,
      });

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({
          sheet: 'Schedule',
          rowNumber: 20,
          durationMinutes: 155,
          startTime: '10:00',
          endTime: '12:35',
          progress: 'Done',
          notes: 'https://drive.google.com/folder',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.sheet).toBe('Schedule');
      expect(data.rowNumber).toBe(20);
      expect(data.range).toBe("'Schedule'!G20:K20");
      expect(data.durationMinutes).toBe(155);
      expect(data.startTime).toBe('10:00');
      expect(data.endTime).toBe('12:35');
      expect(data.progress).toBe('Done');
      expect(data.notes).toBe('https://drive.google.com/folder');

      expect(updateRangeSpy.mock.calls.length).toBe(1);
    });

    it('rejects invalid Schedule row numbers', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({ sheet: 'Schedule', rowNumber: 1 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid schedule rowNumber');
    });

    it('updates Onboarding Diary row (Cols G & H) when rowNumber is given without sheet', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');
      const updateRangeSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({
        updatedRange: "'Onboarding Diary'!G15:H15",
        updatedRows: 1,
        updatedColumns: 2,
        updatedCells: 2,
      });

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({
          rowNumber: 15,
          learned: 'Mastered Google Sheets API sync',
          notes: 'Great progress today',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.learned).toBe('Mastered Google Sheets API sync');
      expect(data.notes).toBe('Great progress today');

      expect(updateRangeSpy.mock.calls.length).toBe(1);
    });
  });
});
