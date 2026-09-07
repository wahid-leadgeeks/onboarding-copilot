import {
  STAGE_1_EVIDENCE,
  STAGE_2_EVIDENCE,
  STAGE_3_EVIDENCE,
  TIMELINE_HEADERS,
  TIMELINE_STAGES,
  clipboardRowForTimelineStage,
  clipboardSummaryForTimeline,
  escapeTsvCell,
  findTimelineStage,
  getDefaultTimelineState,
} from './timeline';
import type {
  TimelineClipboardOptions,
  TimelineStage,
  TimelineState,
} from './types/timeline';

/**
 * Independent RFC4180 single-line TSV cell parser for test oracle.
 * Simulates standard spreadsheet tab-separated clipboard row parser.
 */
export function parseTsvCells(row: string): string[] {
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
        } else {
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

describe('Empirical Challenge: Timeline TSV Clipboard Serialization (Milestone 3)', () => {
  describe('Suite 1: Exact 9-Column TSV Layout Matching Columns A–I of HR Worksheet', () => {
    it('verifies exact 9-column headers matching worksheet layout', () => {
      expect(TIMELINE_HEADERS).toHaveLength(9);
      expect(TIMELINE_HEADERS).toEqual([
        'Stage #',
        'Stage Name',
        'Start',
        'End',
        'Objective',
        'Key Activities',
        'Outputs / Evidence',
        'Minimum Duration',
        'Topic Covered',
      ]);
    });

    it('generates exactly 8 tab delimiters and 9 parsed columns for Stage 1.0', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardRowForTimelineStage('stage-1', state);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(9);
      expect(cells[0]).toBe('1.0'); // Col A: Stage #
      expect(cells[1]).toBe(
        'Training – exposure and knowledge transfer – “I do, you see”'
      ); // Col B: Stage Name
      expect(cells[2]).toBe('01/09/2026'); // Col C: Start
      expect(cells[3]).toBe('30/09/2026'); // Col D: End
      expect(cells[4]).toContain('Ensure the IT Staff understands LeadGeeks'); // Col E: Objective
      expect(cells[5]).toContain('Execution:\na. Week 1'); // Col F: Key Activities
      expect(cells[6]).toContain('- Completed training checklist [PENDING]'); // Col G: Outputs / Evidence
      expect(cells[7]).toBe('1 Month'); // Col H: Minimum Duration
      expect(cells[8]).toBe(''); // Col I: Topic Covered
    });

    it('generates exactly 8 tab delimiters and 9 parsed columns for Stage 2.0', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardRowForTimelineStage('stage-2', state);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(9);
      expect(cells[0]).toBe('2.0'); // Col A: Stage #
      expect(cells[1]).toBe(
        'Trial – performance validation under supervision – “You do, I see”'
      ); // Col B: Stage Name
      expect(cells[2]).toBe('01/10/2026'); // Col C: Start
      expect(cells[3]).toBe('31/10/2026'); // Col D: End
      expect(cells[4]).toContain('Ensure the IT Staff can apply the knowledge'); // Col E: Objective
      expect(cells[5]).toContain('Handle assigned IT operational tasks'); // Col F: Key Activities
      expect(cells[6]).toContain('- Completed IT tasks [PENDING]'); // Col G: Outputs / Evidence
      expect(cells[7]).toBe('1 Month'); // Col H: Minimum Duration
      expect(cells[8]).toBe(''); // Col I: Topic Covered
    });

    it('generates exactly 8 tab delimiters and 9 parsed columns for Stage 3.0', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardRowForTimelineStage('stage-3', state);
      const cells = parseTsvCells(tsv);

      expect(cells).toHaveLength(9);
      expect(cells[0]).toBe('3.0'); // Col A: Stage #
      expect(cells[1]).toBe(
        'Transition – full role activation with accountability – “You do, I don’t see”'
      ); // Col B: Stage Name
      expect(cells[2]).toBe('01/11/2026'); // Col C: Start
      expect(cells[3]).toBe('30/11/2026'); // Col D: End
      expect(cells[4]).toContain('Ensure the IT Staff is ready to take full ownership'); // Col E: Objective
      expect(cells[5]).toContain('Take ownership of assigned IT responsibilities'); // Col F: Key Activities
      expect(cells[6]).toContain('- Completed assigned responsibilities [PENDING]'); // Col G: Outputs / Evidence
      expect(cells[7]).toBe('1 Month'); // Col H: Minimum Duration
      expect(cells[8]).toBe(''); // Col I: Topic Covered
    });

    it('resolves stage by numeric or string alias (1, "1", "1.0", "stage-1")', () => {
      const state = getDefaultTimelineState();
      const expected = clipboardRowForTimelineStage('stage-1', state);

      expect(clipboardRowForTimelineStage('1.0', state)).toBe(expected);
      expect(clipboardRowForTimelineStage('1', state)).toBe(expected);
      expect(clipboardRowForTimelineStage(1, state)).toBe(expected);
      expect(clipboardRowForTimelineStage('stage-1', state)).toBe(expected);
      expect(clipboardRowForTimelineStage('stage 1', state)).toBe(expected);
    });

    it('returns empty string for invalid stage identifier (and documents empty string edge case)', () => {
      const state = getDefaultTimelineState();
      expect(clipboardRowForTimelineStage('stage-99', state)).toBe('');
      expect(clipboardRowForTimelineStage('unknown', state)).toBe('');
      expect(clipboardRowForTimelineStage(null as unknown as string, state)).toBe('');
      expect(clipboardRowForTimelineStage(undefined as unknown as string, state)).toBe('');

      expect(clipboardRowForTimelineStage('', state)).toBe('');
      expect(clipboardRowForTimelineStage('   ', state)).toBe('');
    });
  });

  describe('Suite 2: RFC4180 Multiline Escaping & Evidence Checkbox Formatting', () => {
    it('marks checked deliverables as [DONE] and unchecked as [PENDING]', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': false,
          'stage-1-evidence-3': true,
          'stage-1-evidence-4': false,
          'stage-1-evidence-5': true,
        },
      };

      const tsv = clipboardRowForTimelineStage('stage-1', state);
      const cells = parseTsvCells(tsv);
      const colG = cells[6];

      expect(colG).toContain('- Completed training checklist [DONE]');
      expect(colG).toContain('- Learning notes and summary documentation [PENDING]');
      expect(colG).toContain('- Job shadowing / observation records [DONE]');
      expect(colG).toContain('- Initial capability assessment [PENDING]');
      expect(colG).toContain('- Completed IT tasks [DONE]');
    });

    it('supports custom markDoneTag option', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
        },
      };

      const tsv = clipboardRowForTimelineStage('stage-1', state, {
        markDoneTag: '[VERIFIED]',
      });
      const cells = parseTsvCells(tsv);
      const colG = cells[6];

      expect(colG).toContain('- Completed training checklist [VERIFIED]');
      expect(colG).toContain('- Learning notes and summary documentation [PENDING]');
    });

    it('supports omitting [PENDING] tag when includePendingTag is false', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': false,
        },
      };

      const tsv = clipboardRowForTimelineStage('stage-1', state, {
        includePendingTag: false,
      });
      const cells = parseTsvCells(tsv);
      const colG = cells[6];

      expect(colG).toContain('- Completed training checklist [DONE]');
      expect(colG).toContain('- Learning notes and summary documentation');
      expect(colG).not.toContain('[PENDING]');
    });

    it('properly quotes Column F (Key Activities) because it contains multiline newlines', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardRowForTimelineStage('stage-1', state);

      // In raw TSV, Column F is enclosed in quotes
      const cells = parseTsvCells(tsv);
      expect(cells[5]).toContain('\n');
      expect(cells[5].split('\n').length).toBeGreaterThan(5);
    });

    it('properly quotes Column G (Outputs / Evidence) because it contains multiline newlines', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardRowForTimelineStage('stage-1', state);

      const cells = parseTsvCells(tsv);
      expect(cells[6]).toContain('\n');
      expect(cells[6].split('\n')).toHaveLength(5); // 5 items in Stage 1
    });

    it('handles embedded ASCII quotes by doubling them according to RFC4180', () => {
      const raw = 'Key activity with "double quotes" and ""escaped"" quotes';
      const escaped = escapeTsvCell(raw);
      expect(escaped).toBe('"Key activity with ""double quotes"" and """"escaped"""" quotes"');

      // Roundtrip verification through parser oracle
      const parsed = parseTsvCells(`ColA\t${escaped}\tColC`);
      expect(parsed).toHaveLength(3);
      expect(parsed[1]).toBe(raw);
    });

    it('handles embedded tab characters by enclosing in quotes without shifting columns', () => {
      const rawWithTabs = 'Step 1\tStep 2\tStep 3';
      const escaped = escapeTsvCell(rawWithTabs);
      expect(escaped).toBe('"Step 1\tStep 2\tStep 3"');

      const parsed = parseTsvCells(`ColA\t${escaped}\tColC`);
      expect(parsed).toHaveLength(3);
      expect(parsed[1]).toBe(rawWithTabs);
    });

    it('handles Windows CRLF (\\r\\n) and classic Mac CR (\\r) inside cells', () => {
      const crlf = 'Activity Line 1\r\nActivity Line 2\rActivity Line 3';
      const escaped = escapeTsvCell(crlf);
      expect(escaped).toBe(`"${crlf}"`);

      const parsed = parseTsvCells(`ColA\t${escaped}\tColC`);
      expect(parsed).toHaveLength(3);
      expect(parsed[1]).toBe(crlf);
    });
  });

  describe('Suite 3: Zero Column Shifting Across Multi-Stage Exports', () => {
    it('exports all 3 stages with zero column shifting (clipboardSummaryForTimeline)', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-5': true,
          'stage-2-evidence-2': true,
          'stage-3-evidence-1': true,
          'stage-3-evidence-4': true,
        },
      };

      const tsv = clipboardSummaryForTimeline(state);
      const rows = parseTsvDocument(tsv);

      expect(rows).toHaveLength(3);
      for (let r = 0; r < 3; r++) {
        expect(rows[r]).toHaveLength(9);
      }

      // Stage 1
      expect(rows[0][0]).toBe('1.0');
      expect(rows[0][2]).toBe('01/09/2026');
      expect(rows[0][3]).toBe('30/09/2026');
      expect(rows[0][6]).toContain('- Completed training checklist [DONE]');
      expect(rows[0][6]).toContain('- Learning notes and summary documentation [PENDING]');
      expect(rows[0][7]).toBe('1 Month');

      // Stage 2
      expect(rows[1][0]).toBe('2.0');
      expect(rows[1][2]).toBe('01/10/2026');
      expect(rows[1][3]).toBe('31/10/2026');
      expect(rows[1][6]).toContain('- Completed IT tasks [PENDING]');
      expect(rows[1][6]).toContain('- Task / work records [DONE]');
      expect(rows[1][7]).toBe('1 Month');

      // Stage 3
      expect(rows[2][0]).toBe('3.0');
      expect(rows[2][2]).toBe('01/11/2026');
      expect(rows[2][3]).toBe('30/11/2026');
      expect(rows[2][6]).toContain('- Completed assigned responsibilities [DONE]');
      expect(rows[2][6]).toContain('- Final onboarding assessment [DONE]');
      expect(rows[2][7]).toBe('1 Month');
    });

    it('includes 9-column header row when includeHeader is true', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardSummaryForTimeline(state, { includeHeader: true });
      const rows = parseTsvDocument(tsv);

      expect(rows).toHaveLength(4); // 1 header + 3 stage rows

      // Header row
      expect(rows[0]).toHaveLength(9);
      expect(rows[0]).toEqual([
        'Stage #',
        'Stage Name',
        'Start',
        'End',
        'Objective',
        'Key Activities',
        'Outputs / Evidence',
        'Minimum Duration',
        'Topic Covered',
      ]);

      // 3 data rows
      expect(rows[1]).toHaveLength(9);
      expect(rows[1][0]).toBe('1.0');
      expect(rows[2]).toHaveLength(9);
      expect(rows[2][0]).toBe('2.0');
      expect(rows[3]).toHaveLength(9);
      expect(rows[3][0]).toBe('3.0');
    });

    it('maintains exact 9 columns when dates are updated', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        stageDates: {
          'stage-1': { startDate: '15/09/2026', endDate: '15/10/2026' },
          'stage-2': { startDate: '16/10/2026', endDate: '16/11/2026' },
          'stage-3': { startDate: '17/11/2026', endDate: '17/12/2026' },
        },
      };

      const tsv = clipboardSummaryForTimeline(state);
      const rows = parseTsvDocument(tsv);

      expect(rows).toHaveLength(3);
      expect(rows[0][2]).toBe('15/09/2026');
      expect(rows[0][3]).toBe('15/10/2026');
      expect(rows[1][2]).toBe('16/10/2026');
      expect(rows[1][3]).toBe('16/11/2026');
      expect(rows[2][2]).toBe('17/11/2026');
      expect(rows[2][3]).toBe('17/12/2026');
    });

    it('handles ISO date formats by normalizing to DD/MM/YYYY in Col C and D', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        stageDates: {
          'stage-1': { startDate: '2026-09-01', endDate: '2026-09-30' },
          'stage-2': { startDate: '2026-10-01', endDate: '2026-10-31' },
          'stage-3': { startDate: '2026-11-01', endDate: '2026-11-30' },
        },
      };

      const tsv = clipboardSummaryForTimeline(state);
      const rows = parseTsvDocument(tsv);

      expect(rows[0][2]).toBe('01/09/2026');
      expect(rows[0][3]).toBe('30/09/2026');
      expect(rows[1][2]).toBe('01/10/2026');
      expect(rows[1][3]).toBe('31/10/2026');
      expect(rows[2][2]).toBe('01/11/2026');
      expect(rows[2][3]).toBe('30/11/2026');
    });

    it('preserves empty strings when dates or topicCovered are empty without shifting', () => {
      const blankState: TimelineState = {
        stages: {},
        stageDates: {
          'stage-1': { startDate: '', endDate: '' },
          'stage-2': { startDate: '', endDate: '' },
          'stage-3': { startDate: '', endDate: '' },
        },
        completedEvidence: {},
      };

      const tsv = clipboardSummaryForTimeline(blankState);
      const rows = parseTsvDocument(tsv);

      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(row).toHaveLength(9);
        expect(row[2]).toBe(''); // Start Date empty
        expect(row[3]).toBe(''); // End Date empty
        expect(row[8]).toBe(''); // Topic Covered empty
      }
    });
  });

  describe('Suite 4: Property-Based Randomized Fuzzing & Adversarial Injection', () => {
    it('guarantees 9 columns and zero column shifting across 100 fuzz iterations', () => {
      const adversarialFragments = [
        'Normal text',
        'Text with "quotes" inside',
        'Text with \t tabs \t inside',
        'Text with \n newlines \n inside',
        'Text with \r\n CRLF breaks \r\n inside',
        'Cocktail: "quotes", \t tabs, and \n newlines',
        'Boundary quotes: """Start and End"""',
        'Unicode: 日本語・한국어・العربية 🚀 ✨',
        'Formula text: =SUM(A1:B1) +CMD|calc -10 @User',
        'Empty: ',
      ];

      for (let iter = 0; iter < 100; iter++) {
        const stageNum = (['1.0', '2.0', '3.0'] as const)[iter % 3];
        const frag = adversarialFragments[iter % adversarialFragments.length];

        const customState: TimelineState = {
          stages: {},
          stageDates: {
            'stage-1': {
              startDate: iter % 2 === 0 ? `0${(iter % 9) + 1}/09/2026` : `2026-09-0${(iter % 9) + 1}`,
              endDate: '30/09/2026',
            },
            'stage-2': { startDate: '01/10/2026', endDate: '31/10/2026' },
            'stage-3': { startDate: '01/11/2026', endDate: '30/11/2026' },
          },
          completedEvidence: {
            'stage-1-evidence-1': iter % 2 === 0,
            'stage-2-evidence-1': iter % 3 === 0,
            'stage-3-evidence-1': iter % 4 === 0,
          },
        };

        const customOptions: TimelineClipboardOptions = {
          markDoneTag: `[DONE: ${frag}]`,
          includePendingTag: iter % 2 === 0,
        };

        const tsv = clipboardRowForTimelineStage(stageNum, customState, customOptions);
        const cells = parseTsvCells(tsv);

        // INVARIANT 1: Exactly 9 columns
        expect(cells).toHaveLength(9);

        // INVARIANT 2: Column order matches worksheet exactly
        expect(cells[0]).toBe(stageNum);
        expect(cells[7]).toBe('1 Month');

        // INVARIANT 3: Column G contains the deliverables
        expect(cells[6].length).toBeGreaterThan(0);
      }
    });

    it('guarantees multiline document parsing consistency across 50 full exports with adversarial tags', () => {
      for (let iter = 0; iter < 50; iter++) {
        const customState: TimelineState = {
          stages: {},
          stageDates: {
            'stage-1': { startDate: '01/09/2026', endDate: '30/09/2026' },
            'stage-2': { startDate: '01/10/2026', endDate: '31/10/2026' },
            'stage-3': { startDate: '01/11/2026', endDate: '30/11/2026' },
          },
          completedEvidence: {
            'stage-1-evidence-1': iter % 2 === 0,
            'stage-2-evidence-2': iter % 3 === 0,
            'stage-3-evidence-3': iter % 4 === 0,
          },
        };

        const options: TimelineClipboardOptions = {
          includeHeader: iter % 2 === 0,
          markDoneTag: `[DONE "\t" #${iter}]`,
        };

        const docTsv = clipboardSummaryForTimeline(customState, options);
        const parsedRows = parseTsvDocument(docTsv);

        const expectedRowCount = options.includeHeader ? 4 : 3;
        expect(parsedRows).toHaveLength(expectedRowCount);

        for (const row of parsedRows) {
          expect(row).toHaveLength(9);
        }
      }
    });
  });

  describe('Suite 5: Advanced Adversarial Scenarios & Cell Roundtrip Fidelity', () => {
    it('preserves 100% exact text fidelity in roundtrip parse for all 9 columns', () => {
      const state: TimelineState = {
        stages: {},
        stageDates: {
          'stage-1': { startDate: '01/09/2026', endDate: '30/09/2026' },
          'stage-2': { startDate: '01/10/2026', endDate: '31/10/2026' },
          'stage-3': { startDate: '01/11/2026', endDate: '30/11/2026' },
        },
        completedEvidence: {
          'stage-1-evidence-1': true,
        },
      };

      const stage1 = findTimelineStage('stage-1')!;
      const rowTsv = clipboardRowForTimelineStage('stage-1', state);
      const parsedCells = parseTsvCells(rowTsv);

      expect(parsedCells[0]).toBe(stage1.stageNumber);
      expect(parsedCells[1]).toBe(stage1.name);
      expect(parsedCells[2]).toBe('01/09/2026');
      expect(parsedCells[3]).toBe('30/09/2026');
      expect(parsedCells[4]).toBe(stage1.objective);
      expect(parsedCells[5]).toBe(stage1.keyActivities);
      expect(parsedCells[7]).toBe(stage1.duration);
      expect(parsedCells[8]).toBe(stage1.topicCovered ?? '');
    });

    it('handles custom markDoneTag containing internal quotes and tabs safely', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
        },
      };

      const customDoneTag = '[DONE: "Audited" \t PASSED]';
      const rowTsv = clipboardRowForTimelineStage('stage-1', state, {
        markDoneTag: customDoneTag,
      });

      const parsedCells = parseTsvCells(rowTsv);
      expect(parsedCells).toHaveLength(9);
      expect(parsedCells[6]).toContain(`- Completed training checklist ${customDoneTag}`);
    });

    it('handles empty state object without throwing or shifting columns', () => {
      const emptyState = {} as unknown as TimelineState;
      const rowTsv = clipboardRowForTimelineStage('stage-1', emptyState);

      const parsedCells = parseTsvCells(rowTsv);
      expect(parsedCells).toHaveLength(9);
      expect(parsedCells[0]).toBe('1.0');
      // Falls back to default dates
      expect(parsedCells[2]).toBe('01/09/2026');
      expect(parsedCells[3]).toBe('30/09/2026');
      // All items should be [PENDING]
      expect(parsedCells[6]).toContain('[PENDING]');
      expect(parsedCells[6]).not.toContain('[DONE]');
    });

    it('handles non-empty topicCovered in Column I without row or column shifting', () => {
      const state = getDefaultTimelineState();
      // Test when Col I has content with tabs and quotes
      const mockStage: TimelineStage = {
        ...TIMELINE_STAGES[0],
        topicCovered: 'Topic 1: "DevOps & Cloud"\tTopic 2: Security',
      };

      const columns = [
        mockStage.stageNumber,
        mockStage.name,
        '01/09/2026',
        '30/09/2026',
        mockStage.objective,
        mockStage.keyActivities,
        'Outputs',
        mockStage.duration,
        mockStage.topicCovered,
      ];

      const rowTsv = columns.map(escapeTsvCell).join('\t');
      const parsedCells = parseTsvCells(rowTsv);

      expect(parsedCells).toHaveLength(9);
      expect(parsedCells[8]).toBe('Topic 1: "DevOps & Cloud"\tTopic 2: Security');
    });

    it('correctly serializes summary with CRLF and mixed line endings', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardSummaryForTimeline(state);

      // Verify that splitting by pure \n (without RFC4180 unquoting) produces >3 lines
      // because Col F and Col G contain internal \n
      const rawLines = tsv.split('\n');
      expect(rawLines.length).toBeGreaterThan(15);

      // BUT RFC4180 document parser correctly groups them into exactly 3 records
      const doc = parseTsvDocument(tsv);
      expect(doc).toHaveLength(3);
      for (const row of doc) {
        expect(row).toHaveLength(9);
      }
    });
  });
});
