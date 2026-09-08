'use client';

import React from 'react';
import { ModalDialog } from './ModalDialog';
import type { ScheduleActivity } from '@/lib/schedule-catalog';
import { IconClipboard, IconEdit, IconPlay, IconNote, IconExternalLink, IconRocket, IconCheck } from './Icons';

export interface ActivityDetailModalProps {
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

export function ActivityDetailModal({
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
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const lines = activity.topic.split('\n');
  const title = lines[0];
  const subtopics = lines.slice(1);
  const isDone = activity.progress === 'Done';

  const badge = (
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
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      badge={badge}
      maxWidth="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
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
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 transition active:scale-95 disabled:opacity-50"
                title="Sync this row to Google Sheets via API"
              >
                <IconRocket className="h-3.5 w-3.5 text-stone-600" />
                <span>{isSyncing ? 'Syncing…' : 'Sync to Sheets'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onCopyGtoK(activity)}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 transition active:scale-95"
              title="Copy tab-separated Duration, Start, End, Progress, Notes"
            >
              {copiedToast?.rowNumber === activity.rowNumber && copiedToast.type === 'G-K' ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                  <span className="text-mint-700 font-semibold">Copied G–K!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy G–K TSV</span>
                </>
              )}
            </button>

            {onCopyFullRow && (
              <button
                type="button"
                onClick={() => onCopyFullRow(activity)}
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 transition active:scale-95"
                title="Copy all 11 columns A–K for this row"
              >
                {copiedToast?.rowNumber === activity.rowNumber && copiedToast.type === 'Full' ? (
                  <>
                    <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                    <span className="text-mint-700 font-semibold">Copied Row!</span>
                  </>
                ) : (
                  <>
                    <IconClipboard className="h-3.5 w-3.5" />
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
      }
    >
      <div className="space-y-4">
        {/* Sub-bullets if any */}
        {subtopics.length > 0 && (
          <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Topic Outline & Objectives
            </h4>
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
          <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3">
            <span className="font-semibold uppercase tracking-wider text-stone-400 text-[10px] block">
              Person in Charge (Col D)
            </span>
            <span className="text-stone-900 font-bold mt-0.5 block">{activity.pic}</span>
          </div>
          <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3">
            <span className="font-semibold uppercase tracking-wider text-stone-400 text-[10px] block">
              Main Media (Col F)
            </span>
            <span className="text-stone-900 font-bold mt-0.5 block">{activity.mainMedia}</span>
          </div>
        </div>

        {/* 5 Sheet Tracking Columns Status */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Current Tracking Values (Worksheet Schedule)
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                Col G · Duration
              </span>
              <span className="font-bold text-stone-900">
                {activity.durationMinutes !== undefined ? `${activity.durationMinutes} min` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                Col H · Start Time
              </span>
              <span className="font-bold text-stone-900">{activity.startTime || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                Col I · End Time
              </span>
              <span className="font-bold text-stone-900">{activity.endTime || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                Col J · Progress
              </span>
              <span className="font-bold text-stone-900">{activity.progress || 'Not Started'}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-3 border-t border-stone-100 pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
              Col K · Notes / Drive Link
            </span>
            {activity.notes ? (
              activity.notes.startsWith('http') ? (
                <a
                  href={activity.notes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-mint-700 underline break-all mt-1 hover:text-mint-800"
                >
                  <span>{activity.notes}</span>
                  <IconExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <p className="text-xs text-stone-700 mt-1 whitespace-pre-wrap leading-relaxed">
                  {activity.notes}
                </p>
              )
            ) : (
              <span className="text-xs text-stone-400 italic mt-0.5 block">No notes recorded yet</span>
            )}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
