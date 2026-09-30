import type { TransactionSql } from 'postgres';
import {
  applySchedulePlan,
  buildSchedulePlan,
  formatSchedulePlan,
  schedulePlanAbortReasons,
  validateScheduleRows,
  type ExistingActivity,
  type SchedulePlanFlags,
} from './sync-schedule';

const NO_FLAGS: SchedulePlanFlags = { prune: false, force: false };

function fileRow(rowNumber: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `sched-row-${rowNumber}`,
    rowNumber,
    week: 'Week 0',
    day: 'Exampleday',
    date: `Ex ${rowNumber}`,
    activityCount: 1,
    pic: 'Example Person',
    topic: `Example topic ${rowNumber}`,
    mainMedia: 'Example media',
    durationMinutes: null,
    startTime: '',
    endTime: '',
    progress: '',
    materialsLink: '',
    notes: '',
    ...overrides,
  };
}

function dbActivity(rowNumber: number, overrides: Partial<ExistingActivity> = {}): ExistingActivity {
  return {
    id: `sched-row-${rowNumber}`,
    row_number: rowNumber,
    week: 'Week 0',
    day: 'Exampleday',
    date: `Ex ${rowNumber}`,
    activity_count: 1,
    pic: 'Example Person',
    topic: `Example topic ${rowNumber}`,
    main_media: 'Example media',
    duration_minutes: null,
    start_time: null,
    end_time: null,
    progress: '',
    materials_link: '',
    notes: '',
    ...overrides,
  };
}

describe('validateScheduleRows', () => {
  it('accepts valid rows and returns the original objects', () => {
    const rows = [
      fileRow(190, { durationMinutes: 30, startTime: '09:00', endTime: '23:59', progress: 'Done' }),
      fileRow(191, { activityCount: null, durationMinutes: 0, startTime: '00:00' }),
      fileRow(192, { progress: 'Reschedule', materialsLink: 'https://example.invalid/x', notes: 'n' }),
    ];
    const result = validateScheduleRows(rows);
    expect(result.rejections).toEqual([]);
    expect(result.valid).toHaveLength(3);
    expect((result.valid[0] as unknown) === rows[0]).toBe(true);
  });

  it('rejects a non-object row with its index', () => {
    const result = validateScheduleRows([fileRow(190), null, 'x', [1]]);
    expect(result.valid).toHaveLength(1);
    expect(result.rejections.map((r) => r.index)).toEqual([2, 3, 4]);
    expect(result.rejections[0].reason).toMatch(/not an object/);
  });

  const BAD_ROW_NUMBERS: unknown[] = [1, 201, 2.5, '5', null, undefined, Number.NaN];
  it('rejects rowNumber outside int 2..200, carrying the raw rowNumber', () => {
    for (const rowNumber of BAD_ROW_NUMBERS) {
      const result = validateScheduleRows([fileRow(190, { rowNumber })]);
      expect(result.valid).toHaveLength(0);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].index).toBe(1);
      expect(Object.is(result.rejections[0].rowNumber, rowNumber)).toBe(true);
      expect(result.rejections[0].reason).toMatch(/rowNumber must be an integer 2\.\.200/);
    }
  });

  it('accepts the rowNumber bounds 2 and 200', () => {
    expect(validateScheduleRows([fileRow(2), fileRow(200)]).rejections).toEqual([]);
  });

  it('rejects an id that is not sched-row-${rowNumber}', () => {
    for (const id of ['sched-row-191', 'row-190', undefined]) {
      const result = validateScheduleRows([fileRow(190, { id })]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].rowNumber).toBe(190);
      expect(result.rejections[0].reason).toMatch(/id must be "sched-row-190"/);
    }
  });

  it('rejects empty, blank or non-string week/day/date/pic/topic/mainMedia', () => {
    for (const field of ['week', 'day', 'date', 'pic', 'topic', 'mainMedia']) {
      for (const value of ['', '   ', undefined, 3]) {
        const result = validateScheduleRows([fileRow(190), fileRow(191, { [field]: value })]);
        expect(result.valid).toHaveLength(1);
        expect(result.rejections).toHaveLength(1);
        expect(result.rejections[0].index).toBe(2);
        expect(result.rejections[0].rowNumber).toBe(191);
        expect(result.rejections[0].reason).toContain(`${field} must be a non-empty string`);
      }
    }
  });

  it('rejects an activityCount that is not an integer or null', () => {
    for (const value of [undefined, '1', 1.5, true]) {
      const result = validateScheduleRows([fileRow(190, { activityCount: value })]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].rowNumber).toBe(190);
      expect(result.rejections[0].reason).toContain('activityCount must be an integer or null');
    }
  });

  it('rejects a durationMinutes that is not a non-negative integer or null', () => {
    for (const value of [undefined, -1, 1.5, '30', '']) {
      const result = validateScheduleRows([fileRow(190, { durationMinutes: value })]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].rowNumber).toBe(190);
      expect(result.rejections[0].reason).toContain('durationMinutes must be a non-negative integer or null');
    }
  });

  it("rejects startTime/endTime other than '' or HH:MM", () => {
    for (const field of ['startTime', 'endTime']) {
      for (const value of [null, undefined, '9:00', '24:00', '12:60', '12:00:00', ' 09:00', 900]) {
        const result = validateScheduleRows([fileRow(190, { [field]: value })]);
        expect(result.rejections).toHaveLength(1);
        expect(result.rejections[0].rowNumber).toBe(190);
        expect(result.rejections[0].reason).toContain(`${field} must be '' or HH:MM`);
      }
    }
  });

  it('accepts only the Progress dropdown values', () => {
    for (const value of ['', 'Done', 'In Progress', 'On-Hold', 'Reschedule']) {
      expect(validateScheduleRows([fileRow(190, { progress: value })]).rejections).toEqual([]);
    }
    for (const value of ['Not Started', 'done', ' Done', null, undefined]) {
      const result = validateScheduleRows([fileRow(190, { progress: value })]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].rowNumber).toBe(190);
      expect(result.rejections[0].reason).toContain('progress must be one of');
    }
  });

  it('rejects non-string materialsLink/notes (empty string is fine)', () => {
    for (const field of ['materialsLink', 'notes']) {
      for (const value of [null, undefined, 0]) {
        const result = validateScheduleRows([fileRow(190, { [field]: value })]);
        expect(result.rejections).toHaveLength(1);
        expect(result.rejections[0].rowNumber).toBe(190);
        expect(result.rejections[0].reason).toContain(`${field} must be a string`);
      }
    }
  });

  it('applies no consistency rule between duration and start/end', () => {
    const row = fileRow(190, { durationMinutes: 60, startTime: '10:00', endTime: '09:00' });
    expect(validateScheduleRows([row]).rejections).toEqual([]);
  });

  it('rejects the later row of a duplicate id/rowNumber', () => {
    const result = validateScheduleRows([fileRow(190), fileRow(191), fileRow(190, { topic: 'Other' })]);
    expect(result.valid.map((r) => r.rowNumber)).toEqual([190, 191]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].index).toBe(3);
    expect(result.rejections[0].rowNumber).toBe(190);
    expect(result.rejections[0].reason).toContain('duplicate id "sched-row-190"');
    expect(result.rejections[0].reason).toContain('duplicate rowNumber 190');
  });

  it('rejects a duplicate rowNumber even when the earlier row was itself rejected', () => {
    const result = validateScheduleRows([fileRow(190, { pic: '' }), fileRow(190)]);
    expect(result.valid).toHaveLength(0);
    expect(result.rejections.map((r) => r.index)).toEqual([1, 2]);
    expect(result.rejections[1].reason).toContain('duplicate rowNumber 190');
  });
});

describe('buildSchedulePlan', () => {
  it("inserts a new row, writing start/end '' as NULL", () => {
    const plan = buildSchedulePlan([], [], [fileRow(190, { activityCount: null, notes: 'N' })], NO_FLAGS);
    expect(plan.activities.inserts).toEqual([
      {
        id: 'sched-row-190',
        row_number: 190,
        week: 'Week 0',
        day: 'Exampleday',
        date: 'Ex 190',
        activity_count: null,
        pic: 'Example Person',
        topic: 'Example topic 190',
        main_media: 'Example media',
        duration_minutes: null,
        start_time: null,
        end_time: null,
        progress: '',
        materials_link: '',
        notes: 'N',
      },
    ]);
    expect(plan.activities.updates).toEqual([]);
    expect(schedulePlanAbortReasons(plan)).toEqual([]);
  });

  it('updates only the changed fields, with the raw file value', () => {
    const plan = buildSchedulePlan(
      [dbActivity(190, { topic: 'Old topic', activity_count: 2, notes: null })],
      [],
      [
        fileRow(190, {
          topic: 'New topic',
          durationMinutes: 30,
          startTime: '09:00',
          endTime: '09:30',
          progress: 'Done',
          notes: ' Fresh note\r\n',
        }),
      ],
      NO_FLAGS,
    );
    expect(plan.activities.updates).toEqual([
      {
        id: 'sched-row-190',
        changes: {
          activity_count: { from: 2, to: 1 },
          topic: { from: 'Old topic', to: 'New topic' },
          duration_minutes: { from: null, to: 30 },
          start_time: { from: null, to: '09:00' },
          end_time: { from: null, to: '09:30' },
          progress: { from: '', to: 'Done' },
          notes: { from: null, to: ' Fresh note\r\n' },
        },
      },
    ]);
    expect(plan.activities.conflicts).toEqual([]);
    expect(plan.activities.inserts).toEqual([]);
  });

  it("treats '' == NULL, CRLF == LF and surrounding whitespace as unchanged", () => {
    const plan = buildSchedulePlan(
      [dbActivity(190, { start_time: '', end_time: null, progress: null, materials_link: null, notes: '  a\nb ' })],
      [],
      [fileRow(190, { notes: 'a\r\nb' })],
      NO_FLAGS,
    );
    expect(plan.activities.unchanged).toEqual(['sched-row-190']);
    expect(plan.activities.updates).toEqual([]);
    expect(plan.activities.conflicts).toEqual([]);
  });

  it('catalog fields are always updatable, even over DB values', () => {
    const plan = buildSchedulePlan(
      [dbActivity(190, { week: 'Week 9', pic: 'Someone', main_media: 'Old media', row_number: 191 })],
      [],
      [fileRow(190)],
      NO_FLAGS,
    );
    expect(plan.activities.conflicts).toEqual([]);
    expect(Object.keys(plan.activities.updates[0].changes)).toEqual(['row_number', 'week', 'pic', 'main_media']);
  });

  it('flags a CONFLICT for each protected field with a differing non-empty DB value', () => {
    const plan = buildSchedulePlan(
      [
        dbActivity(190, {
          duration_minutes: 45,
          start_time: '10:00',
          end_time: '10:45',
          progress: 'In Progress',
          materials_link: 'https://example.invalid/app',
          notes: 'typed in the app',
          topic: 'Old topic',
        }),
      ],
      [],
      [
        fileRow(190, {
          durationMinutes: 30,
          startTime: '09:00',
          endTime: '09:30',
          progress: 'Done',
          materialsLink: 'https://example.invalid/file',
          notes: 'from file',
        }),
      ],
      NO_FLAGS,
    );
    expect(plan.activities.conflicts.map((c) => c.field)).toEqual([
      'duration_minutes',
      'start_time',
      'end_time',
      'progress',
      'materials_link',
      'notes',
    ]);
    expect(plan.activities.conflicts[0]).toEqual({ id: 'sched-row-190', field: 'duration_minutes', db: 45, file: 30 });
    // The catalog change is still planned; the conflicts abort the run.
    expect(plan.activities.updates).toEqual([
      { id: 'sched-row-190', changes: { topic: { from: 'Old topic', to: 'Example topic 190' } } },
    ]);
    expect(schedulePlanAbortReasons(plan)).toHaveLength(1);
    expect(schedulePlanAbortReasons(plan)[0]).toMatch(/6 protected-field conflict\(s\).*--force/);
  });

  it('a file blank over a DB value is a conflict; 0 minutes is not empty', () => {
    const plan = buildSchedulePlan(
      [dbActivity(190, { progress: 'Done', duration_minutes: 0 })],
      [],
      [fileRow(190)],
      NO_FLAGS,
    );
    expect(plan.activities.conflicts).toEqual([
      { id: 'sched-row-190', field: 'duration_minutes', db: 0, file: null },
      { id: 'sched-row-190', field: 'progress', db: 'Done', file: '' },
    ]);
    expect(plan.activities.updates).toEqual([]);
    expect(plan.activities.unchanged).toEqual([]);
  });

  it('--force overwrites conflicts (still listed) and allows the apply', () => {
    const plan = buildSchedulePlan(
      [dbActivity(190, { notes: 'typed in the app', start_time: '10:00' })],
      [],
      [fileRow(190, { notes: 'from file' })],
      { ...NO_FLAGS, force: true },
    );
    expect(plan.activities.conflicts).toHaveLength(2);
    expect(plan.activities.updates).toEqual([
      {
        id: 'sched-row-190',
        changes: {
          start_time: { from: '10:00', to: null },
          notes: { from: 'typed in the app', to: 'from file' },
        },
      },
    ]);
    expect(schedulePlanAbortReasons(plan)).toEqual([]);
  });

  it('never deletes without --prune', () => {
    const plan = buildSchedulePlan([dbActivity(190), dbActivity(191)], ['sched-row-191'], [fileRow(190)], NO_FLAGS);
    expect(plan.activities.deletes).toEqual([]);
    expect(plan.blockers).toEqual([]);
  });

  it('--prune deletes stale unreferenced activities', () => {
    const plan = buildSchedulePlan(
      [dbActivity(190), dbActivity(191), { ...dbActivity(5), id: 'legacy-id' }],
      [],
      [fileRow(190)],
      { ...NO_FLAGS, prune: true },
    );
    expect(plan.activities.deletes.map((d) => d.id)).toEqual(['sched-row-191', 'legacy-id']);
    expect(schedulePlanAbortReasons(plan)).toEqual([]);
  });

  it('--prune never deletes keys of rejected rows', () => {
    const plan = buildSchedulePlan(
      [dbActivity(190), dbActivity(191), dbActivity(192), dbActivity(193)],
      [],
      [fileRow(190), fileRow(191, { pic: '' }), fileRow(500, { id: 'sched-row-192' }), fileRow(193, { id: 'x' })],
      { ...NO_FLAGS, prune: true },
    );
    expect(plan.rejections.map((r) => r.rowNumber)).toEqual([191, 500, 193]);
    expect(plan.activities.deletes).toEqual([]);
    expect(schedulePlanAbortReasons(plan).length).toBeGreaterThan(0);
  });

  it('--prune is refused (blocker) when the file has 0 valid rows', () => {
    for (const rows of [[], [fileRow(190, { topic: '' })]]) {
      const plan = buildSchedulePlan([dbActivity(190), dbActivity(191)], [], rows, {
        prune: true,
        force: true,
      });
      expect(plan.blockers).toHaveLength(1);
      expect(plan.blockers[0].reason).toMatch(/0 valid rows/);
      expect(plan.activities.deletes).toEqual([]);
      expect(schedulePlanAbortReasons(plan).length).toBeGreaterThan(0);
    }
  });

  it('--prune never deletes an activity referenced by session_logs: blocker, not forceable', () => {
    const existing = [dbActivity(190), dbActivity(191), dbActivity(192)];
    for (const flags of [
      { prune: true, force: false },
      { prune: true, force: true },
    ]) {
      const plan = buildSchedulePlan(existing, ['sched-row-191', 'sched-row-190'], [fileRow(190)], flags);
      expect(plan.activities.deletes.map((d) => d.id)).toEqual(['sched-row-192']);
      expect(plan.blockers).toHaveLength(1);
      expect(plan.blockers[0].id).toBe('sched-row-191');
      expect(plan.blockers[0].reason).toMatch(/session_logs/);
      expect(schedulePlanAbortReasons(plan)).toEqual(['1 blocker(s)']);
      expect(formatSchedulePlan(plan)).toContain('BLOCKED sched-row-191');
    }
  });

  it('a session_logs reference to a kept activity is not a blocker', () => {
    const plan = buildSchedulePlan([dbActivity(190)], ['sched-row-190'], [fileRow(190)], { ...NO_FLAGS, prune: true });
    expect(plan.blockers).toEqual([]);
    expect(plan.activities.deletes).toEqual([]);
  });

  it('formatSchedulePlan lists rejections with their row number', () => {
    const plan = buildSchedulePlan([], [], [fileRow(190, { id: 'nope' })], NO_FLAGS);
    expect(formatSchedulePlan(plan)).toContain('REJECTED row #1 in file (rowNumber 190, id nope)');
  });
});

describe('applySchedulePlan', () => {
  interface Call {
    text: string;
    values: unknown[];
  }

  function fakeTx(): { tx: TransactionSql; calls: Call[]; helpers: unknown[] } {
    const calls: Call[] = [];
    const helpers: unknown[] = [];
    const fn = (first: unknown, ...rest: unknown[]) => {
      if (Array.isArray(first) && 'raw' in first) {
        calls.push({ text: (first as string[]).join('?').replace(/\s+/g, ' ').trim(), values: rest });
        return Promise.resolve([]);
      }
      helpers.push(first);
      return { helper: first };
    };
    return { tx: fn as unknown as TransactionSql, calls, helpers };
  }

  it('writes nothing for an all-unchanged plan', async () => {
    const plan = buildSchedulePlan([dbActivity(190)], [], [fileRow(190)], NO_FLAGS);
    const { tx, calls } = fakeTx();
    await applySchedulePlan(tx, plan, 'NOW');
    expect(calls.length).toBe(0);
  });

  it('upserts inserts + updates (changed columns only) and deletes only plan.deletes', async () => {
    const plan = buildSchedulePlan(
      [dbActivity(190, { topic: 'Old' }), dbActivity(191), dbActivity(193)],
      [],
      [fileRow(190, { topic: 'New', startTime: '09:00' }), fileRow(191), fileRow(192, { endTime: '10:00' })],
      { ...NO_FLAGS, prune: true },
    );
    const { tx, calls, helpers } = fakeTx();
    await applySchedulePlan(tx, plan, 'NOW');

    expect(calls.map((c) => c.text.slice(0, 27))).toEqual([
      'INSERT INTO activities ( id',
      'INSERT INTO activities ( id',
      'DELETE FROM activities WHER',
    ]);
    expect(calls[0].values).toEqual([
      'sched-row-192',
      192,
      'Week 0',
      'Exampleday',
      'Ex 192',
      1,
      'Example Person',
      'Example topic 192',
      'Example media',
      null,
      null,
      '10:00',
      '',
      '',
      '',
      'NOW',
    ]);
    expect(calls[1].values[0]).toBe('sched-row-190');
    expect(calls[1].text).toMatch(/ON CONFLICT \(id\) DO UPDATE SET \?$/);
    expect(helpers).toEqual([{ topic: 'New', start_time: '09:00', updated_at: 'NOW' }, ['sched-row-193']]);
  });

  it('never writes actual_start, actual_end or created_at, and runs no DDL', async () => {
    const plan = buildSchedulePlan(
      [dbActivity(190, { topic: 'Old' }), dbActivity(193)],
      [],
      [fileRow(190), fileRow(192)],
      { ...NO_FLAGS, prune: true },
    );
    const { tx, calls } = fakeTx();
    await applySchedulePlan(tx, plan, 'NOW');
    for (const call of calls) {
      expect(call.text).not.toMatch(/actual_start|actual_end|created_at/);
      expect(call.text).not.toMatch(/\b(ALTER|CREATE|DROP|TRUNCATE)\b/);
    }
  });
});
