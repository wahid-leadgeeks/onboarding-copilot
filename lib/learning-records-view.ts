import { diaryId, quickNoteId, type DiarySource, type StoredDiary, type StoredQuickNote } from './local-records';

export type LearningRecordKind = 'diary' | 'quick-note';

/**
 * Presentation source for a record: diary entries without a stored `source`
 * are labeled `legacy` in the UI only — the label is never persisted or
 * exported (no provenance is invented).
 */
export type LearningRecordSource = DiarySource | 'legacy';

/** Read-only view of one diary entry or quick note with a resolved stable id. */
export type LearningRecordView = {
  readonly id: string;
  readonly kind: LearningRecordKind;
  readonly content: string;
  readonly createdAt: string;
  readonly activityId?: string;
  readonly activityName?: string;
  readonly source: LearningRecordSource;
  readonly updatedAt?: string;
};

export function buildDiaryViews(entries: readonly StoredDiary[]): LearningRecordView[] {
  return entries.map((entry) => ({
    id: entry.id ?? diaryId(entry),
    kind: 'diary',
    content: entry.content,
    createdAt: entry.createdAt,
    ...(entry.activityId === undefined ? {} : { activityId: entry.activityId }),
    ...(entry.activityName === undefined ? {} : { activityName: entry.activityName }),
    source: entry.source ?? 'legacy',
    ...(entry.updatedAt === undefined ? {} : { updatedAt: entry.updatedAt }),
  }));
}

export function buildQuickNoteViews(notes: readonly StoredQuickNote[]): LearningRecordView[] {
  return notes.map((note) => ({
    id: note.id ?? quickNoteId(note),
    kind: 'quick-note',
    content: note.content,
    createdAt: note.createdAt,
    source: 'quick-note',
  }));
}

export type SourceFilter = 'all' | 'manual' | 'quick-note' | 'ai-assisted' | 'legacy';

export type ActivityFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'activity'; readonly key: string };

export type LearningRecordFilter = {
  readonly query: string;
  readonly source: SourceFilter;
  readonly activity: ActivityFilter;
};

export function emptyRecordFilter(): LearningRecordFilter {
  return { query: '', source: 'all', activity: { kind: 'all' } };
}

export function isFilterActive(filter: LearningRecordFilter): boolean {
  return filter.query.trim() !== '' || filter.source !== 'all' || filter.activity.kind !== 'all';
}

/** Parses a select value into a source filter, falling back to `all`. */
export function parseSourceFilter(raw: string): SourceFilter {
  if (raw === 'manual' || raw === 'quick-note' || raw === 'ai-assisted' || raw === 'legacy') return raw;
  return 'all';
}

const ACTIVITY_VALUE_PREFIX = 'activity:';

export function activityOptionValue(key: string): string {
  return `${ACTIVITY_VALUE_PREFIX}${key}`;
}

/** Parses a select value into an activity filter, falling back to `all`. */
export function parseActivityFilter(raw: string): ActivityFilter {
  if (!raw.startsWith(ACTIVITY_VALUE_PREFIX)) return { kind: 'all' };
  const key = raw.slice(ACTIVITY_VALUE_PREFIX.length);
  return key === '' ? { kind: 'all' } : { kind: 'activity', key };
}

/** Serializes an activity filter back into a select value. */
export function activityFilterValue(filter: ActivityFilter): string {
  return filter.kind === 'all' ? 'all' : activityOptionValue(filter.key);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled activity filter variant: ${JSON.stringify(value)}`);
}

function recordActivityKey(view: LearningRecordView): string | undefined {
  return view.activityId ?? view.activityName;
}

function matchesActivity(view: LearningRecordView, filter: ActivityFilter): boolean {
  switch (filter.kind) {
    case 'all':
      return true;
    case 'activity':
      return recordActivityKey(view) === filter.key;
    default:
      return assertNever(filter);
  }
}

function matchesQuery(view: LearningRecordView, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  if (view.content.toLowerCase().includes(needle)) return true;
  return view.activityName !== undefined && view.activityName.toLowerCase().includes(needle);
}

export function matchesRecordFilter(view: LearningRecordView, filter: LearningRecordFilter): boolean {
  return matchesQuery(view, filter.query)
    && (filter.source === 'all' || view.source === filter.source)
    && matchesActivity(view, filter.activity);
}

export function filterLearningRecords<T extends LearningRecordView>(views: readonly T[], filter: LearningRecordFilter): T[] {
  return views.filter((view) => matchesRecordFilter(view, filter));
}

export type ActivityFilterOption = {
  readonly value: string;
  readonly label: string;
  readonly count: number;
};

/** Derives activity filter options from records, ordered by label. */
export function activityFilterOptions(views: readonly LearningRecordView[]): ActivityFilterOption[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const view of views) {
    const key = recordActivityKey(view);
    if (key === undefined) continue;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { label: view.activityName ?? key, count: 1 });
  }
  return [...counts.entries()]
    .map(([key, { label, count }]) => ({ value: activityOptionValue(key), label, count }))
    .sort((first, second) => (first.label < second.label ? -1 : 1));
}

/** Export-shaped note; structurally compatible with `ExportNotes`' `SelectableNote`. */
export type SelectableLearningNote = {
  readonly id: string;
  readonly kind: LearningRecordKind;
  readonly content: string;
  readonly createdAt: string;
  readonly activityId?: string;
  readonly activityName?: string;
  readonly source?: DiarySource;
  readonly updatedAt?: string;
};

/**
 * Maps views to exportable notes. `legacy` is a presentation label only:
 * quick notes never gain a `source`, and legacy diary entries keep none.
 */
export function toSelectableNotes(views: readonly LearningRecordView[]): SelectableLearningNote[] {
  return views.map((view) => {
    const source = view.kind === 'diary' && view.source !== 'legacy' ? view.source : undefined;
    return {
      id: view.id,
      kind: view.kind,
      content: view.content,
      createdAt: view.createdAt,
      ...(view.activityId === undefined ? {} : { activityId: view.activityId }),
      ...(view.activityName === undefined ? {} : { activityName: view.activityName }),
      ...(source === undefined ? {} : { source }),
      ...(view.updatedAt === undefined ? {} : { updatedAt: view.updatedAt }),
    };
  });
}

/** Drops selected ids that no longer exist in the given records, keeping selection coherent. */
export function pruneSelection(selected: ReadonlySet<string>, views: readonly LearningRecordView[]): ReadonlySet<string> {
  const known = new Set(views.map((view) => view.id));
  let changed = false;
  const next = new Set<string>();
  for (const id of selected) {
    if (known.has(id)) next.add(id);
    else changed = true;
  }
  return changed ? next : selected;
}
