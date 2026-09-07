'use client';

import React from 'react';
import { ModalDialog } from './ModalDialog';
import type { ScheduleActivity } from '@/lib/schedule-catalog';

export interface ActivityDetailModalProps {
  activity: ScheduleActivity | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (activity: ScheduleActivity) => void;
  onCopyGtoK: (activity: ScheduleActivity) => void;
  onStartTimer?: (activity: ScheduleActivity) => void;
  onWriteReflection?: (activity: ScheduleActivity) => void;
}

export function ActivityDetailModal({
  activity,
  isOpen,
  onClose,
  onEdit,
  onCopyGtoK,
  onStartTimer,
  onWriteReflection,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const lines = activity.topic.split('\n');
  const title = lines[0];
  const subtopics = lines.slice(1);
  const isDone = activity.progress === 'Done';

  const badge = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
        Sheet: Schedule · Row {activity.rowNumber}
      </span>
      <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-700">
        {activity.week} · {activity.day} ({activity.date})
      </span>
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
        #{activity.activityCount}
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
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCopyGtoK(activity)}
              className="rounded-full bg-stone-100 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 transition"
              title="Copy tab-separated Duration, Start, End, Progress, Notes"
            >
              📋 Copy Cols G–K
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(activity);
              }}
              className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700 transition"
            >
              ✏️ Fill / Edit Row
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
                className="rounded-full bg-mint-700 px-4 py-2 text-xs font-semibold text-white hover:bg-mint-800 transition"
              >
                ▶️ Start Timer
              </button>
            )}
            {isDone && onWriteReflection && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onWriteReflection(activity);
                }}
                className="rounded-full bg-mint-700 px-4 py-2 text-xs font-semibold text-white hover:bg-mint-800 transition"
              >
                📝 Diary Reflection
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
                  className="text-xs font-semibold text-mint-700 underline break-all mt-1 inline-block hover:text-mint-800"
                >
                  {activity.notes} ↗
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
