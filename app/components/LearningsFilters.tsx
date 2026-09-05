'use client';
import {
  activityFilterValue,
  isFilterActive,
  parseActivityFilter,
  parseSourceFilter,
  type ActivityFilterOption,
  type LearningRecordFilter,
} from '@/lib/learning-records-view';

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'quick-note', label: 'From quick notes' },
  { value: 'ai-assisted', label: 'AI-assisted' },
  { value: 'legacy', label: 'Legacy' },
] as const;

export const selectClass = 'min-h-11 min-w-0 max-w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700';

export const filterLabelClass = 'flex min-h-11 min-w-0 items-center gap-2 text-sm text-stone-500';

export function LearningsFilters({ filter, activityOptions, onFilterChange, onClear }: {
  filter: LearningRecordFilter;
  activityOptions: readonly ActivityFilterOption[];
  onFilterChange: (next: LearningRecordFilter) => void;
  onClear: () => void;
}) {
  return (
    <section aria-label="Search and filter notes" className="animate-fade-up rounded-card bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex min-w-56 flex-1 items-center gap-2">
          <label htmlFor="learnings-search" className="text-sm font-medium text-stone-700">Search</label>
          <input
            id="learnings-search"
            type="search"
            value={filter.query}
            onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
            placeholder="Notes and activities"
            className="min-h-11 w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400"
          />
        </div>
        <label className={filterLabelClass}>
          Source
          <select
            value={filter.source}
            onChange={(event) => onFilterChange({ ...filter, source: parseSourceFilter(event.target.value) })}
            className={selectClass}
          >
            {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {activityOptions.length > 0 && (
          <label className={filterLabelClass}>
            Activity
            <select
              value={activityFilterValue(filter.activity)}
              onChange={(event) => onFilterChange({ ...filter, activity: parseActivityFilter(event.target.value) })}
              className={selectClass}
            >
              <option value="all">All activities</option>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label} ({option.count})</option>
              ))}
            </select>
          </label>
        )}
        {isFilterActive(filter) && (
          <button
            onClick={onClear}
            className="min-h-11 rounded-full px-3 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"
          >
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
