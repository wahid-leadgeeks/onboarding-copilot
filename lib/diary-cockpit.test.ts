import {
  OFFICIAL_DIARY_TOPICS,
  calculateDiaryCockpitProgress,
  clipboardRowForDiary,
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

  it('correctly categorizes Row 15 (Growth Department Introduction) as needs-notes by default', () => {
    const progress = calculateDiaryCockpitProgress([]);
    expect(progress.totalCount).toBe(28);
    const row15 = progress.rowStatuses.find((r) => r.topic.rowNumber === 15);
    expect(row15).toBeDefined();
    expect(row15?.status).toBe('needs-notes');
    expect(row15?.topic.topic).toBe('Growth Department Introduction');
    expect(row15?.topic.pic).toBe('Growth Manager');
    expect(progress.needsNotesCount).toBe(1);
    expect(progress.completedCount).toBe(9); // rows 2, 5-8, 11-14 have default learnings & notes
    expect(progress.todoCount).toBe(18);
  });

  it('updates Row 15 to completed when user provides notes', () => {
    const userEntry: DiaryEntryRecord = {
      rowNumber: 15,
      learned: '1. Dual-Track Revenue Engine\n2. Targeted ICP\n3. 8 WEs',
      notes: '1. My detailed notes about growth operations and ICP scoring.',
      updatedAt: new Date().toISOString(),
    };
    const progress = calculateDiaryCockpitProgress([userEntry]);
    const row15 = progress.rowStatuses.find((r) => r.topic.rowNumber === 15);
    expect(row15?.status).toBe('completed');
    expect(progress.completedCount).toBe(10);
    expect(progress.needsNotesCount).toBe(0);
  });

  it('formats TSV rows for clipboard copy accurately', () => {
    const tsv = clipboardRowForDiary(15, 'Learning A\nLearning B', 'Note 1\tNote 2');
    expect(tsv).toContain('Learning A\nLearning B');
    expect(tsv).toContain('\t');
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
