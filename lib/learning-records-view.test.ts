import { diaryId, quickNoteId, type StoredDiary, type StoredQuickNote } from './local-records';
import {
  activityFilterValue,
  activityFilterOptions,
  activityOptionValue,
  buildDiaryViews,
  buildQuickNoteViews,
  emptyRecordFilter,
  filterLearningRecords,
  isFilterActive,
  parseActivityFilter,
  parseSourceFilter,
  pruneSelection,
  toSelectableNotes,
  type LearningRecordFilter,
  type LearningRecordView,
} from './learning-records-view';

const legacyDiary: StoredDiary = { content: 'legacy note', createdAt: '2026-09-01T09:00:00.000Z' };
const structuredDiary: StoredDiary = {
  content: 'structured note',
  createdAt: '2026-09-02T10:00:00.000Z',
  id: 'd-custom',
  activityId: 'sec',
  activityName: 'Security & Access Setup',
  source: 'ai-assisted',
  updatedAt: '2026-09-02T11:00:00.000Z',
};
const convertedDiary: StoredDiary = { content: 'converted note', createdAt: '2026-09-03T08:00:00.000Z', source: 'quick-note' };
const manualDiary: StoredDiary = { content: 'manual note', createdAt: '2026-09-03T09:00:00.000Z', source: 'manual' };
const plainQuickNote: StoredQuickNote = { content: 'MD explained company strategy', createdAt: '2026-09-03T09:30:00.000Z' };
const quickNoteWithId: StoredQuickNote = { content: 'tagged note', createdAt: '2026-09-03T10:00:00.000Z', id: 'q-custom' };

function allViews(): LearningRecordView[] {
  return [...buildDiaryViews([legacyDiary, structuredDiary, convertedDiary, manualDiary]), ...buildQuickNoteViews([plainQuickNote, quickNoteWithId])];
}

describe('learning records view', () => {
  it('derives stable ids for legacy diary entries and labels them legacy', () => {
    const views = buildDiaryViews([legacyDiary]);
    expect(views).toHaveLength(1);
    expect(views[0].id).toBe(diaryId({ content: 'legacy note', createdAt: '2026-09-01T09:00:00.000Z' }));
    expect(views[0].kind).toBe('diary');
    expect(views[0].source).toBe('legacy');
  });

  it('prefers explicit diary ids and preserves structured metadata', () => {
    const views = buildDiaryViews([structuredDiary]);
    expect(views[0]).toStrictEqual({
      id: 'd-custom',
      kind: 'diary',
      content: 'structured note',
      createdAt: '2026-09-02T10:00:00.000Z',
      activityId: 'sec',
      activityName: 'Security & Access Setup',
      source: 'ai-assisted',
      updatedAt: '2026-09-02T11:00:00.000Z',
    });
  });

  it('derives stable ids for quick notes and prefers explicit ids', () => {
    const derived = buildQuickNoteViews([plainQuickNote]);
    expect(derived[0].id).toBe(quickNoteId({ content: 'MD explained company strategy', createdAt: '2026-09-03T09:30:00.000Z' }));
    expect(derived[0].kind).toBe('quick-note');

    const explicit = buildQuickNoteViews([quickNoteWithId]);
    expect(explicit[0].id).toBe('q-custom');
  });

  it('round-trips activity filter values', () => {
    expect(parseActivityFilter('all')).toStrictEqual({ kind: 'all' });
    expect(parseActivityFilter(activityOptionValue('sec'))).toStrictEqual({ kind: 'activity', key: 'sec' });
    expect(parseActivityFilter('nonsense')).toStrictEqual({ kind: 'all' });
    expect(parseActivityFilter('sec')).toStrictEqual({ kind: 'all' });

    expect(activityFilterValue({ kind: 'all' })).toBe('all');
    expect(activityFilterValue({ kind: 'activity', key: 'sec' })).toBe(activityOptionValue('sec'));
  });

  it('parses source filter values and falls back to all', () => {
    expect(parseSourceFilter('all')).toBe('all');
    expect(parseSourceFilter('manual')).toBe('manual');
    expect(parseSourceFilter('quick-note')).toBe('quick-note');
    expect(parseSourceFilter('ai-assisted')).toBe('ai-assisted');
    expect(parseSourceFilter('legacy')).toBe('legacy');
    expect(parseSourceFilter('dreamed')).toBe('all');
  });

  it('matches every record with the empty filter', () => {
    const views = allViews();
    expect(filterLearningRecords(views, emptyRecordFilter())).toHaveLength(views.length);
  });

  it('searches content case-insensitively', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), query: 'LEGACY' };
    expect(filterLearningRecords(allViews(), filter).map((view) => view.id)).toEqual([
      diaryId({ content: 'legacy note', createdAt: '2026-09-01T09:00:00.000Z' }),
    ]);
  });

  it('searches activity names case-insensitively', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), query: 'security' };
    expect(filterLearningRecords(allViews(), filter).map((view) => view.id)).toEqual(['d-custom']);
  });

  it('searches quick note content', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), query: 'company strategy' };
    expect(filterLearningRecords(allViews(), filter).map((view) => view.id)).toEqual([
      quickNoteId({ content: 'MD explained company strategy', createdAt: '2026-09-03T09:30:00.000Z' }),
    ]);
  });

  it('returns no records when the query matches nothing', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), query: '  needle-in-haystack  ' };
    expect(filterLearningRecords(allViews(), filter)).toHaveLength(0);
  });

  it('treats a whitespace-only query as inactive', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), query: '   ' };
    expect(filterLearningRecords(allViews(), filter)).toHaveLength(allViews().length);
    expect(isFilterActive(filter)).toBe(false);
  });

  it('filters legacy diary entries by source without matching quick notes', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), source: 'legacy' };
    expect(filterLearningRecords(allViews(), filter).map((view) => view.content)).toEqual(['legacy note']);
  });

  it('filters manual and ai-assisted sources', () => {
    const manual: LearningRecordFilter = { ...emptyRecordFilter(), source: 'manual' };
    expect(filterLearningRecords(allViews(), manual).map((view) => view.content)).toEqual(['manual note']);

    const aiAssisted: LearningRecordFilter = { ...emptyRecordFilter(), source: 'ai-assisted' };
    expect(filterLearningRecords(allViews(), aiAssisted).map((view) => view.content)).toEqual(['structured note']);
  });

  it('matches quick notes and converted diary entries under the quick-note source', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), source: 'quick-note' };
    expect(filterLearningRecords(allViews(), filter).map((view) => view.content)).toEqual([
      'converted note',
      'MD explained company strategy',
      'tagged note',
    ]);
  });

  it('filters by activity id and falls back to activity name', () => {
    const byId: LearningRecordFilter = { ...emptyRecordFilter(), activity: { kind: 'activity', key: 'sec' } };
    expect(filterLearningRecords(allViews(), byId).map((view) => view.content)).toEqual(['structured note']);

    const byName: LearningRecordFilter = { ...emptyRecordFilter(), activity: { kind: 'activity', key: 'Team Welcome' } };
    const welcomeViews = buildDiaryViews([{ content: 'welcome note', createdAt: '2026-09-04T09:00:00.000Z', activityName: 'Team Welcome' }]);
    expect(filterLearningRecords([...welcomeViews, ...buildDiaryViews([legacyDiary])], byName).map((view) => view.content)).toEqual(['welcome note']);
  });

  it('excludes records without activity metadata when an activity filter is active', () => {
    const filter: LearningRecordFilter = { ...emptyRecordFilter(), activity: { kind: 'activity', key: 'sec' } };
    const matched = filterLearningRecords(allViews(), filter);
    expect(matched).toHaveLength(1);
    expect(matched[0].activityId).toBe('sec');
  });

  it('requires every filter dimension to match', () => {
    const filter: LearningRecordFilter = {
      query: 'structured',
      source: 'ai-assisted',
      activity: { kind: 'activity', key: 'sec' },
    };
    expect(filterLearningRecords(allViews(), filter).map((view) => view.id)).toEqual(['d-custom']);

    const conflicting: LearningRecordFilter = { ...filter, source: 'manual' };
    expect(filterLearningRecords(allViews(), conflicting)).toHaveLength(0);
  });

  it('derives activity filter options with counts and stable ordering', () => {
    const views = buildDiaryViews([
      structuredDiary,
      { content: 'second security note', createdAt: '2026-09-04T09:00:00.000Z', activityId: 'sec', activityName: 'Security & Access Setup' },
      { content: 'alpha note', createdAt: '2026-09-04T10:00:00.000Z', activityName: 'Alpha Training' },
      legacyDiary,
    ]);
    expect(activityFilterOptions(views)).toStrictEqual([
      { value: activityOptionValue('Alpha Training'), label: 'Alpha Training', count: 1 },
      { value: activityOptionValue('sec'), label: 'Security & Access Setup', count: 2 },
    ]);
  });

  it('labels activity options with the id when the name is missing', () => {
    const views = buildDiaryViews([{ content: 'nameless', createdAt: '2026-09-04T11:00:00.000Z', activityId: 'sec-2' }]);
    expect(activityFilterOptions(views)).toStrictEqual([
      { value: activityOptionValue('sec-2'), label: 'sec-2', count: 1 },
    ]);
  });

  it('maps views to selectable notes without losing metadata', () => {
    const notes = toSelectableNotes(allViews());
    expect(notes).toStrictEqual([
      {
        id: diaryId({ content: 'legacy note', createdAt: '2026-09-01T09:00:00.000Z' }),
        kind: 'diary',
        content: 'legacy note',
        createdAt: '2026-09-01T09:00:00.000Z',
      },
      {
        id: 'd-custom',
        kind: 'diary',
        content: 'structured note',
        createdAt: '2026-09-02T10:00:00.000Z',
        activityId: 'sec',
        activityName: 'Security & Access Setup',
        source: 'ai-assisted',
        updatedAt: '2026-09-02T11:00:00.000Z',
      },
      {
        id: diaryId({ content: 'converted note', createdAt: '2026-09-03T08:00:00.000Z' }),
        kind: 'diary',
        content: 'converted note',
        createdAt: '2026-09-03T08:00:00.000Z',
        source: 'quick-note',
      },
      {
        id: diaryId({ content: 'manual note', createdAt: '2026-09-03T09:00:00.000Z' }),
        kind: 'diary',
        content: 'manual note',
        createdAt: '2026-09-03T09:00:00.000Z',
        source: 'manual',
      },
      {
        id: quickNoteId({ content: 'MD explained company strategy', createdAt: '2026-09-03T09:30:00.000Z' }),
        kind: 'quick-note',
        content: 'MD explained company strategy',
        createdAt: '2026-09-03T09:30:00.000Z',
      },
      { id: 'q-custom', kind: 'quick-note', content: 'tagged note', createdAt: '2026-09-03T10:00:00.000Z' },
    ]);
  });

  it('prunes selections down to the given records', () => {
    const views = buildQuickNoteViews([quickNoteWithId]);
    const pruned = pruneSelection(new Set(['q-custom', 'gone']), views);
    expect([...pruned]).toEqual(['q-custom']);

    expect([...pruneSelection(new Set(['gone']), [])]).toEqual([]);
    expect([...pruneSelection(new Set<string>(), views)]).toEqual([]);
  });

  it('returns the same selection reference when nothing needs pruning', () => {
    const views = buildQuickNoteViews([plainQuickNote, quickNoteWithId]);
    const selected = new Set([quickNoteId(plainQuickNote), 'q-custom']);
    expect(pruneSelection(selected, views)).toBe(selected);
  });

  it('reports when a filter is active', () => {
    expect(isFilterActive(emptyRecordFilter())).toBe(false);
    expect(isFilterActive({ ...emptyRecordFilter(), query: 'x' })).toBe(true);
    expect(isFilterActive({ ...emptyRecordFilter(), source: 'manual' })).toBe(true);
    expect(isFilterActive({ ...emptyRecordFilter(), activity: { kind: 'activity', key: 'sec' } })).toBe(true);
  });
});
