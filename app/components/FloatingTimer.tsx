'use client';

import React, { useEffect, useState } from 'react';
import type { Activity } from '@/lib/types/activity';
import { calculateElapsedSeconds, formatStopwatch } from '@/lib/session/stopwatch';

export interface FloatingTimerProps {
  activity: Activity | null;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedMs: number;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onScrollToTimer: () => void;
}

export function FloatingTimer({
  activity,
  startedAt,
  pausedAt,
  accumulatedMs,
  onPause,
  onResume,
  onFinish,
  onScrollToTimer,
}: FloatingTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    calculateElapsedSeconds(startedAt, Date.now(), pausedAt, accumulatedMs)
  );
  const [isVisible, setIsVisible] = useState(false);

  // Update live clock every second while running
  useEffect(() => {
    if (!startedAt) return;

    // Immediately compute current elapsed
    setElapsed(calculateElapsedSeconds(startedAt, Date.now(), pausedAt, accumulatedMs));

    if (pausedAt) return; // frozen when paused

    const interval = setInterval(() => {
      setElapsed(calculateElapsedSeconds(startedAt, Date.now(), pausedAt, accumulatedMs));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, pausedAt, accumulatedMs]);

  // Show floating pill only when user scrolls down past the main timer card
  useEffect(() => {
    function handleScroll() {
      if (!startedAt) {
        setIsVisible(false);
        return;
      }
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > 300);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [startedAt]);

  if (!startedAt || !isVisible || !activity) return null;

  const isPaused = Boolean(pausedAt);
  const formatted = formatStopwatch(elapsed);
  const title = activity.name.split('\n')[0];

  return (
    <div
      role="region"
      aria-label="Active activity stopwatch"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3.5 rounded-full bg-stone-900/95 px-5 py-2.5 text-stone-50 shadow-2xl backdrop-blur-md border border-stone-800 animate-pop-in transition hover:bg-stone-900"
    >
      {/* Activity indicator and name */}
      <button
        type="button"
        onClick={onScrollToTimer}
        className="flex items-center gap-2.5 text-left group min-w-0 max-w-[180px] sm:max-w-xs focus:outline-hidden"
        title="Click to jump back to stopwatch card"
      >
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isPaused ? 'bg-amber-400' : 'bg-mint-400 animate-pulse-soft'
          }`}
        />
        <span className="truncate text-xs font-semibold text-stone-200 group-hover:text-white transition">
          {title}
        </span>
      </button>

      {/* Digital Stopwatch Display */}
      <div
        className="font-mono text-sm font-bold tracking-wider text-mint-400 tabular-nums px-2 py-0.5 rounded-md bg-stone-800/90"
        aria-live="off"
      >
        {formatted.display}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isPaused ? (
          <button
            type="button"
            onClick={onResume}
            className="rounded-full bg-mint-500/20 px-2.5 py-1 text-xs font-semibold text-mint-300 hover:bg-mint-500/30 transition active:scale-95"
            title="Resume stopwatch"
          >
            ▶️ Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="rounded-full bg-stone-800 px-2.5 py-1 text-xs font-semibold text-stone-300 hover:bg-stone-700 hover:text-white transition active:scale-95"
            title="Pause stopwatch"
          >
            ⏸️ Pause
          </button>
        )}

        <button
          type="button"
          onClick={onFinish}
          className="rounded-full bg-mint-600 px-3 py-1 text-xs font-semibold text-white hover:bg-mint-500 transition active:scale-95 shadow-xs"
          title="Finish and log activity"
        >
          ⏹️ Finish
        </button>
      </div>
    </div>
  );
}
