import {
  OFFICIAL_DIARY_TOPICS,
  calculateDiaryCockpitProgress,
  clipboardRowForDiary,
  clipboardAllDiaryGtoH,
  clipboardAllDiaryFullTable,
  readDiaryCockpitEntries,
  writeDiaryCockpitEntries,
  upsertDiaryCockpitEntry,
  suggestAiLearnings,
  suggestAiNotes,
  type DiaryEntryRecord,
} from './diary-cockpit';

describe('Onboarding Diary Cockpit', () => {
  it('contains exactly 28 official syllabus topics from rows 2 to 29', () => {
    expect(OFFICIAL_DIARY_TOPICS).toHaveLength(28);
    expect(OFFICIAL_DIARY_TOPICS[0].rowNumber).toBe(2);
    expect(OFFICIAL_DIARY_TOPICS[0].topic).toBe('Introduction to Onboarding Framework');
    expect(OFFICIAL_DIARY_TOPICS[27].rowNumber).toBe(29);
    expect(OFFICIAL_DIARY_TOPICS[27].topic).toContain('Website Management Goals');
  });

  it('calculates progress for all official syllabus topics from the catalog defaults', () => {
    const withLearned = OFFICIAL_DIARY_TOPICS.filter((t) => (t.defaultLearned ?? '').trim());
    const completed = withLearned.filter((t) => (t.defaultNotes ?? '').trim());
    const needsNotes = withLearned.length - completed.length;

    const progress = calculateDiaryCockpitProgress([]);
    expect(progress.totalCount).toBe(OFFICIAL_DIARY_TOPICS.length);
    expect(progress.completedCount).toBe(completed.length);
    expect(progress.needsNotesCount).toBe(needsNotes);
    expect(progress.todoCount).toBe(OFFICIAL_DIARY_TOPICS.length - withLearned.length);
    expect(progress.completedCount + progress.needsNotesCount + progress.todoCount).toBe(
      progress.totalCount
    );
    expect(progress.isComplete).toBe(progress.completedCount === progress.totalCount);

    // Same number of topics with defaults as origin/main (10 of 28, 9 with both fields).
    expect(withLearned.length).toBe(10);
    expect(completed.length).toBe(9);

    const byId = (id: string) => OFFICIAL_DIARY_TOPICS.find((t) => t.id === id);
    expect(byId('row-12')?.defaultLearned).toContain('The Experience Department connects');
    expect(byId('row-16')?.defaultLearned).toContain('Comprehensive Financial Planning');
    expect(byId('row-13')?.defaultLearned).toBe('');
    expect(byId('row-13')?.defaultNotes).toBe('');

    const nonEmptyLearned = withLearned.map((t) => t.defaultLearned);
    expect(new Set(nonEmptyLearned).size).toBe(nonEmptyLearned.length);

    const row15 = progress.rowStatuses.find((r) => r.topic.rowNumber === 15);
    expect(row15).toBeDefined();
    expect(row15?.topic.topic).toBe('Growth Department Introduction');
    expect(row15?.topic.pic).toBe('Growth Manager');
  });

  it('marks a topic as needs-notes when user notes are empty', () => {
    const before = calculateDiaryCockpitProgress([]);
    const beforeRow = before.rowStatuses.find((r) => r.topic.rowNumber === 14);
    expect(beforeRow?.status).toBe('completed');

    const userEntry: DiaryEntryRecord = {
      rowNumber: 14,
      learned: 'Learned point',
      notes: '',
      updatedAt: new Date().toISOString(),
    };
    const progress = calculateDiaryCockpitProgress([userEntry]);
    const row = progress.rowStatuses.find((r) => r.topic.rowNumber === 14);
    expect(row?.status).toBe('needs-notes');
    expect(progress.needsNotesCount).toBe(before.needsNotesCount + 1);
    expect(progress.completedCount).toBe(before.completedCount - 1);
  });

  it('formats TSV rows for clipboard copy accurately', () => {
    const tsv = clipboardRowForDiary(15, 'Learning A\nLearning B', 'Note 1\tNote 2');
    expect(tsv).toContain('Learning A\nLearning B');
    expect(tsv).toContain('\t');

    const maxRow = 25;
    const rowsInRange = OFFICIAL_DIARY_TOPICS.filter((t) => t.rowNumber <= maxRow);
    const bulkGtoH = clipboardAllDiaryGtoH([], OFFICIAL_DIARY_TOPICS, maxRow);
    expect(bulkGtoH.match(/\t/g)).toHaveLength(rowsInRange.length);
    const withDefaults = rowsInRange.find((t) => t.defaultLearned);
    expect(withDefaults).toBeDefined();
    expect(bulkGtoH).toContain(withDefaults!.defaultLearned!);

    const fullTable = clipboardAllDiaryFullTable([], OFFICIAL_DIARY_TOPICS, maxRow);
    for (const t of rowsInRange) {
      expect(fullTable).toContain(t.topic);
    }
  });

  it('serializes and deserializes local storage records reliably', () => {
    const records: DiaryEntryRecord[] = [
      {
        rowNumber: 15,
        learned: 'Learned point',
        notes: 'Notes point',
        updatedAt: '2026-09-07T12:00:00Z',
        syncedToSheets: true,
      },
    ];
    const serialized = writeDiaryCockpitEntries(records);
    const deserialized = readDiaryCockpitEntries(serialized);
    expect(deserialized).toEqual(records);
  });

  it('handles empty or malformed storage gracefully', () => {
    expect(readDiaryCockpitEntries(null)).toEqual([]);
    expect(readDiaryCockpitEntries('')).toEqual([]);
    expect(readDiaryCockpitEntries('not-json')).toEqual([]);
    expect(readDiaryCockpitEntries('{"invalid": true}')).toEqual([]);
  });

  it('upserts entry correctly without mutating existing unrelated entries', () => {
    const initial: DiaryEntryRecord[] = [
      { rowNumber: 15, learned: 'Old', notes: 'Old', updatedAt: '2026-09-01' },
      { rowNumber: 16, learned: 'Row 16', notes: 'Notes 16', updatedAt: '2026-09-01' },
    ];
    const updated = upsertDiaryCockpitEntry(initial, {
      rowNumber: 15,
      learned: 'New',
      notes: 'New',
      updatedAt: '2026-09-07',
    });
    expect(updated).toHaveLength(2);
    expect(updated.find((r) => r.rowNumber === 15)?.learned).toBe('New');
    expect(updated.find((r) => r.rowNumber === 16)?.learned).toBe('Row 16');
  });

  it('provides helpful assistive AI drafts for topics', () => {
    const topic15 = OFFICIAL_DIARY_TOPICS.find((t) => t.rowNumber === 15)!;
    const learnings = suggestAiLearnings(topic15);
    const notes = suggestAiNotes(topic15);
    expect(learnings).toContain('Dual-Track Revenue Engine');
    expect(notes).toContain('Growth operates both inbound');
  });
});
