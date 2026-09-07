import {
  ALL_TIMELINE_EVIDENCE,
  STAGE_1_EVIDENCE,
  STAGE_2_EVIDENCE,
  STAGE_3_EVIDENCE,
  TIMELINE_STAGES,
  TIMELINE_STORAGE_KEY,
  calculateStageProgress,
  calculateTimelineProgress,
  formatTimelineDateForInput,
  formatTimelineDateForSheet,
  getDefaultStageDates,
  getDefaultTimelineState,
  isTimelineState,
  normalizeTimelineDate,
  readTimelineState,
  writeTimelineState,
} from './timeline';
import type { TimelineState } from './types/timeline';

describe('Empirical Challenge: Milestone 3 Domain Logic & Storage (lib/timeline)', () => {
  // =========================================================================
  // SCOPE 1: calculateTimelineProgress & calculateStageProgress
  // =========================================================================
  describe('Scope 1: Progress Calculations', () => {
    describe('1.1: 0% Progress (0 items checked)', () => {
      it('calculates 0% overall progress and 0% for every stage when completedEvidence is empty', () => {
        const state: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence: {},
        };

        const overall = calculateTimelineProgress(state);

        expect(overall.overallPercentage).toBe(0);
        expect(overall.percentage).toBe(0);
        expect(overall.completedCount).toBe(0);
        expect(overall.completedDeliverables).toBe(0);
        expect(overall.totalCount).toBe(12);
        expect(overall.totalDeliverables).toBe(12);
        expect(overall.remainingCount).toBe(12);
        expect(overall.isComplete).toBe(false);

        // Verify all 3 stages individually via overall.stageProgress
        expect(overall.stageProgress).toHaveLength(3);
        const [sp1, sp2, sp3] = overall.stageProgress;

        expect(sp1.percentage).toBe(0);
        expect(sp1.completed).toBe(0);
        expect(sp1.total).toBe(5);
        expect(sp1.remainingCount).toBe(5);
        expect(sp1.isComplete).toBe(false);

        expect(sp2.percentage).toBe(0);
        expect(sp2.completed).toBe(0);
        expect(sp2.total).toBe(3);
        expect(sp2.remainingCount).toBe(3);
        expect(sp2.isComplete).toBe(false);

        expect(sp3.percentage).toBe(0);
        expect(sp3.completed).toBe(0);
        expect(sp3.total).toBe(4);
        expect(sp3.remainingCount).toBe(4);
        expect(sp3.isComplete).toBe(false);
      });

      it('calculates 0% when completedEvidence contains all false values', () => {
        const completedEvidence: Record<string, boolean> = {};
        for (const item of ALL_TIMELINE_EVIDENCE) {
          completedEvidence[item.id] = false;
        }

        const state: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence,
        };

        const overall = calculateTimelineProgress(state);
        expect(overall.overallPercentage).toBe(0);
        expect(overall.completedCount).toBe(0);
        expect(overall.isComplete).toBe(false);

        for (const stage of TIMELINE_STAGES) {
          const sp = calculateStageProgress(stage, state);
          expect(sp.percentage).toBe(0);
          expect(sp.completed).toBe(0);
          expect(sp.isComplete).toBe(false);
        }
      });

      it('calculates 0% when called directly via calculateStageProgress with empty record', () => {
        for (const stage of TIMELINE_STAGES) {
          const sp = calculateStageProgress(stage, {});
          expect(sp.percentage).toBe(0);
          expect(sp.completedCount).toBe(0);
          expect(sp.isComplete).toBe(false);
          expect(sp.completedItemIds).toEqual([]);
          expect(sp.evidenceStatuses).toHaveLength(stage.deliverables.length);
          for (const status of sp.evidenceStatuses!) {
            expect(status.completed).toBe(false);
          }
        }
      });
    });

    describe('1.2: Exact Stage Fractions', () => {
      it('verifies Stage 1.0 exact fractions: 1/5=20%, 2/5=40%, 3/5=60%, 4/5=80%, 5/5=100%', () => {
        const stage1 = TIMELINE_STAGES[0];
        expect(stage1.stageNumber).toBe('1.0');
        expect(stage1.deliverables).toHaveLength(5);

        const expectedPercentages = [20, 40, 60, 80, 100];
        const s1Ids = stage1.deliverables.map((d) => d.id);

        for (let k = 1; k <= 5; k++) {
          const activeIds = s1Ids.slice(0, k);
          const evidenceMap = Object.fromEntries(activeIds.map((id) => [id, true]));

          const sp = calculateStageProgress(stage1, evidenceMap);

          expect(sp.completed).toBe(k);
          expect(sp.total).toBe(5);
          expect(sp.percentage).toBe(expectedPercentages[k - 1]);
          expect(sp.remainingCount).toBe(5 - k);
          expect(sp.isComplete).toBe(k === 5);
          expect(sp.completedItemIds).toEqual(activeIds);
        }
      });

      it('verifies Stage 2.0 exact fractions: 1/3=33%, 2/3=67%, 3/3=100%', () => {
        const stage2 = TIMELINE_STAGES[1];
        expect(stage2.stageNumber).toBe('2.0');
        expect(stage2.deliverables).toHaveLength(3);

        const expectedPercentages = [33, 67, 100]; // Math.round((1/3)*100)=33, Math.round((2/3)*100)=67
        const s2Ids = stage2.deliverables.map((d) => d.id);

        for (let k = 1; k <= 3; k++) {
          const activeIds = s2Ids.slice(0, k);
          const evidenceMap = Object.fromEntries(activeIds.map((id) => [id, true]));

          const sp = calculateStageProgress(stage2, evidenceMap);

          expect(sp.completed).toBe(k);
          expect(sp.total).toBe(3);
          expect(sp.percentage).toBe(expectedPercentages[k - 1]);
          expect(sp.remainingCount).toBe(3 - k);
          expect(sp.isComplete).toBe(k === 3);
          expect(sp.completedItemIds).toEqual(activeIds);
        }
      });

      it('verifies Stage 3.0 exact fractions: 1/4=25%, 2/4=50%, 3/4=75%, 4/4=100%', () => {
        const stage3 = TIMELINE_STAGES[2];
        expect(stage3.stageNumber).toBe('3.0');
        expect(stage3.deliverables).toHaveLength(4);

        const expectedPercentages = [25, 50, 75, 100];
        const s3Ids = stage3.deliverables.map((d) => d.id);

        for (let k = 1; k <= 4; k++) {
          const activeIds = s3Ids.slice(0, k);
          const evidenceMap = Object.fromEntries(activeIds.map((id) => [id, true]));

          const sp = calculateStageProgress(stage3, evidenceMap);

          expect(sp.completed).toBe(k);
          expect(sp.total).toBe(4);
          expect(sp.percentage).toBe(expectedPercentages[k - 1]);
          expect(sp.remainingCount).toBe(4 - k);
          expect(sp.isComplete).toBe(k === 4);
          expect(sp.completedItemIds).toEqual(activeIds);
        }
      });
    });

    describe('1.3: Overall Progress for All Values 0 Through 12', () => {
      const expectedOverallPercentages = [
        0,   //  0/12 = 0.00% -> 0
        8,   //  1/12 = 8.33% -> 8
        17,  //  2/12 = 16.67% -> 17
        25,  //  3/12 = 25.00% -> 25
        33,  //  4/12 = 33.33% -> 33
        42,  //  5/12 = 41.67% -> 42
        50,  //  6/12 = 50.00% -> 50
        58,  //  7/12 = 58.33% -> 58
        67,  //  8/12 = 66.67% -> 67
        75,  //  9/12 = 75.00% -> 75
        83,  // 10/12 = 83.33% -> 83
        92,  // 11/12 = 91.67% -> 92
        100, // 12/12 = 100.0% -> 100
      ];

      it('strictly matches expected rounded percentage for each count k in 0..12', () => {
        expect(ALL_TIMELINE_EVIDENCE).toHaveLength(12);

        for (let k = 0; k <= 12; k++) {
          const activeItems = ALL_TIMELINE_EVIDENCE.slice(0, k);
          const completedEvidence: Record<string, boolean> = {};
          for (const item of activeItems) {
            completedEvidence[item.id] = true;
          }

          const state: TimelineState = {
            ...getDefaultTimelineState(),
            completedEvidence,
          };

          const progress = calculateTimelineProgress(state);

          expect(progress.completedCount).toBe(k);
          expect(progress.completedDeliverables).toBe(k);
          expect(progress.totalCount).toBe(12);
          expect(progress.totalDeliverables).toBe(12);
          expect(progress.remainingCount).toBe(12 - k);
          expect(progress.overallPercentage).toBe(expectedOverallPercentages[k]);
          expect(progress.percentage).toBe(expectedOverallPercentages[k]);
          expect(progress.isComplete).toBe(k === 12);
        }
      });

      it('handles order-independent permutations of checked evidence items for overall progress', () => {
        // Checking items in reverse order (stage 3 then stage 2 then stage 1)
        const reversedItems = [...ALL_TIMELINE_EVIDENCE].reverse();

        for (let k = 0; k <= 12; k++) {
          const activeItems = reversedItems.slice(0, k);
          const completedEvidence: Record<string, boolean> = {};
          for (const item of activeItems) {
            completedEvidence[item.id] = true;
          }

          const state: TimelineState = {
            ...getDefaultTimelineState(),
            completedEvidence,
          };

          const progress = calculateTimelineProgress(state);

          expect(progress.completedCount).toBe(k);
          expect(progress.overallPercentage).toBe(expectedOverallPercentages[k]);
          expect(progress.isComplete).toBe(k === 12);
        }
      });
    });

    describe('1.4: Dual Indexing & Lookup of Stage Progress', () => {
      it('allows accessing stageProgress by numeric index (0, 1, 2) and string keys ("stage-1", "1.0")', () => {
        const state = getDefaultTimelineState();
        const progress = calculateTimelineProgress(state);

        // Numeric indexing
        expect(progress.stageProgress[0].stageNumber).toBe('1.0');
        expect(progress.stageProgress[1].stageNumber).toBe('2.0');
        expect(progress.stageProgress[2].stageNumber).toBe('3.0');

        // Key-based indexing
        expect(progress.stageProgress['stage-1'].stageNumber).toBe('1.0');
        expect(progress.stageProgress['1.0'].stageId).toBe('stage-1');
        expect(progress.stageProgress['stage-2'].stageNumber).toBe('2.0');
        expect(progress.stageProgress['2.0'].stageId).toBe('stage-2');
        expect(progress.stageProgress['stage-3'].stageNumber).toBe('3.0');
        expect(progress.stageProgress['3.0'].stageId).toBe('stage-3');

        // stageProgresses map
        expect(progress.stageProgresses!['stage-1'].total).toBe(5);
        expect(progress.stageProgresses!['2.0'].total).toBe(3);
        expect(progress.stageProgresses!['3.0'].total).toBe(4);
      });
    });

    describe('1.5: Adversarial Inputs to Progress Calculations', () => {
      it('ignores unknown IDs, non-boolean values, and prototype keys', () => {
        const state: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence: {
            'stage-1-evidence-1': true,
            'fake-id-1': true,
            'another-unknown-id': true,
            'stage-1-evidence-2': false,
            'stage-1-evidence-3': 'true' as any,
            'stage-1-evidence-4': 1 as any,
            'stage-1-evidence-5': null as any,
          },
        };

        const progress = calculateTimelineProgress(state);

        // Only 'stage-1-evidence-1' is valid and true
        expect(progress.completedCount).toBe(1);
        expect(progress.overallPercentage).toBe(8); // 1/12 = 8%

        const sp1 = progress.stageProgress[0];
        expect(sp1.completed).toBe(1);
        expect(sp1.percentage).toBe(20); // 1/5 = 20%
        expect(sp1.completedItemIds).toEqual(['stage-1-evidence-1']);
      });

      it('isolates stage progress: checking Stage 2 items does NOT inflate Stage 1 or Stage 3 progress', () => {
        const state: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence: {
            'stage-2-evidence-1': true,
            'stage-2-evidence-2': true,
            'stage-2-evidence-3': true,
          },
        };

        const progress = calculateTimelineProgress(state);

        expect(progress.stageProgress[0].completed).toBe(0);
        expect(progress.stageProgress[0].percentage).toBe(0);

        expect(progress.stageProgress[1].completed).toBe(3);
        expect(progress.stageProgress[1].percentage).toBe(100);
        expect(progress.stageProgress[1].isComplete).toBe(true);

        expect(progress.stageProgress[2].completed).toBe(0);
        expect(progress.stageProgress[2].percentage).toBe(0);

        expect(progress.completedCount).toBe(3);
        expect(progress.overallPercentage).toBe(25); // 3/12 = 25%
      });

      it('handles null / undefined / empty options in calculateTimelineProgress gracefully', () => {
        const state = getDefaultTimelineState();

        const pDefault = calculateTimelineProgress(state);
        expect(pDefault.totalDays).toBe(90);
        expect(pDefault.currentDay).toBe(undefined);
        expect(pDefault.timePercentage).toBe(undefined);

        const pWithDate = calculateTimelineProgress(state, {
          currentDate: '2026-09-15',
          journeyStart: '2026-09-01',
          totalDays: 90,
        });
        expect(pWithDate.currentDay).toBe(15);
        expect(pWithDate.timePercentage).toBe(17); // 15/90 = 16.67% -> 17%

        // Invalid date string does not throw and leaves currentDay undefined
        const pInvalidDate = calculateTimelineProgress(state, {
          currentDate: 'not-a-valid-date',
        });
        expect(pInvalidDate.currentDay).toBe(undefined);
        expect(pInvalidDate.timePercentage).toBe(undefined);

        // Date before start clamps to 1
        const pBeforeStart = calculateTimelineProgress(state, {
          currentDate: '2026-08-15',
          journeyStart: '2026-09-01',
        });
        expect(pBeforeStart.currentDay).toBe(1);

        // Date after totalDays clamps to totalDays
        const pFarFuture = calculateTimelineProgress(state, {
          currentDate: '2027-01-01',
          journeyStart: '2026-09-01',
          totalDays: 90,
        });
        expect(pFarFuture.currentDay).toBe(90);
        expect(pFarFuture.timePercentage).toBe(100);
      });
    });
  });

  // =========================================================================
  // SCOPE 2: readTimelineState & writeTimelineState
  // =========================================================================
  describe('Scope 2: State Storage, Sanitization & Fallback', () => {
    describe('2.1: Corrupted & Malformed Inputs Fallback to Default State', () => {
      const defaultState = getDefaultTimelineState();

      it('returns default state for null, undefined, empty, and whitespace strings', () => {
        expect(readTimelineState(null)).toEqual(defaultState);
        expect(readTimelineState(undefined as any)).toEqual(defaultState);
        expect(readTimelineState('')).toEqual(defaultState);
        expect(readTimelineState('   ')).toEqual(defaultState);
        expect(readTimelineState('\t\n  ')).toEqual(defaultState);
      });

      it('returns default state for JSON primitives (number, boolean, string, array)', () => {
        expect(readTimelineState('12345')).toEqual(defaultState);
        expect(readTimelineState('true')).toEqual(defaultState);
        expect(readTimelineState('false')).toEqual(defaultState);
        expect(readTimelineState('"some string"')).toEqual(defaultState);
        expect(readTimelineState('[]')).toEqual(defaultState);
        expect(readTimelineState('[1, 2, 3]')).toEqual(defaultState);
      });

      it('returns default state for empty object or invalid JSON syntax', () => {
        expect(readTimelineState('{}')).toEqual(defaultState);
        expect(readTimelineState('{"randomKey": 42}')).toEqual(defaultState);
        expect(readTimelineState('{')).toEqual(defaultState);
        expect(readTimelineState('{"stageDates": }')).toEqual(defaultState);
        expect(readTimelineState('undefined')).toEqual(defaultState);
        expect(readTimelineState('null')).toEqual(defaultState);
      });

      it('validates shape boundary via isTimelineState', () => {
        expect(isTimelineState(null)).toBe(false);
        expect(isTimelineState(undefined)).toBe(false);
        expect(isTimelineState('string')).toBe(false);
        expect(isTimelineState(123)).toBe(false);
        expect(isTimelineState([])).toBe(false);
        expect(isTimelineState({})).toBe(false);
        expect(isTimelineState({ foo: 'bar' })).toBe(false);
        expect(isTimelineState({ stages: {} })).toBe(true);
        expect(isTimelineState({ stageDates: {} })).toBe(true);
      });
    });

    describe('2.2: Non-Boolean Checklist Values Sanitization', () => {
      it('strips string, number, null, object, and array values from completedEvidence', () => {
        const payload = {
          stageDates: getDefaultStageDates(),
          completedEvidence: {
            'stage-1-evidence-1': true,
            'stage-1-evidence-2': 'true', // string -> should be discarded
            'stage-1-evidence-3': 1,      // number -> should be discarded
            'stage-1-evidence-4': null,   // null -> should be discarded
            'stage-1-evidence-5': false,  // boolean false -> preserved
            'stage-2-evidence-1': {},     // object -> should be discarded
            'stage-2-evidence-2': [],     // array -> should be discarded
            'stage-2-evidence-3': undefined, // undefined -> discarded
          },
        };

        const state = readTimelineState(JSON.stringify(payload));

        expect(state.completedEvidence['stage-1-evidence-1']).toBe(true);
        expect(state.completedEvidence['stage-1-evidence-5']).toBe(false);
        expect('stage-1-evidence-2' in state.completedEvidence).toBe(false);
        expect('stage-1-evidence-3' in state.completedEvidence).toBe(false);
        expect('stage-1-evidence-4' in state.completedEvidence).toBe(false);
        expect('stage-2-evidence-1' in state.completedEvidence).toBe(false);
        expect('stage-2-evidence-2' in state.completedEvidence).toBe(false);
        expect('stage-2-evidence-3' in state.completedEvidence).toBe(false);
      });
    });

    describe('2.3: Stage Date Sanitization & Canonical Pair Synchronization', () => {
      it('preserves valid custom dates for stage-1 and propagates to 1.0', () => {
        const payload = {
          stageDates: {
            'stage-1': { startDate: '10/09/2026', endDate: '25/09/2026' },
          },
        };

        const state = readTimelineState(JSON.stringify(payload));

        expect(state.stageDates['stage-1'].startDate).toBe('10/09/2026');
        expect(state.stageDates['stage-1'].endDate).toBe('25/09/2026');
        expect(state.stageDates['1.0'].startDate).toBe('10/09/2026');
        expect(state.stageDates['1.0'].endDate).toBe('25/09/2026');

        // Other stages fall back to defaults
        expect(state.stageDates['stage-2'].startDate).toBe('01/10/2026');
        expect(state.stageDates['stage-3'].startDate).toBe('01/11/2026');
      });

      it('normalizes ISO dates in storage payload into DD/MM/YYYY', () => {
        const payload = {
          stageDates: {
            'stage-1': { startDate: '2026-09-10', endDate: '2026-09-25' },
            'stage-2': { startDate: '2026-10-05', endDate: '2026-10-31' },
          },
        };

        const state = readTimelineState(JSON.stringify(payload));

        expect(state.stageDates['stage-1'].startDate).toBe('10/09/2026');
        expect(state.stageDates['stage-1'].endDate).toBe('25/09/2026');
        expect(state.stageDates['stage-2'].startDate).toBe('05/10/2026');
        expect(state.stageDates['stage-2'].endDate).toBe('31/10/2026');
      });

      it('empirically examines canonical pair synchronization when keyed by "1.0" instead of "stage-1"', () => {
        const payloadKeyedByNumber = {
          stageDates: {
            '1.0': { startDate: '12/09/2026', endDate: '28/09/2026' },
            '2.0': { startDate: '12/10/2026', endDate: '28/10/2026' },
            '3.0': { startDate: '12/11/2026', endDate: '28/11/2026' },
          },
        };

        const state = readTimelineState(JSON.stringify(payloadKeyedByNumber));

        // Let us verify what readTimelineState produces for '1.0' and 'stage-1'
        // If the code has: stageDates['1.0'] = stageDates['stage-1'] || stageDates['1.0'];
        // where stageDates['stage-1'] defaulted to '01/09/2026', does it overwrite '1.0'?
        const s1Actual = state.stageDates['1.0'];
        const s1StageActual = state.stageDates['stage-1'];

        // Record finding empirically:
        expect(s1Actual.startDate).toBe('12/09/2026');
        expect(s1StageActual.startDate).toBe('12/09/2026');
      });
    });

    describe('2.4: writeTimelineState & Roundtrip Fidelity', () => {
      it('serializes state to a valid JSON string and roundtrips cleanly', () => {
        const original: TimelineState = {
          ...getDefaultTimelineState(),
          completedEvidence: {
            'stage-1-evidence-1': true,
            'stage-2-evidence-2': true,
          },
          stageDates: {
            ...getDefaultStageDates(),
            'stage-1': { startDate: '05/09/2026', endDate: '25/09/2026' },
            '1.0': { startDate: '05/09/2026', endDate: '25/09/2026' },
          },
        };

        const serialized = writeTimelineState(original);
        expect(typeof serialized).toBe('string');
        const parsed = JSON.parse(serialized);
        expect(typeof parsed).toBe('object');

        const hydrated = readTimelineState(serialized);
        expect(hydrated.completedEvidence['stage-1-evidence-1']).toBe(true);
        expect(hydrated.completedEvidence['stage-2-evidence-2']).toBe(true);
        expect(hydrated.stageDates['stage-1'].startDate).toBe('05/09/2026');
        expect(hydrated.stageDates['stage-1'].endDate).toBe('25/09/2026');
      });
    });
  });

  // =========================================================================
  // SCOPE 3: Date Adapters
  // =========================================================================
  describe('Scope 3: Date Adapters', () => {
    describe('3.1: formatTimelineDateForInput (ISO YYYY-MM-DD)', () => {
      it('converts DD/MM/YYYY sheet date string to ISO YYYY-MM-DD', () => {
        expect(formatTimelineDateForInput('01/09/2026')).toBe('2026-09-01');
        expect(formatTimelineDateForInput('30/09/2026')).toBe('2026-09-30');
        expect(formatTimelineDateForInput('31/10/2026')).toBe('2026-10-31');
        expect(formatTimelineDateForInput('15/11/2026')).toBe('2026-11-15');
        expect(formatTimelineDateForInput('29/02/2024')).toBe('2024-02-29'); // Leap year
      });

      it('passes through existing ISO YYYY-MM-DD date strings untouched', () => {
        expect(formatTimelineDateForInput('2026-09-01')).toBe('2026-09-01');
        expect(formatTimelineDateForInput('2026-10-31')).toBe('2026-10-31');
        expect(formatTimelineDateForInput('2024-02-29')).toBe('2024-02-29');
      });

      it('formats native JS Date objects into YYYY-MM-DD', () => {
        const d1 = new Date(2026, 8, 1); // Note: month is 0-indexed (8 = September)
        expect(formatTimelineDateForInput(d1)).toBe('2026-09-01');

        const d2 = new Date(2026, 9, 31); // 9 = October
        expect(formatTimelineDateForInput(d2)).toBe('2026-10-31');

        const d3 = new Date(2026, 11, 25); // 11 = December
        expect(formatTimelineDateForInput(d3)).toBe('2026-12-25');
      });

      it('handles empty, undefined, null, and whitespace inputs by returning empty string', () => {
        expect(formatTimelineDateForInput('')).toBe('');
        expect(formatTimelineDateForInput(undefined)).toBe('');
        expect(formatTimelineDateForInput(null as any)).toBe('');
        expect(formatTimelineDateForInput('   ')).toBe('');
      });
    });

    describe('3.2: formatTimelineDateForSheet (DD/MM/YYYY)', () => {
      it('converts ISO YYYY-MM-DD strings to DD/MM/YYYY sheet format', () => {
        expect(formatTimelineDateForSheet('2026-09-01')).toBe('01/09/2026');
        expect(formatTimelineDateForSheet('2026-09-30')).toBe('30/09/2026');
        expect(formatTimelineDateForSheet('2026-10-31')).toBe('31/10/2026');
        expect(formatTimelineDateForSheet('2026-11-15')).toBe('15/11/2026');
        expect(formatTimelineDateForSheet('2024-02-29')).toBe('29/02/2024'); // Leap year
      });

      it('passes through existing DD/MM/YYYY strings untouched', () => {
        expect(formatTimelineDateForSheet('01/09/2026')).toBe('01/09/2026');
        expect(formatTimelineDateForSheet('30/09/2026')).toBe('30/09/2026');
        expect(formatTimelineDateForSheet('31/10/2026')).toBe('31/10/2026');
      });

      it('formats native JS Date objects into DD/MM/YYYY', () => {
        const d1 = new Date(2026, 8, 1); // 8 = September
        expect(formatTimelineDateForSheet(d1)).toBe('01/09/2026');

        const d2 = new Date(2026, 9, 31); // 9 = October
        expect(formatTimelineDateForSheet(d2)).toBe('31/10/2026');
      });

      it('handles empty, undefined, null, and whitespace inputs by returning empty string', () => {
        expect(formatTimelineDateForSheet('')).toBe('');
        expect(formatTimelineDateForSheet(undefined)).toBe('');
        expect(formatTimelineDateForSheet(null as any)).toBe('');
        expect(formatTimelineDateForSheet('   ')).toBe('');
      });
    });

    describe('3.3: Round-Trip Invertibility & Normalization', () => {
      it('guarantees round-trip between Sheet format (DD/MM/YYYY) and Input format (YYYY-MM-DD)', () => {
        const sampleSheetDates = [
          '01/09/2026',
          '15/09/2026',
          '30/09/2026',
          '01/10/2026',
          '31/10/2026',
          '01/11/2026',
          '30/11/2026',
          '29/02/2024',
          '31/12/2026',
        ];

        for (const sheetDate of sampleSheetDates) {
          const inputDate = formatTimelineDateForInput(sheetDate);
          const backToSheet = formatTimelineDateForSheet(inputDate);
          expect(backToSheet).toBe(sheetDate);
        }

        const sampleIsoDates = [
          '2026-09-01',
          '2026-09-15',
          '2026-09-30',
          '2026-10-01',
          '2026-10-31',
          '2026-11-01',
          '2026-11-30',
          '2024-02-29',
          '2026-12-31',
        ];

        for (const isoDate of sampleIsoDates) {
          const sheetDate = formatTimelineDateForSheet(isoDate);
          const backToInput = formatTimelineDateForInput(sheetDate);
          expect(backToInput).toBe(isoDate);
        }
      });

      it('normalizes arbitrary valid date strings via normalizeTimelineDate', () => {
        expect(normalizeTimelineDate('2026-09-01')).toBe('01/09/2026');
        expect(normalizeTimelineDate('01/09/2026')).toBe('01/09/2026');
        expect(/^\d{2}\/\d{2}\/\d{4}$/.test(normalizeTimelineDate('2026-09-01T00:00:00Z'))).toBe(true);
        expect(normalizeTimelineDate('')).toBe('');
      });
    });
  });
});
