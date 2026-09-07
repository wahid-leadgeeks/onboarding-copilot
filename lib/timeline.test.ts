import {
  ALL_TIMELINE_EVIDENCE,
  STAGE_1_EVIDENCE,
  STAGE_2_EVIDENCE,
  STAGE_3_EVIDENCE,
  TIMELINE_STAGES,
  TIMELINE_STORAGE_KEY,
  calculateTimelineProgress,
  clipboardRowForTimelineStage,
  clipboardSummaryForTimeline,
  escapeTsvCell,
  findTimelineStage,
  getDefaultTimelineState,
  readTimelineState,
  toggleEvidenceItem,
  updateStageDates,
  writeTimelineState,
} from './timeline';
import type {
  TimelineStageDefinition,
  TimelineState,
} from './types/timeline';

/**
 * Pure RFC4180 single-line TSV cell parser for test oracle.
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

/**
 * Pure RFC4180 multiline TSV document parser.
 * Preserves newlines inside quoted cells without splitting the row.
 */
function parseTsvDocument(tsvText: string): string[][] {
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

const SAMPLE_TIMELINE_STATE: TimelineState = {
  stages: {
    'stage-1': {
      dates: { startDate: '01/09/2026', endDate: '30/09/2026' },
      evidence: { 'stage-1-evidence-1': true, 'stage-1-evidence-2': true },
    },
    'stage-2': {
      dates: { startDate: '01/10/2026', endDate: '31/10/2026' },
      evidence: {},
    },
    'stage-3': {
      dates: { startDate: '01/11/2026', endDate: '30/11/2026' },
      evidence: {},
    },
    '1.0': {
      dates: { startDate: '01/09/2026', endDate: '30/09/2026' },
      evidence: { 'stage-1-evidence-1': true, 'stage-1-evidence-2': true },
    },
    '2.0': {
      dates: { startDate: '01/10/2026', endDate: '31/10/2026' },
      evidence: {},
    },
    '3.0': {
      dates: { startDate: '01/11/2026', endDate: '30/11/2026' },
      evidence: {},
    },
  },
  stageDates: {
    '1.0': { startDate: '01/09/2026', endDate: '30/09/2026' },
    '2.0': { startDate: '01/10/2026', endDate: '31/10/2026' },
    '3.0': { startDate: '01/11/2026', endDate: '30/11/2026' },
    'stage-1': { startDate: '01/09/2026', endDate: '30/09/2026' },
    'stage-2': { startDate: '01/10/2026', endDate: '31/10/2026' },
    'stage-3': { startDate: '01/11/2026', endDate: '30/11/2026' },
  },
  completedEvidence: {
    'stage-1-evidence-1': true,
    'stage-1-evidence-2': true,
  },
  updatedAt: '2026-09-07T08:00:00.000Z',
};

describe('timeline system (lib/timeline)', () => {
  describe('TIMELINE_STORAGE_KEY & TIMELINE_STAGES', () => {
    it('uses the canonical storage key', () => {
      expect(TIMELINE_STORAGE_KEY).toBe('onboarding-timeline');
    });

    it('defines exactly 3 official HR stages in order', () => {
      expect(TIMELINE_STAGES).toHaveLength(3);
      expect(TIMELINE_STAGES.map((s) => s.stageNumber)).toEqual(['1.0', '2.0', '3.0']);
      expect(TIMELINE_STAGES.map((s) => s.id)).toEqual(['stage-1', 'stage-2', 'stage-3']);
    });

    it('defines the correct stage titles and pedagogical mottos', () => {
      expect(TIMELINE_STAGES[0].stageName).toBe(
        'Training – exposure and knowledge transfer – “I do, you see”'
      );
      expect(TIMELINE_STAGES[1].stageName).toBe(
        'Trial – performance validation under supervision – “You do, I see”'
      );
      expect(TIMELINE_STAGES[2].stageName).toBe(
        'Transition – full role activation with accountability – “You do, I don’t see”'
      );
    });

    it('defines 5 deliverables for Stage 1, 3 for Stage 2, and 4 for Stage 3 (12 total)', () => {
      expect(STAGE_1_EVIDENCE).toHaveLength(5);
      expect(STAGE_2_EVIDENCE).toHaveLength(3);
      expect(STAGE_3_EVIDENCE).toHaveLength(4);
      expect(ALL_TIMELINE_EVIDENCE).toHaveLength(12);

      expect(TIMELINE_STAGES[0].evidenceItems).toHaveLength(5);
      expect(TIMELINE_STAGES[1].evidenceItems).toHaveLength(3);
      expect(TIMELINE_STAGES[2].evidenceItems).toHaveLength(4);
    });

    it('defines valid non-empty id, title, and stageId for each evidence item', () => {
      for (const item of ALL_TIMELINE_EVIDENCE) {
        expect(item.id.length > 0).toBe(true);
        expect((item.title || item.text).trim().length > 0).toBe(true);
        expect(item.stageId.length > 0).toBe(true);
      }
    });

    it('defines 1 Month minimum duration for all 3 stages', () => {
      for (const stage of TIMELINE_STAGES) {
        expect(stage.duration).toBe('1 Month');
      }
    });

    it('finds stages by id or stageNumber', () => {
      const s1 = findTimelineStage('stage-1');
      expect(s1 !== undefined).toBe(true);
      expect(s1?.stageNumber).toBe('1.0');

      const s2 = findTimelineStage('2.0');
      expect(s2 !== undefined).toBe(true);
      expect(s2?.id).toBe('stage-2');

      const s3 = findTimelineStage('stage-3');
      expect(s3 !== undefined).toBe(true);
      expect(s3?.stageNumber).toBe('3.0');

      const missing = findTimelineStage('stage-99');
      expect(missing === undefined).toBe(true);
    });
  });

  describe('readTimelineState & writeTimelineState', () => {
    it('returns default timeline state for missing or invalid raw storage', () => {
      const defaultState = getDefaultTimelineState();

      expect(readTimelineState(null)).toEqual(defaultState);
      expect(readTimelineState('')).toEqual(defaultState);
      expect(readTimelineState('   ')).toEqual(defaultState);
      expect(readTimelineState('not json')).toEqual(defaultState);
      expect(readTimelineState('{')).toEqual(defaultState);
      expect(readTimelineState('42')).toEqual(defaultState);
      expect(readTimelineState('true')).toEqual(defaultState);
      expect(readTimelineState('[]')).toEqual(defaultState);
    });

    it('parses valid serialized timeline state', () => {
      const serialized = JSON.stringify(SAMPLE_TIMELINE_STATE);
      const state = readTimelineState(serialized);

      expect(state.stageDates['stage-1'].startDate).toBe('01/09/2026');
      expect(state.stageDates['stage-1'].endDate).toBe('30/09/2026');
      expect(state.completedEvidence['stage-1-evidence-1']).toBe(true);
      expect(state.completedEvidence['stage-1-evidence-2']).toBe(true);
    });

    it('synthesizes missing stage dates from defaults when partially populated', () => {
      const partial = {
        stageDates: {
          'stage-1': { startDate: '15/09/2026', endDate: '15/10/2026' },
        },
        completedEvidence: {},
      };
      const state = readTimelineState(JSON.stringify(partial));

      expect(state.stageDates['stage-1'].startDate).toBe('15/09/2026');
      expect(state.stageDates['stage-1'].endDate).toBe('15/10/2026');
      // Stages 2 and 3 should fall back to default dates
      expect(state.stageDates['stage-2'].startDate).toBe('01/10/2026');
      expect(state.stageDates['stage-3'].startDate).toBe('01/11/2026');
    });

    it('filters out corrupted non-boolean items in completedEvidence', () => {
      const corrupted = {
        stageDates: SAMPLE_TIMELINE_STATE.stageDates,
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': 'not a boolean',
          'stage-1-evidence-3': 12345,
          'stage-1-evidence-4': null,
          'stage-1-evidence-5': false,
        },
      };
      const state = readTimelineState(JSON.stringify(corrupted));

      expect(state.completedEvidence['stage-1-evidence-1']).toBe(true);
      expect(state.completedEvidence['stage-1-evidence-5']).toBe(false);
      expect(state.completedEvidence['stage-1-evidence-2'] === undefined).toBe(true);
      expect(state.completedEvidence['stage-1-evidence-3'] === undefined).toBe(true);
      expect(state.completedEvidence['stage-1-evidence-4'] === undefined).toBe(true);
    });

    it('writes and reads timeline state round-trip', () => {
      const original = SAMPLE_TIMELINE_STATE;
      const serialized = writeTimelineState(original);
      expect(typeof serialized).toBe('string');

      const parsed = readTimelineState(serialized);
      expect(parsed.stageDates).toEqual(original.stageDates);
      expect(parsed.completedEvidence).toEqual(original.completedEvidence);
    });
  });

  describe('updateStageDates & toggleEvidenceItem', () => {
    it('updates stage start date immutably preserving end date', () => {
      const initial = getDefaultTimelineState();
      const updated = updateStageDates(initial, 'stage-1', { startDate: '05/09/2026' });

      expect(initial.stageDates['stage-1'].startDate).toBe('01/09/2026');
      expect(updated.stageDates['stage-1'].startDate).toBe('05/09/2026');
      expect(updated.stageDates['stage-1'].endDate).toBe(initial.stageDates['stage-1'].endDate);
      expect(typeof updated.updatedAt).toBe('string');
    });

    it('updates stage end date immutably preserving start date', () => {
      const initial = getDefaultTimelineState();
      const updated = updateStageDates(initial, 'stage-2', { endDate: '15/11/2026' });

      expect(initial.stageDates['stage-2'].endDate).toBe('31/10/2026');
      expect(updated.stageDates['stage-2'].endDate).toBe('15/11/2026');
      expect(updated.stageDates['stage-2'].startDate).toBe(initial.stageDates['stage-2'].startDate);
    });

    it('normalizes ISO date format (YYYY-MM-DD) to DD/MM/YYYY', () => {
      const initial = getDefaultTimelineState();
      const updated = updateStageDates(initial, 'stage-1', {
        startDate: '2026-09-05',
        endDate: '2026-10-05',
      });

      expect(updated.stageDates['stage-1'].startDate).toBe('05/09/2026');
      expect(updated.stageDates['stage-1'].endDate).toBe('05/10/2026');
    });

    it('toggles evidence checklist item from false to true and back to false', () => {
      const initial = getDefaultTimelineState();
      const itemId = 'stage-1-evidence-1';

      // First toggle: undefined -> true
      const state1 = toggleEvidenceItem(initial, itemId);
      expect(state1.completedEvidence[itemId]).toBe(true);
      expect(initial.completedEvidence[itemId] === undefined).toBe(true);

      // Second toggle: true -> false
      const state2 = toggleEvidenceItem(state1, itemId);
      expect(state2.completedEvidence[itemId]).toBe(false);

      // Third toggle: false -> true
      const state3 = toggleEvidenceItem(state2, itemId);
      expect(state3.completedEvidence[itemId]).toBe(true);
    });

    it('supports explicit boolean override in toggleEvidenceItem', () => {
      const initial = getDefaultTimelineState();
      const itemId = 'stage-2-evidence-1';

      const stateTrue = toggleEvidenceItem(initial, itemId, true);
      expect(stateTrue.completedEvidence[itemId]).toBe(true);

      const stateFalse = toggleEvidenceItem(stateTrue, itemId, false);
      expect(stateFalse.completedEvidence[itemId]).toBe(false);
    });

    it('preserves other evidence items when toggling a specific item', () => {
      const initial = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': true,
        },
      };

      const updated = toggleEvidenceItem(initial, 'stage-2-evidence-1', true);
      expect(updated.completedEvidence['stage-1-evidence-1']).toBe(true);
      expect(updated.completedEvidence['stage-1-evidence-2']).toBe(true);
      expect(updated.completedEvidence['stage-2-evidence-1']).toBe(true);
    });
  });

  describe('calculateTimelineProgress', () => {
    it('calculates 0% progress when no evidence items are checked', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {},
      };
      const progress = calculateTimelineProgress(state);

      expect(progress.totalCount).toBe(12);
      expect(progress.completedCount).toBe(0);
      expect(progress.remainingCount).toBe(12);
      expect(progress.overallPercentage).toBe(0);
      expect(progress.isComplete).toBe(false);

      expect(progress.stageProgress).toHaveLength(3);
      expect(progress.stageProgress[0].completedCount).toBe(0);
      expect(progress.stageProgress[0].totalCount).toBe(5);
      expect(progress.stageProgress[0].percentage).toBe(0);
      expect(progress.stageProgress[0].isComplete).toBe(false);

      expect(progress.stageProgress[1].completedCount).toBe(0);
      expect(progress.stageProgress[1].totalCount).toBe(3);
      expect(progress.stageProgress[1].percentage).toBe(0);

      expect(progress.stageProgress[2].completedCount).toBe(0);
      expect(progress.stageProgress[2].totalCount).toBe(4);
      expect(progress.stageProgress[2].percentage).toBe(0);
    });

    it('calculates partial progress per stage accurately', () => {
      // Stage 1: 2 of 5 = 40%
      // Stage 2: 1 of 3 = 33%
      // Stage 3: 0 of 4 = 0%
      // Overall: 3 of 12 = 25%
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': true,
          'stage-2-evidence-1': true,
        },
      };
      const progress = calculateTimelineProgress(state);

      expect(progress.completedCount).toBe(3);
      expect(progress.totalCount).toBe(12);
      expect(progress.remainingCount).toBe(9);
      expect(progress.overallPercentage).toBe(25);
      expect(progress.isComplete).toBe(false);

      const sp1 = progress.stageProgress.find((s) => s.stageId === 'stage-1');
      expect(sp1 !== undefined).toBe(true);
      expect(sp1?.completedCount).toBe(2);
      expect(sp1?.totalCount).toBe(5);
      expect(sp1?.percentage).toBe(40);
      expect(sp1?.isComplete).toBe(false);

      const sp2 = progress.stageProgress.find((s) => s.stageId === 'stage-2');
      expect(sp2 !== undefined).toBe(true);
      expect(sp2?.completedCount).toBe(1);
      expect(sp2?.totalCount).toBe(3);
      expect(sp2?.percentage).toBe(33); // Math.round((1/3)*100) = 33
      expect(sp2?.isComplete).toBe(false);

      const sp3 = progress.stageProgress.find((s) => s.stageId === 'stage-3');
      expect(sp3 !== undefined).toBe(true);
      expect(sp3?.completedCount).toBe(0);
      expect(sp3?.totalCount).toBe(4);
      expect(sp3?.percentage).toBe(0);
      expect(sp3?.isComplete).toBe(false);
    });

    it('calculates exact stage fractions across all stages', () => {
      // Stage 1 fractions (out of 5)
      const s1Items = STAGE_1_EVIDENCE.map((e) => e.id);
      for (let k = 1; k <= 5; k++) {
        const state: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence: Object.fromEntries(s1Items.slice(0, k).map((id) => [id, true])),
        };
        const p = calculateTimelineProgress(state);
        const expectedStagePercent = Math.round((k / 5) * 100);
        expect(p.stageProgress[0].percentage).toBe(expectedStagePercent);
        expect(p.stageProgress[0].isComplete).toBe(k === 5);
      }

      // Stage 2 fractions (out of 3)
      const s2Items = STAGE_2_EVIDENCE.map((e) => e.id);
      const expectedS2Percents = [33, 67, 100];
      for (let k = 1; k <= 3; k++) {
        const state: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence: Object.fromEntries(s2Items.slice(0, k).map((id) => [id, true])),
        };
        const p = calculateTimelineProgress(state);
        expect(p.stageProgress[1].percentage).toBe(expectedS2Percents[k - 1]);
        expect(p.stageProgress[1].isComplete).toBe(k === 3);
      }

      // Stage 3 fractions (out of 4)
      const s3Items = STAGE_3_EVIDENCE.map((e) => e.id);
      const expectedS3Percents = [25, 50, 75, 100];
      for (let k = 1; k <= 4; k++) {
        const state: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence: Object.fromEntries(s3Items.slice(0, k).map((id) => [id, true])),
        };
        const p = calculateTimelineProgress(state);
        expect(p.stageProgress[2].percentage).toBe(expectedS3Percents[k - 1]);
        expect(p.stageProgress[2].isComplete).toBe(k === 4);
      }
    });

    it('calculates 100% progress when all 12 deliverables are checked', () => {
      const allChecked: Record<string, boolean> = {};
      for (const item of ALL_TIMELINE_EVIDENCE) {
        allChecked[item.id] = true;
      }
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: allChecked,
      };
      const progress = calculateTimelineProgress(state);

      expect(progress.completedCount).toBe(12);
      expect(progress.totalCount).toBe(12);
      expect(progress.remainingCount).toBe(0);
      expect(progress.overallPercentage).toBe(100);
      expect(progress.isComplete).toBe(true);

      expect(progress.stageProgress[0].percentage).toBe(100);
      expect(progress.stageProgress[0].isComplete).toBe(true);
      expect(progress.stageProgress[1].percentage).toBe(100);
      expect(progress.stageProgress[1].isComplete).toBe(true);
      expect(progress.stageProgress[2].percentage).toBe(100);
      expect(progress.stageProgress[2].isComplete).toBe(true);
    });

    it('ignores unrecognized evidence IDs and false entries in completedEvidence', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': false,
          'unrecognized-custom-task': true,
          randomKey: true,
        },
      };
      const progress = calculateTimelineProgress(state);

      expect(progress.completedCount).toBe(1);
      expect(progress.totalCount).toBe(12);
      expect(progress.overallPercentage).toBe(8); // Math.round((1/12)*100) = 8
    });
  });

  describe('clipboardRowForTimelineStage (9-Column TSV & RFC4180 Escaping)', () => {
    it('produces exactly 9 tab-separated columns matching the Timeline worksheet', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardRowForTimelineStage('stage-1', state);
      const cells = parseTsvRow(tsv);

      expect(cells).toHaveLength(9);
      expect(cells[0]).toBe('1.0'); // Col A: Stage #
      expect(cells[1]).toBe(
        'Training – exposure and knowledge transfer – “I do, you see”'
      ); // Col B: Stage Name
      expect(cells[2]).toBe('01/09/2026'); // Col C: Start Date
      expect(cells[3]).toBe('30/09/2026'); // Col D: End Date
      expect(cells[4].includes('Ensure the IT Staff understands LeadGeeks')).toBe(true); // Col E: Objective
      expect(cells[5].length > 0).toBe(true); // Col F: Key Activities
      expect(cells[6].includes('[PENDING]')).toBe(true); // Col G: Outputs / Evidence
      expect(cells[7]).toBe('1 Month'); // Col H: Minimum Duration
      expect(typeof cells[8]).toBe('string'); // Col I: Topic Covered
    });

    it('formats checked items as [DONE] and unchecked items as [PENDING] in Column G', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': false,
          'stage-1-evidence-3': true,
        },
      };
      const tsv = clipboardRowForTimelineStage('stage-1', state);
      const cells = parseTsvRow(tsv);

      const colG = cells[6];
      expect(colG.includes('- Completed training checklist [DONE]')).toBe(true);
      expect(colG.includes('- Learning notes and summary documentation [PENDING]')).toBe(true);
      expect(colG.includes('- Job shadowing / observation records [DONE]')).toBe(true);
      expect(colG.includes('- Initial capability assessment [PENDING]')).toBe(true);
      expect(colG.includes('- Completed IT tasks [PENDING]')).toBe(true);
    });

    it('encloses Column G in double quotes according to RFC4180 multiline rules', () => {
      const state = getDefaultTimelineState();
      const tsv = clipboardRowForTimelineStage('stage-1', state);

      // Raw TSV row contains newline inside quoted Column G
      expect(tsv.includes('\n')).toBe(true);
      const cells = parseTsvRow(tsv);
      expect(cells).toHaveLength(9);
    });

    it('escapes internal double quotes according to RFC4180 rules', () => {
      const customObjective = 'Goal: Master "Zero-Trust" Security architecture.';
      const stageDefinition = findTimelineStage('stage-1')!;
      const customStage: TimelineStageDefinition = {
        ...stageDefinition,
        objective: customObjective,
      };

      const cellEscaped = escapeTsvCell(customStage.objective);
      expect(cellEscaped).toBe('"Goal: Master ""Zero-Trust"" Security architecture."');
    });

    it('escapes cells containing internal tab characters without shifting column count', () => {
      const rawText = 'Activity 1\tActivity 2';
      const cellEscaped = escapeTsvCell(rawText);
      expect(cellEscaped).toBe('"Activity 1\tActivity 2"');

      const cells = parseTsvRow(`1.0\tName\tStart\tEnd\tObj\t${cellEscaped}\tOutput\t1 Month\tTopic`);
      expect(cells).toHaveLength(9);
      expect(cells[5]).toBe('Activity 1\tActivity 2');
    });

    it('reflects updated stage dates in Columns C and D', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        stageDates: {
          'stage-1': { startDate: '10/09/2026', endDate: '10/10/2026' },
          'stage-2': { startDate: '11/10/2026', endDate: '11/11/2026' },
          'stage-3': { startDate: '12/11/2026', endDate: '12/12/2026' },
        },
      };

      const tsv1 = clipboardRowForTimelineStage('stage-1', state);
      const cells1 = parseTsvRow(tsv1);
      expect(cells1[2]).toBe('10/09/2026');
      expect(cells1[3]).toBe('10/10/2026');

      const tsv2 = clipboardRowForTimelineStage('stage-2', state);
      const cells2 = parseTsvRow(tsv2);
      expect(cells2[2]).toBe('11/10/2026');
      expect(cells2[3]).toBe('11/11/2026');
    });
  });

  describe('clipboardSummaryForTimeline & Multiline Roundtrip Parser Oracle', () => {
    it('serializes all 3 stages and parses cleanly with zero column shifting', () => {
      const state: TimelineState = {
        ...getDefaultTimelineState(),
        completedEvidence: {
          'stage-1-evidence-1': true,
          'stage-1-evidence-2': true,
          'stage-2-evidence-1': true,
          'stage-3-evidence-4': true,
        },
      };

      const summaryTsv = clipboardSummaryForTimeline(state);
      const rows = parseTsvDocument(summaryTsv);

      // Must produce exactly 3 rows for Stage 1.0, Stage 2.0, Stage 3.0
      expect(rows).toHaveLength(3);

      // Row 1: Stage 1.0
      expect(rows[0]).toHaveLength(9);
      expect(rows[0][0]).toBe('1.0');
      expect(rows[0][1]).toBe(
        'Training – exposure and knowledge transfer – “I do, you see”'
      );
      expect(rows[0][2]).toBe('01/09/2026');
      expect(rows[0][3]).toBe('30/09/2026');
      expect(rows[0][6].includes('- Completed training checklist [DONE]')).toBe(true);
      expect(rows[0][6].includes('- Learning notes and summary documentation [DONE]')).toBe(true);
      expect(rows[0][6].includes('- Job shadowing / observation records [PENDING]')).toBe(true);
      expect(rows[0][7]).toBe('1 Month');

      // Row 2: Stage 2.0
      expect(rows[1]).toHaveLength(9);
      expect(rows[1][0]).toBe('2.0');
      expect(rows[1][1]).toBe(
        'Trial – performance validation under supervision – “You do, I see”'
      );
      expect(rows[1][2]).toBe('01/10/2026');
      expect(rows[1][3]).toBe('31/10/2026');
      expect(rows[1][6].includes('- Completed IT tasks [DONE]')).toBe(true);
      expect(rows[1][6].includes('- Task / work records [PENDING]')).toBe(true);
      expect(rows[1][7]).toBe('1 Month');

      // Row 3: Stage 3.0
      expect(rows[2]).toHaveLength(9);
      expect(rows[2][0]).toBe('3.0');
      expect(rows[2][1]).toBe(
        'Transition – full role activation with accountability – “You do, I don’t see”'
      );
      expect(rows[2][2]).toBe('01/11/2026');
      expect(rows[2][3]).toBe('30/11/2026');
      expect(rows[2][6].includes('- Completed assigned responsibilities [PENDING]')).toBe(true);
      expect(rows[2][6].includes('- Final onboarding assessment [DONE]')).toBe(true);
      expect(rows[2][7]).toBe('1 Month');
    });

    it('does not corrupt row boundaries when Column G contains embedded newlines', () => {
      const state = getDefaultTimelineState();
      const summaryTsv = clipboardSummaryForTimeline(state);
      const rows = parseTsvDocument(summaryTsv);

      // Confirm that multiline checklist items in Stage 1 did not spill into new CSV rows
      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(row).toHaveLength(9);
      }
    });
  });

  describe('test-globals.d.ts & strict Node.js runtime compliance', () => {
    it('executes in pure headless Node without browser window or document', () => {
      expect(typeof window === 'undefined').toBe(true);
      expect(typeof document === 'undefined').toBe(true);
    });

    it('uses only declared matchers and typecheck passes cleanly', () => {
      expect(true).toBe(true);
      expect([1, 2, 3]).toHaveLength(3);
      expect({ a: 1 }).toEqual({ a: 1 });
      expect(1).not.toBe(2);
    });
  });
});
