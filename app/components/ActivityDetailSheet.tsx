'use client';

import React, { useEffect, useRef } from 'react';
import type { ScheduleActivity } from '@/lib/schedule-catalog';
import { activityDateLabel } from '@/lib/today-view';
import { RowTag } from './RowTag';
import { SheetToolsMenu, type SheetToolsMenuItem } from './SheetToolsMenu';
import { shouldSheetCloseOnEscape } from './sheetEscape';
import { useRestoreFocus } from './useRestoreFocus';
import {
  IconEdit,
  IconPlay,
  IconNote,
  IconX,
  IconClock,
  IconUser,
  IconCalendar,
  IconLink,
  IconExternalLink,
} from './Icons';

export interface ActivityDetailSheetProps {
  activity: ScheduleActivity | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (activity: ScheduleActivity) => void;
  onCopyGtoK: (activity: ScheduleActivity) => void;
  onCopyFullRow?: (activity: ScheduleActivity) => void;
  onSyncRow?: (activity: ScheduleActivity) => void;
  onStartTimer?: (activity: ScheduleActivity) => void;
  onWriteReflection?: (activity: ScheduleActivity) => void;
  copiedToast?: { rowNumber: number; type: 'G-K' | 'G-L' | 'Full' } | null;
  isSyncing?: boolean;
}

export function ActivityDetailSheet({
  activity,
  isOpen,
  onClose,
  onEdit,
  onCopyGtoK,
  onCopyFullRow,
  onSyncRow,
  onStartTimer,
  onWriteReflection,
  copiedToast = null,
  isSyncing = false,
}: ActivityDetailSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useRestoreFocus(isOpen && Boolean(activity), closeRef);

  // Close on Escape key and prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;

    // Capture phase: runs before the Sheet tools menu's own handler, while the menu is still marked open,
    // so an Escape meant for an open menu (even with focus on its trigger) closes only the menu.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldSheetCloseOnEscape(e)) return;
      e.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activity) return null;

  const lines = activity.topic.split('\n');
  const title = lines[0];
  const subtopics = lines.slice(1);
  const isDone = activity.progress === 'Done';
  const copiedSheetRow =
    copiedToast?.rowNumber === activity.rowNumber && (copiedToast.type === 'G-K' || copiedToast.type === 'G-L');
  const copiedFullRow = copiedToast?.rowNumber === activity.rowNumber && copiedToast.type === 'Full';
  const sheetItems: SheetToolsMenuItem[] = [
    ...(onSyncRow
      ? [
          {
            id: 'sync-row',
            label: 'Sync this row to the sheet',
            hint: `Writes duration, times, progress and notes to row ${activity.rowNumber}`,
            onSelect: () => onSyncRow(activity),
            state: isSyncing ? ('busy' as const) : ('idle' as const),
          },
        ]
      : []),
    {
      id: 'copy-row',
      label: 'Copy row for the sheet',
      hint: `Columns G–L · paste at G${activity.rowNumber}`,
      onSelect: () => onCopyGtoK(activity),
      state: copiedSheetRow ? ('done' as const) : ('idle' as const),
      doneLabel: 'Copied',
    },
    ...(onCopyFullRow
      ? [
          {
            id: 'copy-full-row',
            label: 'Copy full row',
            hint: 'All 12 columns, A–L',
            onSelect: () => onCopyFullRow(activity),
            state: copiedFullRow ? ('done' as const) : ('idle' as const),
            doneLabel: 'Copied full row',
          },
        ]
      : []),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-detail-sheet-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container: Mobile Bottom-Sheet, Desktop Right-Drawer */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        <div
          ref={panelRef}
          className="pointer-events-auto flex w-screen flex-col bg-white shadow-lift
            max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[90vh] max-sm:rounded-t-3xl
            sm:max-w-xl sm:h-full sm:rounded-l-3xl animate-fade-in"
        >
          {/* Mobile Handle Indicator */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6">
            <div className="space-y-1.5 pr-4">
              <div className="flex flex-wrap items-center gap-2">
                <RowTag rowNumber={activity.rowNumber} />
                <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-700">
                  {[activity.week, activityDateLabel(activity.day, activity.date)].filter(Boolean).join(' · ')}
                </span>
                {activity.activityCount !== undefined && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                    Activity {activity.activityCount}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${
                    isDone
                      ? 'bg-mint-50 text-mint-700 border-mint-200'
                      : activity.progress === 'In Progress'
                      ? 'bg-peach-50 text-peach-700 border-peach-200'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  {activity.progress || 'Not Started'}
                </span>
              </div>
              <h2
                id="activity-detail-sheet-title"
                className="text-lg font-semibold text-stone-900 sm:text-xl leading-snug"
              >
                {title}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 sm:size-9"
              aria-label="Close details"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Outline & Objectives if available */}
            {subtopics.length > 0 && (
              <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Topic Outline & Objectives
                </h3>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {subtopics.map((sub, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-stone-500" aria-hidden="true">•</span>
                      <span>{sub.replace(/^[-*•]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Who leads it and how */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5">
                <div className="mb-1 flex items-center gap-1.5 text-stone-500">
                  <IconUser className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Led by
                  </span>
                </div>
                <span className="text-stone-900 font-bold block text-sm">{activity.pic}</span>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5">
                <div className="mb-1 flex items-center gap-1.5 text-stone-500">
                  <IconCalendar className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    Format
                  </span>
                </div>
                <span className="text-stone-900 font-bold block text-sm">{activity.mainMedia || 'Online Meeting'}</span>
              </div>
            </div>

            {/* Timing & Duration (Planned vs Actual) */}
            <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Time & Duration
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600">
                  <IconClock className="h-3.5 w-3.5 text-stone-500" />
                  {activity.durationMinutes ? `${activity.durationMinutes} mins` : 'TBD'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Start</span>
                  <span className="font-bold text-stone-900">{activity.startTime || '—'}</span>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">End</span>
                  <span className="font-bold text-stone-900">{activity.endTime || '—'}</span>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Duration</span>
                  <span className="font-bold text-stone-900">
                    {activity.durationMinutes ? `${activity.durationMinutes}m` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Materials or recording link */}
            {activity.materialsLink && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800 block mb-1.5 flex items-center gap-1.5">
                  <IconLink className="h-3.5 w-3.5 text-sky-600" />
                  Materials or recording
                </span>
                <div className="flex items-center justify-between gap-2 mt-2 bg-white rounded-xl p-2.5 border border-sky-200/60">
                  <span className="text-xs text-sky-900 truncate font-mono">
                    {activity.materialsLink}
                  </span>
                  <a
                    href={activity.materialsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 text-xs font-semibold shrink-0 transition"
                  >
                    <span>Open</span>
                    <IconExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Notes */}
            {activity.notes ? (
              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5 flex items-center gap-1.5">
                  <IconNote className="h-3.5 w-3.5 text-stone-500" />
                  Your notes
                </span>
                <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed break-words">
                  {activity.notes}
                </p>
                {activity.notes.startsWith('http') && (
                  <div className="mt-2.5">
                    <a
                      href={activity.notes}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1 text-xs font-medium transition sm:min-h-0"
                    >
                      <IconExternalLink className="h-3 w-3" />
                      <span>Open Link from Notes ↗</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-500">
                No notes yet. Use Edit details to add some.
              </div>
            )}
          </div>

          {/* Sticky Footer Actions */}
          <div className="border-t border-stone-100 bg-stone-50/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <SheetToolsMenu items={sheetItems} placement="up" align="start" />
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(activity);
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-800 transition hover:bg-stone-100 active:scale-95 sm:min-h-9"
                >
                  <IconEdit className="h-3.5 w-3.5" />
                  <span>Edit details</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!isDone && onStartTimer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartTimer(activity);
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-stone-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-700 active:scale-95 sm:min-h-9"
                  >
                    <IconPlay className="h-3.5 w-3.5 fill-current" />
                    <span>Start Stopwatch</span>
                  </button>
                )}
                {isDone && onWriteReflection && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onWriteReflection(activity);
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-stone-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-700 active:scale-95 sm:min-h-9"
                  >
                    <IconNote className="h-3.5 w-3.5" />
                    <span>Write Diary Reflection</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
