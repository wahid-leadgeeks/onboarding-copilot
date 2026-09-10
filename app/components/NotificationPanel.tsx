'use client';

import React, { useEffect, useState } from 'react';
import { IconBell, IconX, IconSprout, IconTree, IconTrophy, IconCalendar, IconCheck } from '@/app/components/Icons';

export interface NotificationSummary {
  /** e.g. "Synced just now" or "Demo data" */
  syncLabel: string;
  /** dot color class e.g. "bg-mint-500" */
  syncDotColor: string;
  /** bg + text class e.g. "bg-mint-50 text-mint-700" */
  syncClassName: string;
  /** e.g. "Kamis, 10 September" */
  dateLabel: string;
  /** e.g. 10 */
  dayNumber: number;
  /** e.g. 90 */
  totalDays: number;
  /** e.g. 20 */
  overallCompleted: number;
  /** e.g. 59 */
  overallTotal: number;
  /** e.g. 34 */
  overallPercent: number;
  /** e.g. "Good afternoon" */
  greeting: string;
  /** e.g. "Your day is still unwritten." */
  headline: string;
  /** Number completed today */
  todayCompleted: number;
  /** Total scheduled today */
  todayTotal: number;
  /** Remaining today */
  todayRemaining: number;
  /** Seedling stage label e.g. "Just planted" */
  seedlingLabel: string;
  /** Seedling stage: "sprout" | "tree" | "trophy" */
  seedlingStage: 'sprout' | 'tree' | 'trophy';
  /** Today's progress percent */
  todayPercent: number;
}

interface NotificationPanelProps {
  summary: NotificationSummary;
}

export function NotificationBell({ summary }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const hasActivity = summary.todayTotal > 0;

  // Listen for external open event (e.g. from AppShell)
  useEffect(() => {
    function handleOpen() { setOpen(true); }
    window.addEventListener('open-notifications', handleOpen);
    return () => window.removeEventListener('open-notifications', handleOpen);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      {/* Bell trigger button — rendered inline in AppShell, but state lives here */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-xs"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Daily summary notifications"
            className="fixed top-0 right-0 z-50 h-full w-full max-w-sm flex flex-col bg-white shadow-lift animate-fade-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <IconBell className="h-4 w-4 text-stone-500" />
                <span className="text-sm font-semibold text-stone-900">Daily Summary</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                aria-label="Close notifications"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Sync status */}
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${summary.syncClassName}`}>
                <span aria-hidden="true" className={`size-2 rounded-full ${summary.syncDotColor}`} />
                {summary.syncLabel}
              </div>

              {/* Date + day progress */}
              <div className="rounded-2xl bg-stone-50 px-4 py-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                  <IconCalendar className="h-3.5 w-3.5 text-stone-400" />
                  <span>{summary.dateLabel}</span>
                </div>
                <p className="text-2xl font-bold text-stone-900">
                  Day {Math.min(summary.dayNumber, summary.totalDays)}
                  <span className="ml-1.5 text-base font-normal text-stone-400">of {summary.totalDays}</span>
                </p>
                {/* Day journey bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 mt-2">
                  <div
                    className="bar-gradient h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((summary.dayNumber / summary.totalDays) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Overall progress */}
              <div className="rounded-2xl bg-stone-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Overall progress</p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-stone-900">{summary.overallCompleted}</span>
                  <span className="mb-0.5 text-sm font-medium text-stone-400">of {summary.overallTotal} done</span>
                  <span className="mb-0.5 ml-auto text-sm font-semibold text-stone-500">({summary.overallPercent}%)</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="bar-gradient progress-shimmer h-full rounded-full transition-all"
                    style={{ width: `${summary.overallPercent}%` }}
                  />
                </div>
              </div>

              {/* Greeting + headline */}
              <div className="rounded-2xl bg-lavender-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-lavender-500 mb-1">Right now</p>
                <p className="text-lg font-semibold text-stone-900">{summary.greeting}, Noah 👋</p>
                <p className="mt-0.5 text-sm text-stone-500">{summary.headline}</p>
              </div>

              {/* Today's task count */}
              {hasActivity && (
                <div className="rounded-2xl bg-stone-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Today</p>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-stone-900">{summary.todayCompleted}</p>
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-stone-500">{summary.todayTotal}</p>
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-peach-600">{summary.todayRemaining}</p>
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">remaining</p>
                    </div>
                  </div>
                  {/* Today progress bar */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="bar-gradient h-full rounded-full transition-all"
                      style={{ width: `${summary.todayPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Seedling / growth stage */}
              <div className="flex items-center gap-3 rounded-2xl bg-mint-50 px-4 py-3">
                {summary.seedlingStage === 'trophy' ? (
                  <IconTrophy className="h-5 w-5 text-sun-500 shrink-0" />
                ) : summary.seedlingStage === 'tree' ? (
                  <IconTree className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <IconSprout className="h-5 w-5 text-mint-600 shrink-0 animate-float" />
                )}
                <div>
                  <p className="text-sm font-semibold text-stone-800">{summary.seedlingLabel}</p>
                  <p className="text-xs text-stone-500">Your growth stage today</p>
                </div>
              </div>

              {/* Completed today list placeholder — just shows count with checkmark */}
              {summary.todayCompleted > 0 && (
                <div className="flex items-center gap-2 text-xs text-mint-700 font-medium">
                  <IconCheck className="h-3.5 w-3.5 text-mint-500" />
                  <span>{summary.todayCompleted} {summary.todayCompleted === 1 ? 'activity' : 'activities'} completed today</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-stone-100 px-5 py-3">
              <a
                href="/"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
              >
                Go to Today's page →
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Standalone bell button that dispatches the open-notifications event */
export function NotificationBellTrigger({ hasUnread = false }: { hasUnread?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-notifications'))}
      className="relative flex size-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition"
      aria-label="Open daily summary"
      title="Daily summary"
    >
      <IconBell className="h-4.5 w-4.5" />
      {hasUnread && (
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-peach-500" aria-hidden="true" />
      )}
    </button>
  );
}
