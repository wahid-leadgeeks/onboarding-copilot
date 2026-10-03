'use client';

import React from 'react';
import type { ScheduleActivity } from '@/lib/schedule-catalog';
import { getPicBadge, getProgressBadge } from '@/lib/schedule-catalog';
import { activityDateLabel } from '@/lib/today-view';
import { activityAnchorId, scheduleCardPrimaryAction, scheduleRowToolLabels } from '@/lib/schedule-view';
import { RowTag } from './RowTag';
import { SheetToolsMenu, type SheetToolsMenuItem } from './SheetToolsMenu';
import { IconSearch, IconEdit, IconClock, IconCheck, IconNote, IconPause, IconExternalLink } from './Icons';

export interface ScheduleCardProps {
  item: ScheduleActivity;
  isCurrentTimer: boolean;
  isTimerRunning: boolean;
  isTimerPaused: boolean;
  elapsedSeconds?: number;
  startedAt?: number | null;
  onViewDetails: (item: ScheduleActivity) => void;
  onStartTimer: (item: ScheduleActivity) => void;
  onFillRow: (item: ScheduleActivity) => void;
  onSyncRow: (item: ScheduleActivity) => void;
  onCopyGtoK: (item: ScheduleActivity) => void;
  onCopyFullRow: (item: ScheduleActivity) => void;
  onWriteReflection: (item: ScheduleActivity) => void;
  copiedToast?: { rowNumber: number; type: 'G-K' | 'G-L' | 'Full' } | null;
  /** A diary reflection is already linked to this activity (hides "Write Reflection"). */
  hasReflection?: boolean;
}

export function ScheduleCard({
  item,
  isCurrentTimer,
  isTimerRunning,
  isTimerPaused,
  elapsedSeconds = 0,
  startedAt = null,
  onViewDetails,
  onStartTimer,
  onFillRow,
  onSyncRow,
  onCopyGtoK,
  onCopyFullRow,
  onWriteReflection,
  copiedToast = null,
  hasReflection = false,
}: ScheduleCardProps) {
  const done = item.progress === 'Done';
  const lines = item.topic.split('\n');
  const title = lines[0];
  const subtopics = lines.slice(1);
  const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const primaryAction = scheduleCardPrimaryAction({ progress: item.progress, isTimerRunning, isTimerPaused, hasReflection });
  const toolLabels = scheduleRowToolLabels(item.rowNumber);
  const copiedHere = copiedToast?.rowNumber === item.rowNumber ? copiedToast.type : null;
  const toolItems: SheetToolsMenuItem[] = [
    { id: 'sync', ...toolLabels.sync, onSelect: () => onSyncRow(item) },
    {
      id: 'copy-row',
      ...toolLabels.copyRow,
      onSelect: () => onCopyGtoK(item),
      state: copiedHere === 'G-K' || copiedHere === 'G-L' ? 'done' : 'idle',
      doneLabel: 'Copied',
    },
    {
      id: 'copy-full',
      ...toolLabels.copyFull,
      onSelect: () => onCopyFullRow(item),
      state: copiedHere === 'Full' ? 'done' : 'idle',
      doneLabel: 'Copied full row',
    },
    { id: 'outline', ...toolLabels.outline, onSelect: () => onViewDetails(item) },
  ];
  const actionClass = 'inline-flex min-h-11 sm:min-h-8.5 items-center rounded-full text-xs transition active:scale-95';

  return (
    <article
      id={activityAnchorId(item.id)}
      aria-labelledby={`${activityAnchorId(item.id)}-title`}
      className={`relative scroll-mt-[calc(3.5rem+3rem)] md:scroll-mt-16 rounded-2xl border bg-white p-4.5 sm:p-5 shadow-2xs transition-all duration-200 hover:shadow-md ${
        isCurrentTimer
          ? 'border-peach-400 ring-2 ring-peach-200/80 bg-peach-50/10'
          : done
          ? 'border-stone-200/70 bg-stone-50/20'
          : 'border-stone-200/90'
      }`}
    >
      {/* Top row: date, leader, format, status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">{activityDateLabel(item.day, item.date)}</span>
          <RowTag rowNumber={item.rowNumber} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getPicBadge(item.pic)}`}>
            {item.pic}
          </span>
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-600">
            {item.mainMedia}
          </span>
          {item.materialsLink && (
            <a
              href={item.materialsLink.startsWith('http') ? item.materialsLink : `https://${item.materialsLink}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-11 sm:min-h-0 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
              title={`Open materials or recording: ${item.materialsLink}`}
            >
              <IconExternalLink className="h-3 w-3 text-sky-600" />
              <span>Materials</span>
            </a>
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-bold ${getProgressBadge(
              isTimerRunning || isTimerPaused ? 'In Progress' : item.progress
            )}`}
          >
            {isTimerRunning ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-peach-500 animate-pulse" />
                <span>In Progress</span>
              </span>
            ) : isTimerPaused ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Paused</span>
              </span>
            ) : (
              item.progress || 'Not Started'
            )}
          </span>
        </div>
      </div>

      {/* Main Title */}
      <div className="mt-1">
        <h3
          id={`${activityAnchorId(item.id)}-title`}
          className={`text-base sm:text-lg font-semibold leading-snug ${done ? 'text-stone-700' : 'text-stone-900'}`}
        >
          <button
            type="button"
            onClick={() => onViewDetails(item)}
            className="block min-h-11 w-full text-left transition hover:text-mint-700 hover:underline underline-offset-2 sm:min-h-0 sm:w-auto"
          >
            {title}
          </button>
        </h3>

        {/* Informative Subline (Target, logged time, or live timer) */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {done ? (
            <div className="inline-flex items-center gap-1.5 font-medium text-mint-700">
              <IconCheck className="h-3.5 w-3.5" />
              <span>
                Logged: {item.durationMinutes !== undefined ? `${item.durationMinutes} min` : 'Done'}
                {item.startTime && item.endTime ? ` · ${item.startTime} → ${item.endTime}` : ''}
              </span>
            </div>
          ) : isTimerRunning ? (
            <div className="inline-flex items-center gap-1.5 font-medium text-peach-700">
              <span className="h-2 w-2 rounded-full bg-peach-500 animate-pulse" />
              <span>
                Stopwatch live: {elapsedMinutes} min (started {item.startTime || (startedAt ? 'now' : '')})
              </span>
            </div>
          ) : isTimerPaused ? (
            <div className="inline-flex items-center gap-1.5 font-medium text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Stopwatch paused: {elapsedMinutes} min logged</span>
            </div>
          ) : (
            <div className="text-stone-500 flex items-center gap-2">
              <span>Target: {item.durationMinutes !== undefined ? `${item.durationMinutes} min` : 'Flexible / TBD'}</span>
              <span>·</span>
              <span>{item.mainMedia}</span>
            </div>
          )}

          {/* Subtopics link to view details */}
          {subtopics.length > 0 && (
            <button
              type="button"
              onClick={() => onViewDetails(item)}
              className="inline-flex min-h-11 sm:min-h-0 items-center text-stone-500 hover:text-stone-900 font-medium underline underline-offset-2 transition"
            >
              {subtopics.length} outline points & details →
            </button>
          )}
        </div>
      </div>

      {/* Action Footer: Progressive Disclosure */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
        {/* Secondary Actions & Details on Left */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onViewDetails(item)}
            className={`${actionClass} gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1 font-medium`}
          >
            <IconSearch className="h-3.5 w-3.5 text-stone-500" />
            <span>Details</span>
          </button>

          <button
            type="button"
            onClick={() => onFillRow(item)}
            className={`${actionClass} gap-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200/80 px-3 py-1 font-medium`}
          >
            <IconEdit className="h-3 w-3 text-stone-500" />
            <span>Edit details</span>
          </button>

          <SheetToolsMenu
            items={toolItems}
            size="icon"
            label={`Sheet tools for ${title}`}
            placement="up"
            align="start"
          />
        </div>

        {/* Primary Action on Right */}
        <div className="flex items-center gap-2">
          {primaryAction === 'running' ? (
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`${actionClass} gap-1.5 bg-peach-100 px-3.5 py-1 font-semibold text-peach-800 hover:bg-peach-200 animate-pulse-soft`}
              title="Stopwatch is running above. Click to view."
            >
              <span className="h-2 w-2 rounded-full bg-peach-600 animate-ping" />
              <IconClock className="h-3.5 w-3.5" />
              <span>Stopwatch Running ▴</span>
            </button>
          ) : primaryAction === 'paused' ? (
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`${actionClass} gap-1.5 bg-amber-100 px-3.5 py-1 font-semibold text-amber-800 hover:bg-amber-200`}
              title="Stopwatch is paused above. Click to view."
            >
              <IconPause className="h-3.5 w-3.5" />
              <span>Stopwatch Paused ▴</span>
            </button>
          ) : primaryAction === 'start' ? (
            <button
              type="button"
              onClick={() => onStartTimer(item)}
              className={`${actionClass} gap-1.5 bg-stone-900 px-3.5 py-1 font-semibold text-white hover:bg-stone-700 shadow-2xs`}
            >
              <IconClock className="h-3.5 w-3.5" />
              <span>Start Stopwatch</span>
            </button>
          ) : primaryAction === 'reflection' ? (
            <button
              type="button"
              onClick={() => onWriteReflection(item)}
              className={`${actionClass} gap-1 bg-mint-50 border border-mint-200/70 px-3 py-1 font-semibold text-mint-800 hover:bg-mint-100`}
            >
              <IconNote className="h-3.5 w-3.5" />
              <span>Write Reflection</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-mint-800">
              <IconCheck className="h-3.5 w-3.5" />
              <span>Reflection saved</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
