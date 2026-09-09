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

    it('sanitizes "Not Started" to empty string for Schedule Col J to comply with Sheets data validation', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');
      const updateRangeSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({
        updatedRange: "'Schedule'!G27:K27",
        updatedRows: 1,
        updatedColumns: 5,
        updatedCells: 5,
      });

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({
          sheet: 'Schedule',
          rowNumber: 27,
          durationMinutes: 45,
          startTime: '09:00',
          endTime: '09:45',
          progress: 'Not Started',
          notes: 'Testing sanitization',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.progress).toBe('');

      expect(updateRangeSpy.mock.calls.length).toBe(1);
      expect(updateRangeSpy.mock.calls[0]).toEqual([
        'test-spreadsheet-id-123',
        "'Schedule'!G27:K27",
        [['45', '09:00', '09:45', '', 'Testing sanitization']],
        { accessToken: 'valid-token' },
      ]);
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

    it('updates Feedback Sheet Cols A–M for a valid rowNumber', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');
      const updateRangeSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({
        updatedRange: "'Feedback Sheet'!A3:M3",
        updatedRows: 1,
        updatedColumns: 13,
        updatedCells: 13,
      });

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({
          sheet: 'Feedback Sheet',
          rowNumber: 3,
          feedback: {
            date: '2026-09-10',
            pic: 'Managing Director',
            sessionTitle: 'Introduction to Company',
            ratings: {
              communication: 6,
              alignment: 5,
              understanding: 6,
              readiness: 5,
              pace: 6,
              overall: 6,
            },
            hasQuestions: false,
            suggestions: 'Great session overall!',
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sheet).toBe('Feedback Sheet');
      expect(data.rowNumber).toBe(3);
      expect(data.range).toBe("'Feedback Sheet'!A3:M3");
      expect(data.values[0]).toEqual([
        '10/09/2026',
        'Managing Director',
        'Introduction to Company',
        '6. Excellent',
        '5. Very Good',
        '6. Excellent',
        '5. Very Good',
        '6. Excellent',
        '6. Excellent',
        'NO',
        '',
        '',
        'Great session overall!',
      ]);

      expect(updateRangeSpy.mock.calls.length).toBe(1);
      expect(updateRangeSpy.mock.calls[0]).toEqual([
        'test-spreadsheet-id-123',
        "'Feedback Sheet'!A3:M3",
        [
          [
            '10/09/2026',
            'Managing Director',
            'Introduction to Company',
            '6. Excellent',
            '5. Very Good',
            '6. Excellent',
            '5. Very Good',
            '6. Excellent',
            '6. Excellent',
            'NO',
            '',
            '',
            'Great session overall!',
          ],
        ],
        { accessToken: 'valid-token' },
      ]);
    });

    it('retries with alternative sheet name "Feedback" if "Feedback Sheet" fails', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');
      const updateRangeSpy = jest
        .spyOn(extractorModule, 'updateSheetRange')
        .mockRejectedValueOnce(new Error("Unable to parse range: 'Feedback Sheet'!A4:M4"))
        .mockResolvedValueOnce({
          updatedRange: "'Feedback'!A4:M4",
          updatedRows: 1,
          updatedColumns: 13,
          updatedCells: 13,
        });

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({
          sheet: 'Feedback Sheet',
          rowNumber: 4,
          topic: 'Beyond the Slides',
          pic: 'Managing Director',
          ratings: {
            communication: 6,
            alignment: 6,
            understanding: 6,
            readiness: 6,
            pace: 6,
            overall: 6,
          },
          hasQuestions: true,
          questionExplanation: 'How do we track quarterly OKRs?',
          questionAddressing: 'Chat response is fine',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sheet).toBe('Feedback');
      expect(data.range).toBe("'Feedback'!A4:M4");
      expect(updateRangeSpy.mock.calls.length).toBe(2);
    });

    it('updates Feedback Sheet for batch entries', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');
      const updateRangeSpy = jest.spyOn(extractorModule, 'updateSheetRange').mockResolvedValue({
        updatedRange: "'Feedback Sheet'!A3:M3",
        updatedRows: 1,
        updatedColumns: 13,
        updatedCells: 13,
      });

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({
          sheet: 'Feedback Sheet',
          entries: [
            {
              sessionId: 'row-3',
              date: '2026-09-10',
              pic: 'Managing Director',
              ratings: { communication: 6, alignment: 6, understanding: 6, readiness: 6, pace: 6, overall: 6 },
              hasQuestions: false,
            },
            {
              sessionId: 'row-5',
              date: '2026-09-10',
              pic: 'HRD',
              ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
              hasQuestions: false,
            },
          ],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
      expect(data.updatedRows).toEqual([3, 5]);
      expect(updateRangeSpy.mock.calls.length).toBe(2);
    });

    it('rejects invalid Feedback row numbers', async () => {
      jest.spyOn(sessionModule, 'getSessionAccessToken').mockResolvedValue('valid-token');

      const req = new Request('http://localhost/api/sheets/update-cell', {
        method: 'POST',
        body: JSON.stringify({ sheet: 'Feedback Sheet', rowNumber: 2 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid feedback rowNumber (expected 3-50)');
    });
  });
});
