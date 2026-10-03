'use client';

import type { ScheduleActivity } from '@/lib/schedule-catalog';
import { activityAnchorId, completedRowSummary } from '@/lib/schedule-view';
import { RowTag } from './RowTag';
import { IconCheck } from './Icons';

export interface ScheduleCompletedRowProps {
  item: ScheduleActivity;
  hasReflection: boolean;
  onOpen: (item: ScheduleActivity) => void;
}

/** One-line row for a finished activity; the whole row opens the detail sheet. */
export function ScheduleCompletedRow({ item, hasReflection, onOpen }: ScheduleCompletedRowProps) {
  const summary = completedRowSummary(item, hasReflection);

  return (
    <li id={activityAnchorId(item.id)} className="scroll-mt-[calc(3.5rem+3rem)] md:scroll-mt-16">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group flex min-h-11 w-full min-w-0 items-center gap-3 px-3 py-2 text-left transition hover:bg-stone-50 focus-visible:bg-stone-50 sm:px-4"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-800">
          <IconCheck className="h-3.5 w-3.5" />
          <span className="sr-only">Done:</span>
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800 group-hover:text-stone-950">
          {summary.title}
        </span>
        {summary.needsReflection && (
          <span className="hidden shrink-0 rounded-full bg-peach-50 px-2 py-0.5 text-xs font-medium text-peach-800 sm:inline">
            No reflection yet
          </span>
        )}
        {summary.needsReflection && (
          <span className="size-2 shrink-0 rounded-full bg-peach-500 sm:hidden" aria-hidden="true" />
        )}
        {summary.needsReflection && <span className="sr-only sm:hidden">, no reflection yet</span>}
        <span className="hidden shrink-0 text-xs text-stone-500 sm:inline">{summary.dateLabel}</span>
        {summary.duration && (
          <span className="hidden shrink-0 text-xs tabular-nums text-stone-500 md:inline">{summary.duration}</span>
        )}
        <span className="hidden shrink-0 sm:inline-flex">
          <RowTag rowNumber={item.rowNumber} />
        </span>
      </button>
    </li>
  );
}
