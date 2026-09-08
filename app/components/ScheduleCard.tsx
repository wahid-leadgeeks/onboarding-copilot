'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ScheduleActivity } from '@/lib/schedule-catalog';
import { getPicBadge, getProgressBadge } from '@/lib/schedule-catalog';
import {
  IconSearch,
  IconEdit,
  IconClock,
  IconCheck,
  IconNote,
  IconClipboard,
  IconRocket,
  IconDotsHorizontal,
  IconPause,
} from './Icons';

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
  copiedToast?: { rowNumber: number; type: 'G-K' | 'Full' } | null;
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
}: ScheduleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const done = item.progress === 'Done';
  const lines = item.topic.split('\n');
  const title = lines[0];
  const subtopics = lines.slice(1);
  const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

  return (
    <div
      className={`relative rounded-2xl border bg-white p-4.5 sm:p-5 shadow-2xs transition-all duration-200 hover:shadow-md ${
        isCurrentTimer
          ? 'border-peach-400 ring-2 ring-peach-200/80 bg-peach-50/10'
          : done
          ? 'border-stone-200/70 bg-stone-50/20'
          : 'border-stone-200/90'
      }`}
    >
      {/* Top row: Context badge, Day/Date, PIC, Format, Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
            Row {item.rowNumber}
          </span>
          <span className="text-xs font-medium text-stone-500">
            #{item.activityCount} · {item.day}, {item.date}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPicBadge(item.pic)}`}>
            {item.pic}
          </span>
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
            {item.mainMedia}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getProgressBadge(
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
          onClick={() => onViewDetails(item)}
          className={`text-base sm:text-lg font-semibold leading-snug cursor-pointer transition hover:text-mint-700 hover:underline ${
            done ? 'text-stone-700' : 'text-stone-900'
          }`}
          title="Click to view full details & outline"
        >
          {title}
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
              className="text-stone-500 hover:text-stone-900 font-medium underline underline-offset-2 transition"
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
            className="inline-flex min-h-8.5 items-center gap-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1 text-xs font-medium transition active:scale-95"
            title="View topic outline, objectives, and full spreadsheet row details"
          >
            <IconSearch className="h-3.5 w-3.5 text-stone-500" />
            <span>Details</span>
          </button>

          <button
            type="button"
            onClick={() => onFillRow(item)}
            className="inline-flex min-h-8.5 items-center gap-1 rounded-full bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200/80 px-2.5 py-1 text-xs font-medium transition active:scale-95"
            title="Update Duration, Times, Progress & Notes"
          >
            <IconEdit className="h-3 w-3 text-stone-500" />
            <span>Fill Row</span>
          </button>

          {/* More Options Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex min-h-8.5 size-8.5 items-center justify-center rounded-full bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-stone-200/80 transition active:scale-95"
              title="More spreadsheet actions (Sync, Copy TSV)"
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <IconDotsHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-52 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-20 animate-fade-in text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSyncRow(item);
                  }}
                  className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-stone-700 hover:bg-stone-50 text-left transition"
                >
                  <IconRocket className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                  <span>Sync to Google Sheets</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onCopyGtoK(item);
                  }}
                  className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-stone-700 hover:bg-stone-50 text-left transition"
                >
                  <IconClipboard className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                  <span>
                    {copiedToast?.rowNumber === item.rowNumber && copiedToast.type === 'G-K'
                      ? 'Copied G–K TSV! ✓'
                      : 'Copy Cols G–K TSV'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onCopyFullRow(item);
                  }}
                  className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-stone-700 hover:bg-stone-50 text-left transition"
                >
                  <IconClipboard className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                  <span>
                    {copiedToast?.rowNumber === item.rowNumber && copiedToast.type === 'Full'
                      ? 'Copied Row A–K! ✓'
                      : 'Copy Full Row A–K'}
                  </span>
                </button>

                <div className="my-1 border-t border-stone-100" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onViewDetails(item);
                  }}
                  className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-stone-700 hover:bg-stone-50 text-left transition"
                >
                  <IconSearch className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                  <span>Full Outline & Tracking</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Primary Action on Right */}
        <div className="flex items-center gap-2">
          {!done ? (
            isTimerRunning ? (
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex min-h-8.5 items-center gap-1.5 rounded-full bg-peach-100 px-3.5 py-1 text-xs font-semibold text-peach-800 transition hover:bg-peach-200 active:scale-95 animate-pulse-soft"
                title="Stopwatch is running above. Click to view."
              >
                <span className="h-2 w-2 rounded-full bg-peach-600 animate-ping" />
                <IconClock className="h-3.5 w-3.5" />
                <span>Stopwatch Running ▴</span>
              </button>
            ) : isTimerPaused ? (
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex min-h-8.5 items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 active:scale-95"
                title="Stopwatch is paused above. Click to view."
              >
                <IconPause className="h-3.5 w-3.5" />
                <span>Stopwatch Paused ▴</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartTimer(item)}
                className="inline-flex min-h-8.5 items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1 text-xs font-semibold text-white transition hover:bg-stone-700 active:scale-95 shadow-2xs"
              >
                <IconClock className="h-3.5 w-3.5" />
                <span>Start Stopwatch</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => onWriteReflection(item)}
              className="inline-flex min-h-8.5 items-center gap-1 rounded-full bg-mint-50 border border-mint-200/70 px-3 py-1 text-xs font-semibold text-mint-700 transition hover:bg-mint-100 active:scale-95"
            >
              <IconNote className="h-3.5 w-3.5" />
              <span>Write Reflection</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
