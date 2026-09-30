import type { TransactionSql } from 'postgres';
import {
  applyDiaryPlan,
  buildDiaryPlan,
  diaryPlanAbortReasons,
  formatDiaryPlan,
  validateDiaryRows,
  type DiaryPlanFlags,
  type ExistingDiaryEntry,
  type ExistingDiaryTopic,
} from './sync-diary';

const NO_FLAGS: DiaryPlanFlags = { prune: false, force: false, forcePrune: false };

function fileRow(rowNumber: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `row-${rowNumber}`,
    rowNumber,
    day: `Example day ${rowNumber}`,
    week: '0.0',
    date: `Ex ${rowNumber}`,
    activityCount: '1',
    pic: 'Example Person',
    topic: `Example topic ${rowNumber}`,
    learned: '',
    notes: '',
    ...overrides,
  };
}

function dbTopic(rowNumber: number, overrides: Partial<ExistingDiaryTopic> = {}): ExistingDiaryTopic {
  return {
    id: `row-${rowNumber}`,
    row_number: rowNumber,
    day: `Example day ${rowNumber}`,
    week: '0.0',
    date: `Ex ${rowNumber}`,
    activity_count: '1',
    pic: 'Example Person',
    topic: `Example topic ${rowNumber}`,
    default_learned: '',
    default_notes: '',
    ...overrides,
  };
}

function dbEntry(rowNumber: number, overrides: Partial<ExistingDiaryEntry> = {}): ExistingDiaryEntry {
  return { id: `entry-${rowNumber}`, row_number: rowNumber, learned: '', notes: '', ...overrides };
}

describe('validateDiaryRows', () => {
  it('accepts valid rows and returns the original objects', () => {
    const rows = [fileRow(190), fileRow(191, { activityCount: null }), fileRow(192, { activityCount: undefined })];
    const result = validateDiaryRows(rows);
    expect(result.rejections).toEqual([]);
    expect(result.valid).toHaveLength(3);
    expect((result.valid[0] as unknown) === rows[0]).toBe(true);
  });

  it('rejects a non-object row with its index', () => {
    const result = validateDiaryRows([fileRow(190), null, 'x', [1]]);
    expect(result.valid).toHaveLength(1);
    expect(result.rejections.map((r) => r.index)).toEqual([2, 3, 4]);
    expect(result.rejections[0].reason).toMatch(/not an object/);
  });

  const BAD_ROW_NUMBERS: unknown[] = [1, 201, 2.5, '5', null, undefined, Number.NaN];
  it('rejects rowNumber outside int 2..200, carrying the raw rowNumber', () => {
    for (const rowNumber of BAD_ROW_NUMBERS) {
      const result = validateDiaryRows([fileRow(190, { rowNumber })]);
      expect(result.valid).toHaveLength(0);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].index).toBe(1);
      expect(Object.is(result.rejections[0].rowNumber, rowNumber)).toBe(true);
      expect(result.rejections[0].reason).toMatch(/rowNumber must be an integer 2\.\.200/);
    }
  });

  it('accepts the rowNumber bounds 2 and 200', () => {
    expect(validateDiaryRows([fileRow(2), fileRow(200)]).rejections).toEqual([]);
  });

  it('rejects an id that is not row-${rowNumber}', () => {
    const result = validateDiaryRows([fileRow(190, { id: 'row-191' })]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].rowNumber).toBe(190);
    expect(result.rejections[0].id).toBe('row-191');
    expect(result.rejections[0].reason).toMatch(/id must be "row-190"/);
  });

  it('rejects empty, blank or non-string day/week/date/pic/topic', () => {
    for (const field of ['day', 'week', 'date', 'pic', 'topic']) {
      for (const value of ['', '   ', undefined, 3]) {
        const result = validateDiaryRows([fileRow(190), fileRow(191, { [field]: value })]);
        expect(result.valid).toHaveLength(1);
        expect(result.rejections).toHaveLength(1);
        expect(result.rejections[0].index).toBe(2);
        expect(result.rejections[0].rowNumber).toBe(191);
        expect(result.rejections[0].reason).toContain(`${field} must be a non-empty string`);
      }
    }
  });

  it('rejects a non-string, non-null activityCount', () => {
    for (const value of [3, true, {}]) {
      const result = validateDiaryRows([fileRow(190, { activityCount: value })]);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].rowNumber).toBe(190);
      expect(result.rejections[0].reason).toContain('activityCount must be a string or null');
    }
  });

  it('rejects non-string learned/notes (empty string is fine)', () => {
    for (const field of ['learned', 'notes']) {
      for (const value of [null, undefined, 0]) {
        const result = validateDiaryRows([fileRow(190, { [field]: value })]);
        expect(result.rejections).toHaveLength(1);
        expect(result.rejections[0].rowNumber).toBe(190);
        expect(result.rejections[0].reason).toContain(`${field} must be a string`);
      }
    }
  });

  it('rejects the later row of a duplicate id/rowNumber', () => {
    const result = validateDiaryRows([fileRow(190), fileRow(191), fileRow(190, { topic: 'Other' })]);
    expect(result.valid.map((r) => r.rowNumber)).toEqual([190, 191]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].index).toBe(3);
    expect(result.rejections[0].rowNumber).toBe(190);
    expect(result.rejections[0].reason).toContain('duplicate id "row-190"');
    expect(result.rejections[0].reason).toContain('duplicate rowNumber 190');
  });

  it('rejects a duplicate rowNumber even when the earlier row was itself rejected', () => {
    const result = validateDiaryRows([fileRow(190, { pic: '' }), fileRow(190)]);
    expect(result.valid).toHaveLength(0);
    expect(result.rejections.map((r) => r.index)).toEqual([1, 2]);
    expect(result.rejections[1].reason).toContain('duplicate rowNumber 190');
  });
});

describe('buildDiaryPlan', () => {
  it('inserts a topic and an entry for a new row', () => {
    const plan = buildDiaryPlan([], [], [fileRow(190, { learned: 'L', notes: 'N' })], NO_FLAGS);
    expect(plan.topics.inserts).toEqual([
      {
        id: 'row-190',
        row_number: 190,
        day: 'Example day 190',
        week: '0.0',
        date: 'Ex 190',
        activity_count: '1',
        pic: 'Example Person',
        topic: 'Example topic 190',
        default_learned: 'L',
        default_notes: 'N',
      },
    ]);
    expect(plan.entries.inserts).toEqual([{ id: 'entry-190', row_number: 190, learned: 'L', notes: 'N' }]);
    expect(plan.topics.updates).toEqual([]);
    expect(plan.entries.updates).toEqual([]);
    expect(diaryPlanAbortReasons(plan)).toEqual([]);
  });

  it('writes activityCount undefined as NULL', () => {
    const plan = buildDiaryPlan([], [], [fileRow(190, { activityCount: undefined })], NO_FLAGS);
    expect(plan.topics.inserts[0].activity_count).toBeNull();
  });

  it('updates only the changed fields, with the raw file value', () => {
    const plan = buildDiaryPlan(
      [dbTopic(190, { topic: 'Old topic', default_notes: null })],
      [dbEntry(190, { learned: '' })],
      [fileRow(190, { topic: 'New topic', notes: ' Fresh note\r\n', learned: 'Learned now' })],
      NO_FLAGS,
    );
    expect(plan.topics.updates).toEqual([
      {
        id: 'row-190',
        changes: {
          topic: { from: 'Old topic', to: 'New topic' },
          default_learned: { from: '', to: 'Learned now' },
          default_notes: { from: null, to: ' Fresh note\r\n' },
        },
      },
    ]);
    expect(plan.entries.updates).toEqual([
      {
        id: 'entry-190',
        changes: {
          learned: { from: '', to: 'Learned now' },
          notes: { from: '', to: ' Fresh note\r\n' },
        },
      },
    ]);
    expect(plan.topics.inserts).toEqual([]);
    expect(plan.entries.conflicts).toEqual([]);
  });

  it("treats '' == NULL, CRLF == LF and surrounding whitespace as unchanged", () => {
    const plan = buildDiaryPlan(
      [dbTopic(190, { activity_count: null, default_learned: null, default_notes: 'a\nb' })],
      [dbEntry(190, { learned: '  text  ', notes: 'a\nb' })],
      [fileRow(190, { activityCount: '', learned: 'text', notes: 'a\r\nb\n' })],
      NO_FLAGS,
    );
    // default_learned: DB NULL vs file 'text' is a real change; everything else is equal.
    expect(Object.keys(plan.topics.updates[0].changes)).toEqual(['default_learned']);
    expect(plan.entries.updates).toEqual([]);
    expect(plan.entries.unchanged).toEqual(['entry-190']);
    expect(plan.entries.conflicts).toEqual([]);

    const same = buildDiaryPlan(
      [dbTopic(190, { activity_count: null, default_learned: null, default_notes: ' ' })],
      [dbEntry(190)],
      [fileRow(190, { activityCount: null })],
      NO_FLAGS,
    );
    expect(same.topics.unchanged).toEqual(['row-190']);
    expect(same.entries.unchanged).toEqual(['entry-190']);
    expect(same.topics.updates).toEqual([]);
  });

  it('flags a CONFLICT when a non-empty DB learned/notes differs from the file', () => {
    const plan = buildDiaryPlan(
      [dbTopic(190)],
      [dbEntry(190, { learned: 'typed in the app', notes: '' })],
      [fileRow(190, { learned: 'from file', notes: 'note' })],
      NO_FLAGS,
    );
    expect(plan.entries.conflicts).toEqual([
      { id: 'entry-190', field: 'learned', db: 'typed in the app', file: 'from file' },
    ]);
    // The non-conflicting empty field is still updated in the plan; the conflict aborts the run.
    expect(plan.entries.updates).toEqual([{ id: 'entry-190', changes: { notes: { from: '', to: 'note' } } }]);
    expect(diaryPlanAbortReasons(plan)).toHaveLength(1);
    expect(diaryPlanAbortReasons(plan)[0]).toMatch(/--force/);
  });

  it('a file blank over DB text is also a conflict', () => {
    const plan = buildDiaryPlan([dbTopic(190)], [dbEntry(190, { notes: 'kept' })], [fileRow(190)], NO_FLAGS);
    expect(plan.entries.conflicts).toEqual([{ id: 'entry-190', field: 'notes', db: 'kept', file: '' }]);
    expect(plan.entries.updates).toEqual([]);
    expect(plan.entries.unchanged).toEqual([]);
  });

  it('--force overwrites conflicts (still listed) and allows the apply', () => {
    const plan = buildDiaryPlan(
      [dbTopic(190)],
      [dbEntry(190, { learned: 'typed in the app' })],
      [fileRow(190, { learned: 'from file' })],
      { ...NO_FLAGS, force: true },
    );
    expect(plan.entries.conflicts).toHaveLength(1);
    expect(plan.entries.updates).toEqual([
      { id: 'entry-190', changes: { learned: { from: 'typed in the app', to: 'from file' } } },
    ]);
    expect(diaryPlanAbortReasons(plan)).toEqual([]);
  });

  it('never deletes without --prune', () => {
    const plan = buildDiaryPlan([dbTopic(190), dbTopic(191)], [dbEntry(190), dbEntry(191)], [fileRow(190)], NO_FLAGS);
    expect(plan.topics.deletes).toEqual([]);
    expect(plan.entries.deletes).toEqual([]);
    expect(plan.pruneSkipped).toEqual([]);
  });

  it('--prune deletes stale empty topics and entries', () => {
    const plan = buildDiaryPlan(
      [dbTopic(190), dbTopic(191)],
      [dbEntry(190), dbEntry(191)],
      [fileRow(190)],
      { ...NO_FLAGS, prune: true },
    );
    expect(plan.topics.deletes.map((d) => d.id)).toEqual(['row-191']);
    expect(plan.entries.deletes.map((d) => d.id)).toEqual(['entry-191']);
    expect(diaryPlanAbortReasons(plan)).toEqual([]);
  });

  it('--prune never deletes keys of rejected rows', () => {
    const plan = buildDiaryPlan(
      [dbTopic(190), dbTopic(191), dbTopic(192)],
      [dbEntry(190), dbEntry(191), dbEntry(192)],
      [fileRow(190), fileRow(191, { pic: '' }), fileRow(500, { id: 'row-192' })],
      { ...NO_FLAGS, prune: true },
    );
    expect(plan.rejections.map((r) => r.rowNumber)).toEqual([191, 500]);
    expect(plan.topics.deletes).toEqual([]);
    expect(plan.entries.deletes).toEqual([]);
    expect(diaryPlanAbortReasons(plan).length).toBeGreaterThan(0);
  });

  it('--prune is refused (blocker) when the file has 0 valid rows', () => {
    for (const rows of [[], [fileRow(190, { topic: '' })]]) {
      const plan = buildDiaryPlan([dbTopic(190)], [dbEntry(190)], rows, { ...NO_FLAGS, prune: true, forcePrune: true });
      expect(plan.blockers).toHaveLength(1);
      expect(plan.blockers[0].reason).toMatch(/0 valid rows/);
      expect(plan.topics.deletes).toEqual([]);
      expect(plan.entries.deletes).toEqual([]);
      expect(diaryPlanAbortReasons(plan).length).toBeGreaterThan(0);
    }
  });

  it('--prune keeps an entry with text (and its topic) unless --force-prune', () => {
    const existingTopics = [dbTopic(190), dbTopic(191)];
    const existingEntries = [dbEntry(190), dbEntry(191, { notes: 'user text' })];
    const kept = buildDiaryPlan(existingTopics, existingEntries, [fileRow(190)], { ...NO_FLAGS, prune: true });
    expect(kept.entries.deletes).toEqual([]);
    expect(kept.topics.deletes).toEqual([]);
    expect(kept.pruneSkipped.map((s) => s.id)).toEqual(['entry-191', 'row-191']);
    expect(formatDiaryPlan(kept)).toContain('KEEP entry-191');

    const forced = buildDiaryPlan(existingTopics, existingEntries, [fileRow(190)], {
      ...NO_FLAGS,
      prune: true,
      forcePrune: true,
    });
    expect(forced.entries.deletes.map((d) => d.id)).toEqual(['entry-191']);
    expect(forced.topics.deletes.map((d) => d.id)).toEqual(['row-191']);
    expect(forced.pruneSkipped).toEqual([]);
  });

  it('formatDiaryPlan lists rejections with their row number', () => {
    const plan = buildDiaryPlan([], [], [fileRow(190, { id: 'nope' })], NO_FLAGS);
    expect(formatDiaryPlan(plan)).toContain('REJECTED row #1 in file (rowNumber 190, id nope)');
  });
});

describe('applyDiaryPlan', () => {
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
    const plan = buildDiaryPlan([dbTopic(190)], [dbEntry(190)], [fileRow(190)], NO_FLAGS);
    const { tx, calls } = fakeTx();
    await applyDiaryPlan(tx, plan, 'NOW');
    expect(calls.length).toBe(0);
  });

  it('upserts inserts + updates (changed columns only) and deletes only plan.deletes', async () => {
    const plan = buildDiaryPlan(
      [dbTopic(190, { topic: 'Old' }), dbTopic(191), dbTopic(193)],
      [dbEntry(190), dbEntry(191), dbEntry(193)],
      [fileRow(190, { topic: 'New', learned: 'L' }), fileRow(191), fileRow(192)],
      { ...NO_FLAGS, prune: true },
    );
    const { tx, calls, helpers } = fakeTx();
    await applyDiaryPlan(tx, plan, 'NOW');

    expect(calls.map((c) => c.text.slice(0, 31))).toEqual([
      'INSERT INTO diary_topics ( id, ',
      'INSERT INTO diary_topics ( id, ',
      'INSERT INTO diary_entries (id, ',
      'INSERT INTO diary_entries (id, ',
      'DELETE FROM diary_entries WHERE',
      'DELETE FROM diary_topics WHERE ',
    ]);
    expect(calls[0].values[0]).toBe('row-192');
    expect(calls[1].values[0]).toBe('row-190');
    expect(calls[1].text).toMatch(/ON CONFLICT \(id\) DO UPDATE SET \?$/);
    expect(calls[2].values).toEqual(['entry-192', 192, '', '', 'NOW']);
    expect(calls[3].text).toMatch(/ON CONFLICT \(row_number\) DO UPDATE SET \?$/);
    expect(helpers).toEqual([
      { topic: 'New', default_learned: 'L' },
      { learned: 'L', updated_at: 'NOW' },
      ['entry-193'],
      ['row-193'],
    ]);
  });
});
