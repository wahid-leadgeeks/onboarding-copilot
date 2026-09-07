import fs from 'fs';
import {
  parseTimelineMatrix,
  parseFeedbackMatrix,
  extractContentFromMatrices,
  extractContentFromWorkbookBytes,
  extractGoogleSpreadsheet,
  updateSheetCell,
  getSheetRange,
} from './extractor';

describe('Google Sheets Extractor', () => {
  describe('parseTimelineMatrix', () => {
    it('parses valid timeline rows', () => {
      const matrix = [
        ['Stage #', 'Stage Name', 'Start', 'End', 'Objective', 'Key Activities', 'Outputs / Evidence', 'Minimum Duration', 'Topic Covered'],
        ['1.0', 'Foundation & Core Understanding', '01/09/2026', '30/09/2026', 'Learn systems', 'Weekly 1-on-1s', 'Checklist items', '1 Month', 'IT Infrastructure'],
        ['2.0', 'Independence & Execution', '01/10/2026', '31/10/2026', 'Execute projects', 'Daily standups', 'Project PRs', '1 Month', 'Engineering'],
      ];
      const stages = parseTimelineMatrix(matrix);
      expect(stages).toHaveLength(2);
      expect(stages[0].stageNumber).toBe('1.0');
      expect(stages[0].stageName).toBe('Foundation & Core Understanding');
      expect(stages[0].start).toBe('01/09/2026');
      expect(stages[0].end).toBe('30/09/2026');
      expect(stages[0].objective).toBe('Learn systems');
      expect(stages[0].topicCovered).toBe('IT Infrastructure');
    });

    it('returns empty array on empty matrix', () => {
      expect(parseTimelineMatrix([])).toEqual([]);
      expect(parseTimelineMatrix([['single header']])).toEqual([]);
    });
  });

  describe('parseFeedbackMatrix', () => {
    it('parses feedback evaluation session rows', () => {
      const matrix = [
        ['No', 'Session / Topic', 'PIC / Reviewer', 'Rating', 'Comments'],
        ['1', 'Beyond the Slides: Chat with the MD', 'Managing Director', '5', 'Great start'],
        ['2', 'Weekly 1-on-1 with Mentor', 'Engineering Mentor', '4', 'Good progress'],
      ];
      const sessions = parseFeedbackMatrix(matrix);
      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionTitle).toBe('Beyond the Slides: Chat with the MD');
      expect(sessions[0].pic).toBe('Managing Director');
      expect(sessions[1].sessionTitle).toBe('Weekly 1-on-1 with Mentor');
      expect(sessions[1].pic).toBe('Engineering Mentor');
    });
  });

  describe('extractContentFromWorkbookBytes', () => {
    const filePath = '/home/noah/Downloads/Onboarding Kit Final 2026 - IT Staff.xlsx';

    it('extracts all 4 sheets from actual united HR Excel file', () => {
      if (!fs.existsSync(filePath)) {
        console.warn('File not found, skipping integration test');
        return;
      }
      const buf = fs.readFileSync(filePath);
      const result = extractContentFromWorkbookBytes(new Uint8Array(buf), '1X5OKuWjvp6vuqtbdJoBclFrBBmYA60SSvUQfS4B5U7M', 'Onboarding Kit Final 2026');

      expect(result.spreadsheetId).toBe('1X5OKuWjvp6vuqtbdJoBclFrBBmYA60SSvUQfS4B5U7M');
      expect(result.sheets.length).toBeGreaterThanOrEqual(4);

      // Verify Schedule extraction
      expect(result.schedule).toBeDefined();
      expect(result.schedule?.count).toBe(59);

      // Verify Diary extraction
      expect(result.diary).toBeDefined();
      expect(result.diary?.count).toBe(10);

      // Verify Timeline extraction
      expect(result.timeline).toBeDefined();
      expect(result.timeline?.count).toBeGreaterThanOrEqual(3);

      // Verify Feedback extraction
      expect(result.feedback).toBeDefined();
      expect(result.feedback?.count).toBeGreaterThanOrEqual(10);
    });
  });

  describe('extractGoogleSpreadsheet with mock fetch', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('successfully extracts sheets via Google Sheets API v4 endpoints', async () => {
      global.fetch = jest.fn((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('fields=properties.title')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                properties: { title: 'United Onboarding Kit' },
                sheets: [
                  { properties: { sheetId: 0, title: 'Schedule', gridProperties: { rowCount: 10, columnCount: 5 } } },
                  { properties: { sheetId: 1, title: 'Onboarding Diary', gridProperties: { rowCount: 5, columnCount: 4 } } },
                  { properties: { sheetId: 2, title: 'Timeline', gridProperties: { rowCount: 4, columnCount: 9 } } },
                  { properties: { sheetId: 3, title: 'Feedback Sheet', gridProperties: { rowCount: 15, columnCount: 8 } } },
                ],
              }),
          } as Response);
        }

        if (urlStr.includes('values:batchGet')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                valueRanges: [
                  {
                    range: "'Schedule'!A1:E3",
                    values: [
                      ['Activity', 'Start', 'End', 'Type', 'Status'],
                      ['Intro', '09:00', '10:00', 'learning', 'done'],
                      ['Setup', '10:30', '11:30', 'setup', 'done'],
                    ],
                  },
                  {
                    range: "'Onboarding Diary'!A1:D2",
                    values: [
                      ['Topic', 'Things you learned', 'Your Notes', 'Date'],
                      ['Intro', 'Systems architecture', 'Learned about services', '2026-09-01'],
                    ],
                  },
                  {
                    range: "'Timeline'!A1:I2",
                    values: [
                      ['Stage #', 'Stage Name', 'Start', 'End', 'Objective', 'Key Activities', 'Outputs / Evidence', 'Duration', 'Topic'],
                      ['1.0', 'Foundation', '01/09/2026', '30/09/2026', 'Learn', 'Weekly 1-on-1s', 'Checklist', '1 Month', 'IT'],
                    ],
                  },
                  {
                    range: "'Feedback Sheet'!A1:C2",
                    values: [
                      ['No', 'Session', 'PIC'],
                      ['1', 'Chat with MD', 'Managing Director'],
                    ],
                  },
                ],
              }),
          } as Response);
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${urlStr}`));
      }) as unknown as typeof fetch;

      const result = await extractGoogleSpreadsheet('sheet-123', { accessToken: 'mock-token' });

      expect(result.spreadsheetId).toBe('sheet-123');
      expect(result.title).toBe('United Onboarding Kit');
      expect(result.sheets).toHaveLength(4);
      expect(result.schedule?.count).toBe(2);
      expect(result.diary?.count).toBe(1);
      expect(result.timeline?.count).toBe(1);
      expect(result.feedback?.count).toBe(1);
    });

    it('throws error when neither accessToken nor apiKey is provided', async () => {
      let threw = false;
      try {
        await extractGoogleSpreadsheet('sheet-123', {});
      } catch (err: unknown) {
        threw = true;
        expect((err as Error).message).toContain('Google authentication');
      }
      expect(threw).toBe(true);
    });
  });

  describe('updateSheetCell and getSheetRange with mock fetch', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('successfully updates a specific sheet cell', async () => {
      global.fetch = jest.fn((url: string | URL | Request, init?: RequestInit) => {
        expect(init?.method).toBe('PUT');
        expect(url.toString()).toContain("values/'Onboarding%20Diary'!H15");
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              updatedRange: "'Onboarding Diary'!H15",
              updatedRows: 1,
              updatedColumns: 1,
              updatedCells: 1,
            }),
        } as Response);
      }) as unknown as typeof fetch;

      const result = await updateSheetCell('sheet-123', "'Onboarding Diary'!H15", 'My notes content', {
        accessToken: 'mock-token',
      });

      expect(result.updatedRange).toBe("'Onboarding Diary'!H15");
      expect(result.updatedCells).toBe(1);
    });

    it('successfully reads a specific sheet cell', async () => {
      global.fetch = jest.fn(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              values: [['My notes content']],
            }),
        } as Response);
      }) as unknown as typeof fetch;

      const values = await getSheetRange('sheet-123', "'Onboarding Diary'!H15", {
        accessToken: 'mock-token',
      });

      expect(values).toEqual([['My notes content']]);
    });
  });
});

