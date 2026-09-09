import {
  FEEDBACK_DIMENSIONS,
  FEEDBACK_SESSIONS,
  FEEDBACK_STORAGE_KEY,
  REQUIRED_FEEDBACK_SESSIONS,
  calculateFeedbackProgress,
  clipboardBlockForFeedback,
  clipboardRowForFeedback,
  findFeedbackSession,
  formatFeedbackDate,
  formatLikertLabel,
  isFeedbackEntry,
  isStandardQuestionAddressing,
  normalizeQuestionAddressing,
  QUESTION_ADDRESSING_OPTIONS,
  readFeedbackEntries,
  removeFeedbackEntry,
  toLikertLabel,
  upsertFeedbackEntry,
  writeFeedbackEntries,
} from './feedback';
import type { FeedbackEntry } from './feedback';
import { isRatingComplete, tabWrapTarget } from '@/app/components/FeedbackModal';

/**
 * Pure RFC4180 TSV row parser for zero-DOM headless test verification.
 */
function parseTsvRow(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < row.length) {
    const char = row[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i += 1;
          continue;
        }
      } else {
        current += char;
        i += 1;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
        continue;
      } else if (char === '\t') {
        cells.push(current);
        current = '';
        i += 1;
        continue;
      } else {
        current += char;
        i += 1;
        continue;
      }
    }
  }
  cells.push(current);
  return cells;
}

const SAMPLE_ENTRY_1: FeedbackEntry = {
  sessionId: 'row-4',
  sessionTitle: 'Beyond the Slides: Chat with the MD',
  pic: 'Managing Director',
  date: '02/09/2026',
  ratings: {
    communication: 5,
    alignment: 5,
    understanding: 5,
    readiness: 5,
    pace: 5,
    overall: 5,
  },
  hasQuestions: false,
  questionExplanation: 'Clear strategic overview.',
  questionAddressing: 'No follow-up needed.',
  suggestions: 'None, format was great.',
  createdAt: '2026-09-02T10:00:00.000Z',
};

const SAMPLE_ENTRY_2: FeedbackEntry = {
  sessionId: 'row-5',
  sessionTitle: 'Intro to HRD Department',
  pic: 'HRD',
  date: '03/09/2026',
  ratings: {
    communication: 4,
    alignment: 4,
    understanding: 3,
    readiness: 4,
    pace: 4,
    overall: 4,
  },
  hasQuestions: true,
  questionExplanation: 'Questions on benefits timeline.',
  questionAddressing: 'Email follow-up with Sarah.',
  suggestions: 'Send handbook prior to session.',
  createdAt: '2026-09-03T11:00:00.000Z',
};

describe('feedback system (lib/feedback)', () => {
  describe('FEEDBACK_STORAGE_KEY & FEEDBACK_SESSIONS', () => {
    it('uses the canonical storage key', () => {
      expect(FEEDBACK_STORAGE_KEY).toBe('onboarding-feedback');
    });

    it('defines exactly 14 required evaluation sessions', () => {
      expect(FEEDBACK_SESSIONS).toHaveLength(14);
      expect(REQUIRED_FEEDBACK_SESSIONS).toHaveLength(14);
    });

    it('contains valid row numbers from 3 to 16 in order', () => {
      const rows = FEEDBACK_SESSIONS.map((s) => s.rowNumber);
      expect(rows).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });

    it('has valid non-empty topic and PIC for each session', () => {
      for (const session of FEEDBACK_SESSIONS) {
        expect(session.id.length > 0).toBe(true);
        expect(session.title.trim().length > 0).toBe(true);
        expect(session.pic.trim().length > 0).toBe(true);
      }
    });

    it('matches the HR workbook first and last session titles', () => {
      expect(FEEDBACK_SESSIONS[0].title).toBe('Introduction to Company');
      expect(FEEDBACK_SESSIONS[0].pic).toBe('Managing Director');
      expect(FEEDBACK_SESSIONS[13].title.includes('ESMR')).toBe(true);
      expect(FEEDBACK_SESSIONS[13].pic).toBe('External Experience Staff');
    });

    it('defines exactly 6 rating dimensions in order D through I', () => {
      expect(FEEDBACK_DIMENSIONS).toHaveLength(6);
      expect(FEEDBACK_DIMENSIONS.map((d) => d.columnLetter)).toEqual(['D', 'E', 'F', 'G', 'H', 'I']);
      expect(FEEDBACK_DIMENSIONS.map((d) => d.key)).toEqual([
        'communication',
        'alignment',
        'understanding',
        'readiness',
        'pace',
        'overall',
      ]);
    });

    it('finds sessions by id, row number, or title', () => {
      const byId = findFeedbackSession('row-4');
      expect(byId !== undefined).toBe(true);
      expect(byId?.title).toBe('Beyond the Slides: Chat with the MD');

      const byRow = findFeedbackSession(5);
      expect(byRow !== undefined).toBe(true);
      expect(byRow?.title).toBe('Intro to HRD Department');

      const byTitle = findFeedbackSession('company policy');
      expect(byTitle !== undefined).toBe(true);
      expect(byTitle?.rowNumber).toBe(6);
    });
  });

  describe('isFeedbackEntry', () => {
    it('accepts a valid FeedbackEntry', () => {
      expect(isFeedbackEntry(SAMPLE_ENTRY_1)).toBe(true);
      expect(isFeedbackEntry(SAMPLE_ENTRY_2)).toBe(true);
    });

    it('accepts a minimal valid FeedbackEntry without optional fields', () => {
      const minimal = {
        sessionId: 'row-6',
        sessionTitle: 'Company Policy',
        pic: 'HRD',
        date: '04/09/2026',
        ratings: {
          communication: 3,
          alignment: 3,
          understanding: 3,
          readiness: 3,
          pace: 3,
          overall: 3,
        },
        hasQuestions: false,
      };
      expect(isFeedbackEntry(minimal)).toBe(true);
    });

    it('rejects primitives, null, and undefined', () => {
      expect(isFeedbackEntry(null)).toBe(false);
      expect(isFeedbackEntry(undefined)).toBe(false);
      expect(isFeedbackEntry('string')).toBe(false);
      expect(isFeedbackEntry(123)).toBe(false);
      expect(isFeedbackEntry([])).toBe(false);
    });

    it('rejects entries with missing or empty identifiers', () => {
      expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionId: '' })).toBe(false);
      expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionTitle: '' })).toBe(false);
      expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, pic: undefined })).toBe(false);
      expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, date: undefined })).toBe(false);
    });

    it('rejects entries with invalid rating values', () => {
      expect(
        isFeedbackEntry({
          ...SAMPLE_ENTRY_1,
          ratings: { ...SAMPLE_ENTRY_1.ratings, communication: 0 },
        })
      ).toBe(false);
      expect(
        isFeedbackEntry({
          ...SAMPLE_ENTRY_1,
          ratings: { ...SAMPLE_ENTRY_1.ratings, overall: 7 },
        })
      ).toBe(false);
      expect(
        isFeedbackEntry({
          ...SAMPLE_ENTRY_1,
          ratings: { ...SAMPLE_ENTRY_1.ratings, pace: '5' as unknown as number },
        })
      ).toBe(false);
      expect(
        isFeedbackEntry({
          ...SAMPLE_ENTRY_1,
          ratings: { ...SAMPLE_ENTRY_1.ratings, pace: 3.5 },
        })
      ).toBe(false);
    });

    it('rejects entries with non-boolean hasQuestions', () => {
      expect(
        isFeedbackEntry({
          ...SAMPLE_ENTRY_1,
          hasQuestions: 'NO' as unknown as boolean,
        })
      ).toBe(false);
    });

    describe('stress-testing runtime validation', () => {
      it('rejects entries with missing required fields', () => {
        const base = { ...SAMPLE_ENTRY_1 };
        const requiredKeys = ['sessionId', 'sessionTitle', 'pic', 'date', 'hasQuestions', 'ratings'] as const;
        for (const key of requiredKeys) {
          const clone = { ...base } as Record<string, unknown>;
          delete clone[key];
          expect(isFeedbackEntry(clone)).toBe(false);
        }
      });

      it('rejects entries with empty or whitespace-only sessionId and sessionTitle', () => {
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionId: '' })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionId: '   ' })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionTitle: '' })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionTitle: '   ' })).toBe(false);
      });

      it('rejects entries with non-string required fields', () => {
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionId: 123 })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, sessionTitle: true })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, pic: 456 })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, date: 20260902 })).toBe(false);
      });

      it('rejects entries missing any of the 6 rating dimensions', () => {
        const dimensions = ['communication', 'alignment', 'understanding', 'readiness', 'pace', 'overall'] as const;
        for (const dim of dimensions) {
          const brokenRatings = { ...SAMPLE_ENTRY_1.ratings } as Record<string, unknown>;
          delete brokenRatings[dim];
          expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, ratings: brokenRatings })).toBe(false);
        }
      });

      it('rejects non-numeric ratings across all 6 dimensions', () => {
        const dimensions = ['communication', 'alignment', 'understanding', 'readiness', 'pace', 'overall'] as const;
        const invalidValues = ['5', 'excellent', null, undefined, true, false, {}, [], NaN, Infinity, -Infinity];
        for (const dim of dimensions) {
          for (const val of invalidValues) {
            const brokenRatings = { ...SAMPLE_ENTRY_1.ratings, [dim]: val };
            expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, ratings: brokenRatings })).toBe(false);
          }
        }
      });

      it('rejects floating-point non-integer ratings across all 6 dimensions', () => {
        const dimensions = ['communication', 'alignment', 'understanding', 'readiness', 'pace', 'overall'] as const;
        const floats = [1.5, 2.7, 3.14, 4.99, 0.99, 5.01];
        for (const dim of dimensions) {
          for (const fl of floats) {
            const brokenRatings = { ...SAMPLE_ENTRY_1.ratings, [dim]: fl };
            expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, ratings: brokenRatings })).toBe(false);
          }
        }
      });

      it('rejects ratings < 1 across all 6 dimensions', () => {
        const dimensions = ['communication', 'alignment', 'understanding', 'readiness', 'pace', 'overall'] as const;
        const underRange = [0, -1, -5, -999];
        for (const dim of dimensions) {
          for (const val of underRange) {
            const brokenRatings = { ...SAMPLE_ENTRY_1.ratings, [dim]: val };
            expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, ratings: brokenRatings })).toBe(false);
          }
        }
      });

      it('rejects ratings > 6 across all 6 dimensions', () => {
        const dimensions = ['communication', 'alignment', 'understanding', 'readiness', 'pace', 'overall'] as const;
        const overRange = [7, 10, 100, 9999];
        for (const dim of dimensions) {
          for (const val of overRange) {
            const brokenRatings = { ...SAMPLE_ENTRY_1.ratings, [dim]: val };
            expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, ratings: brokenRatings })).toBe(false);
          }
        }
      });

      it('rejects invalid types for optional fields when defined', () => {
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, createdAt: 12345 })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, updatedAt: true })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, id: 999 })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, questionExplanation: [] })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, questionAddressing: {} })).toBe(false);
        expect(isFeedbackEntry({ ...SAMPLE_ENTRY_1, suggestions: null })).toBe(false);
      });
    });
  });

  describe('readFeedbackEntries & writeFeedbackEntries', () => {
    it('returns empty array for missing or invalid raw storage', () => {
      expect(readFeedbackEntries(null)).toEqual([]);
      expect(readFeedbackEntries('')).toEqual([]);
      expect(readFeedbackEntries('not json')).toEqual([]);
      expect(readFeedbackEntries('{}')).toEqual([]);
      expect(readFeedbackEntries('42')).toEqual([]);
    });

    it('filters out corrupted items in array', () => {
      const raw = JSON.stringify([
        SAMPLE_ENTRY_1,
        { invalid: true },
        'corrupted',
        null,
      ]);
      const result = readFeedbackEntries(raw);
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('row-4');
    });

    it('reads a single valid object for backward compatibility', () => {
      const raw = JSON.stringify(SAMPLE_ENTRY_1);
      const result = readFeedbackEntries(raw);
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('row-4');
    });

    it('writes and reads entries round-trip', () => {
      const original = [SAMPLE_ENTRY_1, SAMPLE_ENTRY_2];
      const serialized = writeFeedbackEntries(original);
      expect(typeof serialized).toBe('string');
      const parsed = readFeedbackEntries(serialized);
      expect(parsed).toEqual(original);
    });

    it('writes empty array as "[]"', () => {
      expect(writeFeedbackEntries([])).toBe('[]');
    });
  });

  describe('upsertFeedbackEntry & removeFeedbackEntry', () => {
    it('inserts into an empty array', () => {
      const result = upsertFeedbackEntry([], SAMPLE_ENTRY_1);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(SAMPLE_ENTRY_1);
    });

    it('appends a new entry when sessionId does not exist', () => {
      const result = upsertFeedbackEntry([SAMPLE_ENTRY_1], SAMPLE_ENTRY_2);
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual(SAMPLE_ENTRY_2);
    });

    it('updates existing entry when sessionId exists without changing array length', () => {
      const updatedEntry: FeedbackEntry = {
        ...SAMPLE_ENTRY_1,
        ratings: { ...SAMPLE_ENTRY_1.ratings, overall: 4 },
        suggestions: 'Updated suggestions.',
      };
      const result = upsertFeedbackEntry([SAMPLE_ENTRY_1, SAMPLE_ENTRY_2], updatedEntry);
      expect(result).toHaveLength(2);
      expect(result[0].ratings.overall).toBe(4);
      expect(result[0].suggestions).toBe('Updated suggestions.');
      expect(result[1]).toEqual(SAMPLE_ENTRY_2);
    });

    it('does not mutate the source array', () => {
      const source = [SAMPLE_ENTRY_1];
      const result = upsertFeedbackEntry(source, SAMPLE_ENTRY_2);
      expect(source).toHaveLength(1);
      expect(result).toHaveLength(2);
    });

    it('removes an entry by sessionId', () => {
      const source = [SAMPLE_ENTRY_1, SAMPLE_ENTRY_2];
      const removed = removeFeedbackEntry(source, 'row-4');
      expect(removed).toHaveLength(1);
      expect(removed[0].sessionId).toBe('row-5');
    });

    describe('stress-testing upsertFeedbackEntry', () => {
      it('updates existing evaluation values in place while preserving index and array length', () => {
        const entry3: FeedbackEntry = {
          ...SAMPLE_ENTRY_1,
          sessionId: 'row-6',
          sessionTitle: 'Company Policy',
        };
        const initial = [SAMPLE_ENTRY_1, SAMPLE_ENTRY_2, entry3];

        const updatedSample2: FeedbackEntry = {
          ...SAMPLE_ENTRY_2,
          ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
          suggestions: 'Brand new suggestions',
        };

        const result = upsertFeedbackEntry(initial, updatedSample2);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual(SAMPLE_ENTRY_1);
        expect(result[1].ratings.communication).toBe(5);
        expect(result[1].suggestions).toBe('Brand new suggestions');
        expect(result[2]).toEqual(entry3);
      });

      it('preserves existing createdAt and updates updatedAt on update', () => {
        const originalCreatedAt = '2026-09-01T08:00:00.000Z';
        const initialEntry: FeedbackEntry = {
          ...SAMPLE_ENTRY_1,
          createdAt: originalCreatedAt,
          updatedAt: '2026-09-01T08:00:00.000Z',
        };

        // Case A: New entry specifies a conflicting createdAt and an updated updatedAt
        const updateWithNewCreatedAt: FeedbackEntry = {
          ...SAMPLE_ENTRY_1,
          suggestions: 'Modified',
          createdAt: '2026-09-07T12:00:00.000Z',
          updatedAt: '2026-09-07T12:00:00.000Z',
        };

        const resultA = upsertFeedbackEntry([initialEntry], updateWithNewCreatedAt);
        expect(resultA[0].createdAt).toBe(originalCreatedAt);
        expect(resultA[0].updatedAt).toBe('2026-09-07T12:00:00.000Z');

        // Case B: New entry has undefined updatedAt, which should generate a fresh ISO timestamp
        const updateWithNoUpdatedAt: FeedbackEntry = {
          ...SAMPLE_ENTRY_1,
          suggestions: 'Modified again',
          updatedAt: undefined,
        };

        const before = new Date().getTime();
        const resultB = upsertFeedbackEntry([initialEntry], updateWithNoUpdatedAt);
        const after = new Date().getTime();

        expect(resultB[0].createdAt).toBe(originalCreatedAt);
        expect(typeof resultB[0].updatedAt).toBe('string');
        const updatedTime = new Date(resultB[0].updatedAt!).getTime();
        expect(updatedTime >= before).toBe(true);
        expect(updatedTime <= after + 1000).toBe(true);
      });

      it('guarantees pure function immutability on update and insert', () => {
        const initial = [Object.freeze({ ...SAMPLE_ENTRY_1 }), Object.freeze({ ...SAMPLE_ENTRY_2 })];
        Object.freeze(initial);

        const updateEntry: FeedbackEntry = {
          ...SAMPLE_ENTRY_1,
          suggestions: 'Updated text',
        };

        // Does not throw despite Object.freeze on initial array and items
        const result = upsertFeedbackEntry(initial as FeedbackEntry[], updateEntry);

        expect(result).not.toBe(initial);
        expect(result[0].suggestions).toBe('Updated text');
        expect(initial[0].suggestions).toBe('None, format was great.');
      });
    });
  });

  describe('calculateFeedbackProgress', () => {
    it('calculates 0% progress when no entries exist', () => {
      const progress = calculateFeedbackProgress([]);
      expect(progress.evaluated).toBe(0);
      expect(progress.evaluatedCount).toBe(0);
      expect(progress.total).toBe(14);
      expect(progress.totalCount).toBe(14);
      expect(progress.percentage).toBe(0);
      expect(progress.isComplete).toBe(false);
      expect(progress.pending).toBe(14);
      expect(progress.remainingCount).toBe(14);
      expect(progress.sessionStatuses).toHaveLength(14);
      expect(progress.sessionStatuses.every((s) => s.status === 'pending')).toBe(true);
    });

    it('calculates partial progress accurately', () => {
      const entries = [SAMPLE_ENTRY_1, SAMPLE_ENTRY_2];
      const progress = calculateFeedbackProgress(entries);
      expect(progress.evaluated).toBe(2);
      expect(progress.evaluatedCount).toBe(2);
      expect(progress.total).toBe(14);
      expect(progress.percentage).toBe(14); // Math.round((2 / 14) * 100) = 14
      expect(progress.isComplete).toBe(false);
      expect(progress.pending).toBe(12);
      expect(progress.remainingCount).toBe(12);

      const s1 = progress.sessionStatuses.find((s) => s.session.id === 'row-4');
      expect(s1 !== undefined).toBe(true);
      expect(s1?.status).toBe('evaluated');
      expect(s1?.entry).toEqual(SAMPLE_ENTRY_1);

      const s3 = progress.sessionStatuses.find((s) => s.session.id === 'row-6');
      expect(s3 !== undefined).toBe(true);
      expect(s3?.status).toBe('pending');
      expect(s3?.entry === undefined).toBe(true);
    });

    it('calculates 100% progress when all 14 sessions are evaluated', () => {
      const allEntries: FeedbackEntry[] = FEEDBACK_SESSIONS.map((session) => ({
        sessionId: session.id,
        sessionTitle: session.title,
        pic: session.pic,
        date: '02/09/2026',
        ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
        hasQuestions: false,
        createdAt: '2026-09-02T10:00:00.000Z',
      }));

      const progress = calculateFeedbackProgress(allEntries);
      expect(progress.evaluated).toBe(14);
      expect(progress.total).toBe(14);
      expect(progress.percentage).toBe(100);
      expect(progress.isComplete).toBe(true);
      expect(progress.pending).toBe(0);
      expect(progress.sessionStatuses.every((s) => s.status === 'evaluated')).toBe(true);
    });

    it('does not duplicate count if multiple entries have the same sessionId', () => {
      const duplicateEntries = [SAMPLE_ENTRY_1, SAMPLE_ENTRY_1];
      const progress = calculateFeedbackProgress(duplicateEntries);
      expect(progress.evaluated).toBe(1);
    });

    it('ignores entries with unlisted sessionIds', () => {
      const customEntry: FeedbackEntry = {
        ...SAMPLE_ENTRY_1,
        sessionId: 'adhoc-unlisted',
      };
      const progress = calculateFeedbackProgress([customEntry]);
      expect(progress.evaluated).toBe(0);
    });

    describe('stress-testing calculateFeedbackProgress across all counts and edge cases', () => {
      it('calculates exact fractional percentages for all evaluation counts from 1 to 13', () => {
        const allEntries: FeedbackEntry[] = FEEDBACK_SESSIONS.map((session, idx) => ({
          sessionId: session.id,
          sessionTitle: session.title,
          pic: session.pic,
          date: `0${(idx % 9) + 1}/09/2026`,
          ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
          hasQuestions: false,
          createdAt: new Date().toISOString(),
        }));

        for (let k = 1; k <= 13; k++) {
          const subset = allEntries.slice(0, k);
          const progress = calculateFeedbackProgress(subset);

          const expectedPercent = Math.round((k / 14) * 100);
          expect(progress.total).toBe(14);
          expect(progress.totalCount).toBe(14);
          expect(progress.evaluated).toBe(k);
          expect(progress.evaluatedCount).toBe(k);
          expect(progress.pending).toBe(14 - k);
          expect(progress.remainingCount).toBe(14 - k);
          expect(progress.percentage).toBe(expectedPercent);
          expect(progress.isComplete).toBe(false);

          const evaluatedStatuses = progress.sessionStatuses.filter((s) => s.status === 'evaluated');
          const pendingStatuses = progress.sessionStatuses.filter((s) => s.status === 'pending');
          expect(evaluatedStatuses).toHaveLength(k);
          expect(pendingStatuses).toHaveLength(14 - k);
        }
      });

      it('calculates 14 evaluations as 100% progress and isComplete=true', () => {
        const allEntries: FeedbackEntry[] = FEEDBACK_SESSIONS.map((session, idx) => ({
          sessionId: session.id,
          sessionTitle: session.title,
          pic: session.pic,
          date: `0${(idx % 9) + 1}/09/2026`,
          ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
          hasQuestions: false,
          createdAt: new Date().toISOString(),
        }));

        const progress = calculateFeedbackProgress(allEntries);
        expect(progress.total).toBe(14);
        expect(progress.evaluated).toBe(14);
        expect(progress.pending).toBe(0);
        expect(progress.percentage).toBe(100);
        expect(progress.isComplete).toBe(true);
        expect(progress.sessionStatuses.every((s) => s.status === 'evaluated')).toBe(true);
      });

      it('idempotently handles duplicate session entries without double-counting', () => {
        // Test A: 5 duplicate entries for row-4
        const fiveDuplicates = Array.from({ length: 5 }, () => ({ ...SAMPLE_ENTRY_1 }));
        const progressA = calculateFeedbackProgress(fiveDuplicates);
        expect(progressA.evaluated).toBe(1);
        expect(progressA.evaluatedCount).toBe(1);
        expect(progressA.percentage).toBe(7); // Math.round(1/14 * 100) = 7
        expect(progressA.pending).toBe(13);

        // Test B: 28 entries (2 of each of the 14 sessions)
        const doubleAll: FeedbackEntry[] = [
          ...FEEDBACK_SESSIONS.map((session): FeedbackEntry => ({
            sessionId: session.id,
            sessionTitle: session.title,
            pic: session.pic,
            date: '02/09/2026',
            ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
            hasQuestions: false,
            createdAt: new Date().toISOString(),
          })),
          ...FEEDBACK_SESSIONS.map((session): FeedbackEntry => ({
            sessionId: session.id,
            sessionTitle: session.title,
            pic: session.pic,
            date: '03/09/2026',
            ratings: { communication: 4, alignment: 4, understanding: 4, readiness: 4, pace: 4, overall: 4 },
            hasQuestions: true,
            createdAt: new Date().toISOString(),
          })),
        ];

        const progressB = calculateFeedbackProgress(doubleAll);
        expect(progressB.evaluated).toBe(14);
        expect(progressB.evaluatedCount).toBe(14);
        expect(progressB.percentage).toBe(100);
        expect(progressB.isComplete).toBe(true);
        expect(progressB.pending).toBe(0);

        // Test C: Mixed row-4 and row-4 rowNumber alias duplicates
        const aliasDuplicates = [
          SAMPLE_ENTRY_1,
          { ...SAMPLE_ENTRY_1, sessionId: 'row-4', suggestions: 'Copy 2' },
        ];
        const progressC = calculateFeedbackProgress(aliasDuplicates);
        expect(progressC.evaluated).toBe(1);
      });
    });
  });

  describe('formatLikertLabel & toLikertLabel', () => {
    it('maps ratings 1 through 6 to official labels', () => {
      expect(formatLikertLabel(1)).toBe('1. Very Poor');
      expect(formatLikertLabel(2)).toBe('2. Poor');
      expect(formatLikertLabel(3)).toBe('3. Fair');
      expect(formatLikertLabel(4)).toBe('4. Good');
      expect(formatLikertLabel(5)).toBe('5. Very Good');
      expect(formatLikertLabel(6)).toBe('6. Excellent');
    });

    it('falls back safely for out-of-range numbers', () => {
      expect(formatLikertLabel(0)).toBe('');
      expect(formatLikertLabel(7)).toBe('');
    });

    it('handles string input via toLikertLabel', () => {
      expect(toLikertLabel('6')).toBe('6. Excellent');
      expect(toLikertLabel('5')).toBe('5. Very Good');
      expect(toLikertLabel('4. Good')).toBe('4. Good');
      expect(toLikertLabel('3. Fair')).toBe('3. Fair');
      expect(toLikertLabel('invalid')).toBe('');
    });
  });

  describe('formatFeedbackDate', () => {
    it('preserves DD/MM/YYYY format', () => {
      expect(formatFeedbackDate('02/09/2026')).toBe('02/09/2026');
    });

    it('converts ISO YYYY-MM-DD format to DD/MM/YYYY', () => {
      expect(formatFeedbackDate('2026-09-02')).toBe('02/09/2026');
    });
  });

  describe('clipboardRowForFeedback (13-Column TSV & RFC4180 Escaping)', () => {
    it('produces exactly 13 tab-separated columns in the correct order', () => {
      const tsv = clipboardRowForFeedback(SAMPLE_ENTRY_1);
      const cells = parseTsvRow(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[0]).toBe('02/09/2026'); // Col A: Insert Date
      expect(cells[1]).toBe('Managing Director'); // Col B: PIC
      expect(cells[2]).toBe('Beyond the Slides: Chat with the MD'); // Col C: Topic
      expect(cells[3]).toBe('5. Very Good'); // Col D: Q1
      expect(cells[4]).toBe('5. Very Good'); // Col E: Q2
      expect(cells[5]).toBe('5. Very Good'); // Col F: Q3
      expect(cells[6]).toBe('5. Very Good'); // Col G: Q4
      expect(cells[7]).toBe('5. Very Good'); // Col H: Q5
      expect(cells[8]).toBe('5. Very Good'); // Col I: Q6
      expect(cells[9]).toBe('NO'); // Col J: Questions? (YES/NO)
      expect(cells[10]).toBe('Clear strategic overview.'); // Col K: Explanation
      expect(cells[11]).toBe('No follow-up needed.'); // Col L: How Addressed
      expect(cells[12]).toBe('None, format was great.'); // Col M: Suggestions
    });

    it('formats YES when hasQuestions is true and preserves mixed ratings', () => {
      const tsv = clipboardRowForFeedback(SAMPLE_ENTRY_2);
      const cells = parseTsvRow(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[0]).toBe('03/09/2026');
      expect(cells[1]).toBe('HRD');
      expect(cells[2]).toBe('Intro to HRD Department');
      expect(cells[3]).toBe('4. Good');
      expect(cells[4]).toBe('4. Good');
      expect(cells[5]).toBe('3. Fair');
      expect(cells[6]).toBe('4. Good');
      expect(cells[7]).toBe('4. Good');
      expect(cells[8]).toBe('4. Good');
      expect(cells[9]).toBe('YES');
      expect(cells[10]).toBe('Questions on benefits timeline.');
      expect(cells[11]).toBe('Email follow-up with Sarah.');
      expect(cells[12]).toBe('Send handbook prior to session.');
    });

    it('quotes cells containing newlines according to RFC4180', () => {
      const entryWithNewlines: FeedbackEntry = {
        ...SAMPLE_ENTRY_1,
        questionExplanation: 'Line 1: Need access\nLine 2: Specifically VPN token',
      };
      const tsv = clipboardRowForFeedback(entryWithNewlines);
      expect(tsv.includes('"Line 1: Need access\nLine 2: Specifically VPN token"')).toBe(true);

      const cells = parseTsvRow(tsv);
      expect(cells).toHaveLength(13);
      expect(cells[10]).toBe('Line 1: Need access\nLine 2: Specifically VPN token');
    });

    it('escapes internal double quotes according to RFC4180', () => {
      const entryWithQuotes: FeedbackEntry = {
        ...SAMPLE_ENTRY_1,
        suggestions: 'Loved the "Ask Me Anything" portion.',
      };
      const tsv = clipboardRowForFeedback(entryWithQuotes);
      expect(tsv.includes('"Loved the ""Ask Me Anything"" portion."')).toBe(true);

      const cells = parseTsvRow(tsv);
      expect(cells).toHaveLength(13);
      expect(cells[12]).toBe('Loved the "Ask Me Anything" portion.');
    });

    it('quotes cells containing internal tabs without corrupting column count', () => {
      const entryWithTabs: FeedbackEntry = {
        ...SAMPLE_ENTRY_1,
        questionExplanation: 'Part 1\tPart 2',
      };
      const tsv = clipboardRowForFeedback(entryWithTabs);
      const cells = parseTsvRow(tsv);
      expect(cells).toHaveLength(13);
      expect(cells[10]).toBe('Part 1\tPart 2');
    });

    it('handles empty or undefined optional qualitative fields gracefully', () => {
      const minimalEntry: FeedbackEntry = {
        sessionId: 'row-4',
        sessionTitle: 'Beyond the Slides: Chat with the MD',
        pic: 'Managing Director',
        date: '02/09/2026',
        ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
        hasQuestions: false,
        createdAt: '2026-09-02T10:00:00.000Z',
      };
      const tsv = clipboardRowForFeedback(minimalEntry);
      const cells = parseTsvRow(tsv);
      expect(cells).toHaveLength(13);
      expect(cells[9]).toBe('NO');
      expect(cells[10]).toBe('');
      expect(cells[11]).toBe('');
      expect(cells[12]).toBe('');
    });
  });

  describe('FeedbackModal helpers (isRatingComplete & tabWrapTarget)', () => {
    it('isRatingComplete validates complete 6-dimension ratings', () => {
      expect(
        isRatingComplete({
          communication: 5,
          alignment: 4,
          understanding: 3,
          readiness: 2,
          pace: 1,
          overall: 5,
        })
      ).toBe(true);
    });

    it('isRatingComplete rejects incomplete ratings', () => {
      expect(
        isRatingComplete({
          communication: 5,
          alignment: 4,
        })
      ).toBe(false);

      expect(
        isRatingComplete({
          communication: 5,
          alignment: 4,
          understanding: 3,
          readiness: 2,
          pace: 1,
          overall: 0 as unknown as 1,
        })
      ).toBe(false);
    });

    it('tabWrapTarget wraps forward from last to first', () => {
      const elements = ['btn-1', 'btn-2', 'btn-3'];
      const target = tabWrapTarget('btn-3', elements, false);
      expect(target).toBe('btn-1');
    });

    it('tabWrapTarget wraps backward from first to last on shiftKey', () => {
      const elements = ['btn-1', 'btn-2', 'btn-3'];
      const target = tabWrapTarget('btn-1', elements, true);
      expect(target).toBe('btn-3');
    });

    it('tabWrapTarget returns null when not at boundary', () => {
      const elements = ['btn-1', 'btn-2', 'btn-3'];
      const targetForward = tabWrapTarget('btn-2', elements, false);
      expect(targetForward === null).toBe(true);

      const targetBackward = tabWrapTarget('btn-2', elements, true);
      expect(targetBackward === null).toBe(true);
    });
  });

  describe('Question Addressing choices & normalizer', () => {
    it('defines the 3 official Google Sheets choices in QUESTION_ADDRESSING_OPTIONS', () => {
      expect(QUESTION_ADDRESSING_OPTIONS).toEqual([
        'Chat response is fine',
        "I don't have any questions today",
        'I’d like to schedule aN online live meeting',
      ]);
    });

    it('isStandardQuestionAddressing identifies official choices', () => {
      expect(isStandardQuestionAddressing('Chat response is fine')).toBe(true);
      expect(isStandardQuestionAddressing("I don't have any questions today")).toBe(true);
      expect(isStandardQuestionAddressing('I’d like to schedule aN online live meeting')).toBe(true);
      expect(isStandardQuestionAddressing('Follow up with Sarah')).toBe(false);
      expect(isStandardQuestionAddressing('')).toBe(false);
      expect(isStandardQuestionAddressing(null)).toBe(false);
    });

    it('normalizeQuestionAddressing standardizes various formats into official choices', () => {
      // Chat variations
      expect(normalizeQuestionAddressing('Chat response is fine')).toBe('Chat response is fine');
      expect(normalizeQuestionAddressing('chat response')).toBe('Chat response is fine');
      expect(normalizeQuestionAddressing('chat')).toBe('Chat response is fine');

      // No questions variations
      expect(normalizeQuestionAddressing("I don't have any questions today")).toBe("I don't have any questions today");
      expect(normalizeQuestionAddressing("i don't have any questions today")).toBe("I don't have any questions today");
      expect(normalizeQuestionAddressing('i dont have any questions today')).toBe("I don't have any questions today");
      expect(normalizeQuestionAddressing('no questions')).toBe("I don't have any questions today");

      // Meeting variations (straight quote, lowercase an, etc.)
      expect(normalizeQuestionAddressing("I'd like to schedule an online live meeting")).toBe(
        'I’d like to schedule aN online live meeting'
      );
      expect(normalizeQuestionAddressing('I’d like to schedule aN online live meeting')).toBe(
        'I’d like to schedule aN online live meeting'
      );

      // Custom values are preserved
      expect(normalizeQuestionAddressing('Sync with HRD via Slack tomorrow')).toBe(
        'Sync with HRD via Slack tomorrow'
      );
      expect(normalizeQuestionAddressing('')).toBe('');
      expect(normalizeQuestionAddressing(123)).toBe('');
    });
  });

  describe('clipboardBlockForFeedback', () => {
    it('generates exactly 14 rows matching FEEDBACK_SESSIONS', () => {
      const entries: FeedbackEntry[] = [
        {
          id: 'fb-row-3',
          sessionId: 'row-3',
          sessionTitle: 'Introduction to Company',
          pic: 'Managing Director',
          date: '10/09/2026',
          ratings: { communication: 5, alignment: 5, understanding: 5, readiness: 5, pace: 5, overall: 5 },
          hasQuestions: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const block = clipboardBlockForFeedback(entries);
      const lines = block.split('\n');
      expect(lines.length).toBe(14);

      // Row 3 should have evaluated data
      const row3Cells = lines[0].split('\t');
      expect(row3Cells[0]).toBe('10/09/2026');
      expect(row3Cells[1]).toBe('Managing Director');
      expect(row3Cells[2]).toBe('Introduction to Company');
      expect(row3Cells[3]).toBe('5. Very Good');
      expect(row3Cells[9]).toBe('NO');

      // Row 4 should be empty evaluation with preserved PIC & title
      const row4Cells = lines[1].split('\t');
      expect(row4Cells[0]).toBe('');
      expect(row4Cells[1]).toBe('Managing Director');
      expect(row4Cells[2]).toBe('Beyond the Slides: Chat with the MD');
      expect(row4Cells[3]).toBe('');
      expect(row4Cells[9]).toBe('');
    });
  });
});
