import {
  FEEDBACK_SESSIONS,
  clipboardRowForFeedback,
  escapeTsvCell,
  formatFeedbackDate,
  toLikertLabel,
} from './feedback';
import type { FeedbackClipboardInput, FeedbackEntry, LikertScore } from './types/feedback';

/**
 * Independent RFC4180 TSV state machine oracle.
 * Accurately models Excel and Google Sheets clipboard TSV parsing behavior.
 */
export function parseTsvCells(tsvLine: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < tsvLine.length) {
    const char = tsvLine[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < tsvLine.length && tsvLine[i + 1] === '"') {
          // Escaped double quote ("")
          current += '"';
          i += 2;
        } else {
          // Closing double quote
          inQuotes = false;
          i += 1;
        }
      } else {
        current += char;
        i += 1;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
      } else if (char === '\t') {
        cells.push(current);
        current = '';
        i += 1;
      } else {
        current += char;
        i += 1;
      }
    }
  }

  cells.push(current);
  return cells;
}

/**
 * Independent RFC4180 multiline TSV document parser.
 * Handles multiline records with internal newlines inside quoted cells.
 */
export function parseTsvDocument(tsvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < tsvText.length) {
    const char = tsvText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < tsvText.length && tsvText[i + 1] === '"') {
          currentCell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        currentCell += char;
        i += 1;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
      } else if (char === '\t') {
        currentRow.push(currentCell);
        currentCell = '';
        i += 1;
      } else if (char === '\r' && i + 1 < tsvText.length && tsvText[i + 1] === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i += 2;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i += 1;
      } else {
        currentCell += char;
        i += 1;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

describe('Empirical Challenge: clipboardRowForFeedback (Milestone 2 Iteration 2)', () => {
  describe('Suite 1: Exact 13-Column TSV Layout & Delimiter Integrity', () => {
    it('generates exactly 12 unquoted tab delimiters and 13 parsed columns', () => {
      const entry: FeedbackEntry = {
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
        questionExplanation: 'Thorough discussion.',
        questionAddressing: 'None.',
        suggestions: 'Keep it up.',
        createdAt: '2026-09-02T10:00:00Z',
      };

      const tsv = clipboardRowForFeedback(entry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[0]).toBe('02/09/2026'); // Col A: Date
      expect(cells[1]).toBe('Managing Director'); // Col B: PIC
      expect(cells[2]).toBe('Beyond the Slides: Chat with the MD'); // Col C: Topic
      expect(cells[3]).toBe('5. Very Good'); // Col D: Q1
      expect(cells[4]).toBe('5. Very Good'); // Col E: Q2
      expect(cells[5]).toBe('5. Very Good'); // Col F: Q3
      expect(cells[6]).toBe('5. Very Good'); // Col G: Q4
      expect(cells[7]).toBe('5. Very Good'); // Col H: Q5
      expect(cells[8]).toBe('5. Very Good'); // Col I: Q6
      expect(cells[9]).toBe('NO'); // Col J: Questions?
      expect(cells[10]).toBe('Thorough discussion.'); // Col K: Explanation
      expect(cells[11]).toBe('None.'); // Col L: How Addressed
      expect(cells[12]).toBe('Keep it up.'); // Col M: Suggestions
    });

    it('preserves trailing empty columns when qualitative fields are omitted', () => {
      const minimalEntry: FeedbackEntry = {
        sessionId: 'row-6',
        sessionTitle: 'Company Policy',
        pic: 'HRD',
        date: '04/09/2026',
        ratings: {
          communication: 4,
          alignment: 4,
          understanding: 4,
          readiness: 4,
          pace: 4,
          overall: 4,
        },
        hasQuestions: false,
        createdAt: '2026-09-04T10:00:00Z',
      };

      const tsv = clipboardRowForFeedback(minimalEntry);
      // Ensure the string ends with 3 trailing tabs representing cols K, L, M
      expect(tsv.endsWith('\t\t\t')).toBe(true);

      const cells = parseTsvCells(tsv);
      expect(cells).toHaveLength(13);
      expect(cells[9]).toBe('NO');
      expect(cells[10]).toBe('');
      expect(cells[11]).toBe('');
      expect(cells[12]).toBe('');
    });

    it('handles completely blank object input producing 13 empty columns', () => {
      const emptyInput: FeedbackClipboardInput = {};
      const tsv = clipboardRowForFeedback(emptyInput);

      expect(tsv).toBe('\t\t\t\t\t\t\t\t\t\t\t\t'); // Exactly 12 tabs
      const cells = parseTsvCells(tsv);
      expect(cells).toHaveLength(13);
      cells.forEach((cell) => expect(cell).toBe(''));
    });
  });

  describe('Suite 2: RFC4180 Escaping Stress Matrix', () => {
    it('correctly escapes newlines (LF, CRLF, CR, consecutive newlines)', () => {
      const multilineEntry: FeedbackClipboardInput = {
        topic: 'Session with\nNewline',
        explanation: 'Point 1\r\nPoint 2\rPoint 3\n\nPoint 4',
        suggestions: '\nLeading and trailing\n',
      };

      const tsv = clipboardRowForFeedback(multilineEntry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[2]).toBe('Session with\nNewline');
      expect(cells[10]).toBe('Point 1\r\nPoint 2\rPoint 3\n\nPoint 4');
      expect(cells[12]).toBe('\nLeading and trailing\n');
    });

    it('correctly escapes single, double, triple, and unbalanced quotes', () => {
      const quoteEntry: FeedbackClipboardInput = {
        pic: 'Lead "Tech" PIC',
        topic: 'Single quote: "',
        explanation: 'Double quote: "" and triple quote: """',
        howAddressed: 'Unbalanced quote: "test',
        suggestions: 'Quote at end: test"',
      };

      const tsv = clipboardRowForFeedback(quoteEntry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[1]).toBe('Lead "Tech" PIC');
      expect(cells[2]).toBe('Single quote: "');
      expect(cells[10]).toBe('Double quote: "" and triple quote: """');
      expect(cells[11]).toBe('Unbalanced quote: "test');
      expect(cells[12]).toBe('Quote at end: test"');
    });

    it('correctly shields tabs from splitting columns', () => {
      const tabEntry: FeedbackClipboardInput = {
        topic: 'Topic\tWith\tTabs',
        explanation: '\tLeading tab and trailing tab\t',
        howAddressed: 'Multiple\t\t\tConsecutive\t\tTabs',
        suggestions: 'Col1\tCol2\tCol3',
      };

      const tsv = clipboardRowForFeedback(tabEntry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[2]).toBe('Topic\tWith\tTabs');
      expect(cells[10]).toBe('\tLeading tab and trailing tab\t');
      expect(cells[11]).toBe('Multiple\t\t\tConsecutive\t\tTabs');
      expect(cells[12]).toBe('Col1\tCol2\tCol3');
    });

    it('handles universal cocktail of quotes, tabs, and newlines in every column', () => {
      const cocktail = 'Line 1\t"quoted"\r\nLine 2\t""more quotes""';
      const universalEntry: FeedbackClipboardInput = {
        date: '2026-09-02',
        pic: `PIC\t${cocktail}`,
        topic: `Topic\n${cocktail}`,
        ratings: {
          communication: 5,
          alignment: 4,
          understanding: 3,
          readiness: 2,
          pace: 1,
          overall: 5,
        },
        hasQuestions: true,
        explanation: `Explanation\r\n${cocktail}`,
        howAddressed: `Addressing\t${cocktail}`,
        suggestions: `Suggestions\n\t"${cocktail}"`,
      };

      const tsv = clipboardRowForFeedback(universalEntry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[0]).toBe('02/09/2026');
      expect(cells[1]).toBe(`PIC\t${cocktail}`);
      expect(cells[2]).toBe(`Topic\n${cocktail}`);
      expect(cells[3]).toBe('5. Very Good');
      expect(cells[4]).toBe('4. Good');
      expect(cells[5]).toBe('3. Neutral');
      expect(cells[6]).toBe('2. Poor');
      expect(cells[7]).toBe('1. Very Poor');
      expect(cells[8]).toBe('5. Very Good');
      expect(cells[9]).toBe('YES');
      expect(cells[10]).toBe(`Explanation\r\n${cocktail}`);
      expect(cells[11]).toBe(`Addressing\t${cocktail}`);
      expect(cells[12]).toBe(`Suggestions\n\t"${cocktail}"`);
    });

    it('handles unicode, CJK, RTL scripts, and complex emojis with zero shift', () => {
      const unicodeEntry: FeedbackClipboardInput = {
        pic: '山田 太郎 (Yamada) & فاطمة',
        topic: '日本語・한국어・中文・العربية・עברית Session',
        explanation: 'Feedback: 非常好！\nОтличная сессия! ✨\nתהליך מעולה',
        suggestions: 'Team 👨‍👩‍👧‍👦 collaboration was 🚀 and 💯! Keep the 💡 flowing!',
      };

      const tsv = clipboardRowForFeedback(unicodeEntry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[1]).toBe('山田 太郎 (Yamada) & فاطمة');
      expect(cells[2]).toBe('日本語・한국어・中文・العربية・עברית Session');
      expect(cells[10]).toBe('Feedback: 非常好！\nОтличная сессия! ✨\nתהליך מעולה');
      expect(cells[12]).toBe('Team 👨‍👩‍👧‍👦 collaboration was 🚀 and 💯! Keep the 💡 flowing!');
    });

    it('handles large payload (>50KB) in qualitative cells without column or row drift', () => {
      const largeParagraph = 'Line with "quotes" and \t tabs and \n newlines. '.repeat(1000); // ~50KB
      const largeEntry: FeedbackClipboardInput = {
        suggestions: largeParagraph,
      };

      const tsv = clipboardRowForFeedback(largeEntry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[12]).toBe(largeParagraph);
    });

    it('handles formula characters (=, +, -, @) safely', () => {
      const formulaEntry: FeedbackClipboardInput = {
        topic: '=SUM(A1:B1)',
        explanation: '+CMD|"/C calc"!A0',
        howAddressed: '-10 + 20',
        suggestions: '@MentionInExcel',
      };

      const tsv = clipboardRowForFeedback(formulaEntry);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(13);
      expect(cells[2]).toBe('=SUM(A1:B1)');
      expect(cells[10]).toBe('+CMD|"/C calc"!A0');
      expect(cells[11]).toBe('-10 + 20');
      expect(cells[12]).toBe('@MentionInExcel');
    });
  });

  describe('Suite 3: All 13 Official Session Entries Verification', () => {
    it('verifies exact 13-column layout and zero shift for every official session (Row 4 to 16)', () => {
      expect(FEEDBACK_SESSIONS).toHaveLength(13);

      FEEDBACK_SESSIONS.forEach((session, index) => {
        const expectedRowNumber = index + 4;
        expect(session.rowNumber).toBe(expectedRowNumber);

        // Construct standard entry for this official session
        const entry: FeedbackEntry = {
          sessionId: session.id,
          sessionTitle: session.title,
          pic: session.pic,
          date: `0${(index % 9) + 1}/09/2026`,
          ratings: {
            communication: ((index % 5) + 1) as LikertScore,
            alignment: (((index + 1) % 5) + 1) as LikertScore,
            understanding: (((index + 2) % 5) + 1) as LikertScore,
            readiness: (((index + 3) % 5) + 1) as LikertScore,
            pace: (((index + 4) % 5) + 1) as LikertScore,
            overall: (((index + 2) % 5) + 1) as LikertScore,
          },
          hasQuestions: index % 2 === 0,
          questionExplanation: index % 2 === 0 ? `Questions for session ${session.title}` : '',
          questionAddressing: index % 2 === 0 ? `Addressing via ${session.pic}` : '',
          suggestions: `Suggestions for ${session.title}`,
          createdAt: new Date().toISOString(),
        };

        const tsv = clipboardRowForFeedback(entry);
        const cells = parseTsvCells(tsv);

        expect(cells).toHaveLength(13);
        expect(cells[0]).toBe(formatFeedbackDate(entry.date));
        expect(cells[1]).toBe(session.pic);
        expect(cells[2]).toBe(session.title);
        expect(cells[3]).toBe(toLikertLabel(entry.ratings.communication));
        expect(cells[4]).toBe(toLikertLabel(entry.ratings.alignment));
        expect(cells[5]).toBe(toLikertLabel(entry.ratings.understanding));
        expect(cells[6]).toBe(toLikertLabel(entry.ratings.readiness));
        expect(cells[7]).toBe(toLikertLabel(entry.ratings.pace));
        expect(cells[8]).toBe(toLikertLabel(entry.ratings.overall));
        expect(cells[9]).toBe(index % 2 === 0 ? 'YES' : 'NO');
        expect(cells[10]).toBe(entry.questionExplanation ?? '');
        expect(cells[11]).toBe(entry.questionAddressing ?? '');
        expect(cells[12]).toBe(entry.suggestions ?? '');
      });
    });

    it('verifies zero shift across all 13 sessions under adversarial content injection', () => {
      FEEDBACK_SESSIONS.forEach((session, index) => {
        // Inject adversarial quotes, tabs, newlines into topic, PIC, and qualitative fields
        const adversarialEntry: FeedbackClipboardInput = {
          date: '2026-09-07',
          pic: `${session.pic} ("Lead" \t PIC)`,
          topic: `${session.title}\n[Session #${index + 1}\t"Official"]`,
          ratings: {
            communication: 5,
            alignment: 4,
            understanding: 3,
            readiness: 2,
            pace: 1,
            overall: 5,
          },
          hasQuestions: true,
          explanation: `Line 1: Note for "${session.title}"\nLine 2: Talked to\t${session.pic}`,
          howAddressed: `Address with "${session.pic}" directly\r\nVia email/chat`,
          suggestions: `Improve "${session.title}"\twith more examples!\n1. Handouts\n2. Q&A`,
        };

        const tsv = clipboardRowForFeedback(adversarialEntry);
        const cells = parseTsvCells(tsv);

        expect(cells).toHaveLength(13);
        expect(cells[0]).toBe('07/09/2026');
        expect(cells[1]).toBe(`${session.pic} ("Lead" \t PIC)`);
        expect(cells[2]).toBe(`${session.title}\n[Session #${index + 1}\t"Official"]`);
        expect(cells[3]).toBe('5. Very Good');
        expect(cells[4]).toBe('4. Good');
        expect(cells[5]).toBe('3. Neutral');
        expect(cells[6]).toBe('2. Poor');
        expect(cells[7]).toBe('1. Very Poor');
        expect(cells[8]).toBe('5. Very Good');
        expect(cells[9]).toBe('YES');
        expect(cells[10]).toBe(`Line 1: Note for "${session.title}"\nLine 2: Talked to\t${session.pic}`);
        expect(cells[11]).toBe(`Address with "${session.pic}" directly\r\nVia email/chat`);
        expect(cells[12]).toBe(`Improve "${session.title}"\twith more examples!\n1. Handouts\n2. Q&A`);
      });
    });

    it('verifies bulk 13-session multiline export maintains exactly 13 rows and 13 columns per row', () => {
      // Generate rows for all 13 official sessions with mixed multiline content
      const rows = FEEDBACK_SESSIONS.map((session, index) => {
        const entry: FeedbackClipboardInput = {
          date: `0${(index % 9) + 1}/09/2026`,
          pic: session.pic,
          topic: session.title,
          ratings: {
            communication: 5,
            alignment: 5,
            understanding: 5,
            readiness: 5,
            pace: 5,
            overall: 5,
          },
          hasQuestions: index % 2 === 0,
          explanation: `Multi\nLine\nExplanation for ${session.title}`,
          howAddressed: `Follow-up\r\nwith\r\n${session.pic}`,
          suggestions: `Note 1\nNote 2\twith "quotes"`,
        };
        return clipboardRowForFeedback(entry);
      });

      // Join all 13 session rows with newlines
      const fullDocument = rows.join('\n');
      const parsedRows = parseTsvDocument(fullDocument);

      expect(parsedRows).toHaveLength(13);
      parsedRows.forEach((cols, rowIndex) => {
        expect(cols).toHaveLength(13);
        expect(cols[1]).toBe(FEEDBACK_SESSIONS[rowIndex].pic);
        expect(cols[2]).toBe(FEEDBACK_SESSIONS[rowIndex].title);
        expect(cols[10]).toBe(`Multi\nLine\nExplanation for ${FEEDBACK_SESSIONS[rowIndex].title}`);
        expect(cols[11]).toBe(`Follow-up\r\nwith\r\n${FEEDBACK_SESSIONS[rowIndex].pic}`);
        expect(cols[12]).toBe('Note 1\nNote 2\twith "quotes"');
      });
    });
  });

  describe('Suite 4: Property-Based Randomized Fuzzing Generator', () => {
    it('empirically guarantees 13 columns and zero column shifting across 100 fuzz iterations', () => {
      const randomStrings = [
        '',
        'Normal text',
        'Text with "single" and ""double"" quotes',
        'Text with \t tabs \t inside',
        'Text with \n newlines \r\n and \r carriage returns',
        'Cocktail: "quotes" \t tabs \n newlines',
        'Unicode: 日本語・한국어・العربية 🚀 ✨',
        'Formulas: =SUM(1,2) +CMD|A0 -10 @User',
        'Quotes at boundary: """Start and End"""',
      ];

      for (let iteration = 0; iteration < 100; iteration++) {
        const session = FEEDBACK_SESSIONS[iteration % FEEDBACK_SESSIONS.length];
        const dateStr = `2026-09-${String((iteration % 28) + 1).padStart(2, '0')}`;
        const hasQ = iteration % 3 === 0 ? true : iteration % 3 === 1 ? false : undefined;

        const randomEntry: FeedbackClipboardInput = {
          date: dateStr,
          pic: session.pic + (iteration % 2 === 0 ? ' "Lead"' : ''),
          topic: session.title + (iteration % 3 === 0 ? '\t[Topic]' : ''),
          ratings: {
            communication: ((iteration % 5) + 1) as LikertScore,
            alignment: (((iteration + 1) % 5) + 1) as LikertScore,
            understanding: (((iteration + 2) % 5) + 1) as LikertScore,
            readiness: (((iteration + 3) % 5) + 1) as LikertScore,
            pace: (((iteration + 4) % 5) + 1) as LikertScore,
            overall: (((iteration + 2) % 5) + 1) as LikertScore,
          },
          hasQuestions: hasQ,
          explanation: randomStrings[iteration % randomStrings.length],
          howAddressed: randomStrings[(iteration + 3) % randomStrings.length],
          suggestions: randomStrings[(iteration + 6) % randomStrings.length],
        };

        const tsv = clipboardRowForFeedback(randomEntry);
        const cells = parseTsvCells(tsv);

        // Invariant 1: Exactly 13 columns
        expect(cells).toHaveLength(13);

        // Invariant 2: Zero column shifting
        expect(cells[0]).toBe(formatFeedbackDate(dateStr));
        expect(cells[1]).toBe(randomEntry.pic ?? '');
        expect(cells[2]).toBe(randomEntry.topic ?? '');
        expect(cells[9]).toBe(hasQ === true ? 'YES' : hasQ === false ? 'NO' : '');
        expect(cells[10]).toBe(randomEntry.explanation ?? '');
        expect(cells[11]).toBe(randomEntry.howAddressed ?? '');
        expect(cells[12]).toBe(randomEntry.suggestions ?? '');
      }
    });
  });
});
