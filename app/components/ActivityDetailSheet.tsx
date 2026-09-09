'use client';

import React, { useEffect, useRef } from 'react';
import type { ScheduleActivity } from '@/lib/schedule-catalog';
import {
  IconClipboard,
  IconEdit,
  IconPlay,
  IconNote,
  IconRocket,
  IconCheck,
  IconX,
  IconClock,
  IconUser,
  IconCalendar,
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
  copiedToast?: { rowNumber: number; type: 'G-K' | 'Full' } | null;
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

  // Close on Escape key and prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activity) return null;

  const lines = activity.topic.split('\n');
  const title = lines[0];
  const subtopics = lines.slice(1);
  const isDone = activity.progress === 'Done';

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
                <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
                  Row {activity.rowNumber}
                </span>
                <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-700">
                  {activity.week} · {activity.day} ({activity.date})
                </span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                  #{activity.activityCount}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
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
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
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
                      <span className="text-stone-400 mt-0.5">•</span>
                      <span>{sub.replace(/^[-*•]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PIC and Media */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                  <IconUser className="h-3.5 w-3.5" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Person in Charge (Col D)
                  </span>
                </div>
                <span className="text-stone-900 font-bold block text-sm">{activity.pic}</span>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                  <IconCalendar className="h-3.5 w-3.5" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Main Media (Col E)
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
                  <IconClock className="h-3.5 w-3.5 text-stone-400" />
                  {activity.durationMinutes ? `${activity.durationMinutes} mins` : 'TBD'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <span className="block text-[10px] text-stone-400 font-medium uppercase">Start</span>
                  <span className="font-bold text-stone-900">{activity.startTime || '—'}</span>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <span className="block text-[10px] text-stone-400 font-medium uppercase">End</span>
                  <span className="font-bold text-stone-900">{activity.endTime || '—'}</span>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <span className="block text-[10px] text-stone-400 font-medium uppercase">Duration</span>
                  <span className="font-bold text-stone-900">
                    {activity.durationMinutes ? `${activity.durationMinutes}m` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {activity.notes ? (
              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                  Your Activity Notes (Col K)
                </span>
                <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                  {activity.notes}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-400">
                No personal or mentor notes logged yet for this row.
              </div>
            )}
          </div>

          {/* Sticky Footer Actions */}
          <div className="border-t border-stone-100 bg-stone-50/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(activity);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700 transition active:scale-95"
                >
                  <IconEdit className="h-3.5 w-3.5" />
                  <span>Fill / Edit Row</span>
                </button>

                {onSyncRow && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => onSyncRow(activity)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition active:scale-95 disabled:opacity-50"
                    title="Sync this row to Google Sheets via API"
                  >
                    <IconRocket className="h-3.5 w-3.5 text-stone-600" />
                    <span>{isSyncing ? 'Syncing…' : 'Sync to Sheets'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onCopyGtoK(activity)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition active:scale-95"
                  title="Copy tab-separated Duration, Start, End, Progress, Notes"
                >
                  {copiedToast?.rowNumber === activity.rowNumber && copiedToast.type === 'G-K' ? (
                    <>
                      <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                      <span className="text-mint-700 font-semibold">Copied G–K!</span>
                    </>
                  ) : (
                    <>
                      <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                      <span>Copy G–K TSV</span>
                    </>
                  )}
                </button>

                {onCopyFullRow && (
                  <button
                    type="button"
                    onClick={() => onCopyFullRow(activity)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 transition active:scale-95"
                    title="Copy all 11 columns A–K for this row"
                  >
                    {copiedToast?.rowNumber === activity.rowNumber && copiedToast.type === 'Full' ? (
                      <>
                        <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                        <span className="text-mint-700 font-semibold">Copied Row!</span>
                      </>
                    ) : (
                      <>
                        <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                        <span>Copy Row A–K</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isDone && onStartTimer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartTimer(activity);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-mint-700 px-4 py-2 text-xs font-semibold text-white hover:bg-mint-800 transition active:scale-95 shadow-xs"
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-mint-700 px-4 py-2 text-xs font-semibold text-white hover:bg-mint-800 transition active:scale-95 shadow-xs"
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
