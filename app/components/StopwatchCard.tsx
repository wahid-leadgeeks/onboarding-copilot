'use client';

import React, { useEffect, useState } from 'react';
import type { Activity } from '@/lib/types/activity';
import {
  type ScheduleActivity,
  getPicBadge,
  getProgressBadge,
  calculateDurationFromTimes,
} from '@/lib/schedule-catalog';
import {
  calculateElapsedSeconds,
  calculateProgressPercentage,
  calculateStopwatchDurationMinutes,
  formatStopwatch,
  formatTimeHHMM,
} from '@/lib/session/stopwatch';
import {
  IconCheck,
  IconClock,
  IconEdit,
  IconNote,
  IconClipboard,
  IconPlay,
  IconPause,
  IconStop,
  IconRefresh,
  IconSearch,
  IconChevronDown,
  IconX,
  IconRocket,
} from './Icons';

export interface StopwatchCardProps {
  activity: Activity | null;
  scheduleCatalog: ScheduleActivity[];
  startedAt: number | null;
  finishedAt: number | null;
  pausedAt: number | null;
  accumulatedMs: number;
  onStart: (activity: Activity) => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onReset: () => void;
  onSelectActivity: (activity: Activity) => void;
  onAdjustTime?: (deltaSeconds: number) => void;
  onFillSchedule: () => void;
  onWriteReflection: () => void;
  onCopyGtoK: () => void;
  copiedGtoKToast?: boolean;
  onDirectSyncToSheets?: () => Promise<void>;
  isSyncingSheets?: boolean;
}

export function StopwatchCard({
  activity,
  scheduleCatalog,
  startedAt,
  finishedAt,
  pausedAt,
  accumulatedMs,
  onStart,
  onPause,
  onResume,
  onFinish,
  onReset,
  onSelectActivity,
  onAdjustTime,
  onFillSchedule,
  onWriteReflection,
  onCopyGtoK,
  copiedGtoKToast = false,
  onDirectSyncToSheets,
  isSyncingSheets = false,
}: StopwatchCardProps) {
  const [elapsed, setElapsed] = useState(() => {
    const endPoint = finishedAt || Date.now();
    return calculateElapsedSeconds(startedAt, endPoint, pausedAt, accumulatedMs);
  });
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Keep live stopwatch ticking every second
  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    if (finishedAt) {
      setElapsed(calculateElapsedSeconds(startedAt, finishedAt, pausedAt, accumulatedMs));
      return;
    }

    setElapsed(calculateElapsedSeconds(startedAt, Date.now(), pausedAt, accumulatedMs));

    if (pausedAt) return;

    const timer = setInterval(() => {
      setElapsed(calculateElapsedSeconds(startedAt, Date.now(), pausedAt, accumulatedMs));
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, finishedAt, pausedAt, accumulatedMs]);

  const isRunning = Boolean(startedAt && !pausedAt && !finishedAt);
  const isPaused = Boolean(startedAt && pausedAt && !finishedAt);
  const isFinished = Boolean(finishedAt);

  const formatted = formatStopwatch(elapsed);
  const matchedSchedule = scheduleCatalog.find((s) => s.id === activity?.id);
  const fullTopic = matchedSchedule?.topic || activity?.name || '';
  const lines = fullTopic.split('\n');
  const topicTitle = lines[0] || 'Choose an onboarding topic to begin';
  const subtopics = lines.slice(1);
  const pic = matchedSchedule?.pic || activity?.pic || (activity?.type === 'welcome' ? 'Experience Manager' : 'IT Manager');
  const targetMinutes = matchedSchedule?.durationMinutes ?? activity?.durationMinutes;
  const progressPercent = targetMinutes ? calculateProgressPercentage(elapsed, targetMinutes) : 0;
  const isOvertime = Boolean(targetMinutes && elapsed > targetMinutes * 60);

  // Filtered list for activity switcher
  const filteredSchedule = selectorSearch.trim()
    ? scheduleCatalog.filter((s) => {
        const q = selectorSearch.toLowerCase();
        return (
          s.topic.toLowerCase().includes(q) ||
          s.pic.toLowerCase().includes(q) ||
          s.week.toLowerCase().includes(q) ||
          `row ${s.rowNumber}`.includes(q)
        );
      })
    : scheduleCatalog.slice(0, 20);

  // Completion View
  if (isFinished) {
    const startStr = startedAt ? formatTimeHHMM(startedAt) : (matchedSchedule?.startTime || '—');
    const endStr = finishedAt ? formatTimeHHMM(finishedAt) : (matchedSchedule?.endTime || '—');

    // Calculate duration from time window (handles crossing midnight)
    const timeWindowMins = (startStr !== '—' && endStr !== '—')
      ? calculateDurationFromTimes(startStr, endStr)
      : undefined;

    // Calculate timestamp elapsed duration
    const timestampElapsedSecs = (startedAt && finishedAt)
      ? calculateElapsedSeconds(startedAt, finishedAt, pausedAt, accumulatedMs)
      : elapsed;
    const computedDurationMins = calculateStopwatchDurationMinutes(timestampElapsedSecs);

    // Prefer accurate duration:
    // If matchedSchedule already has a valid duration > 1, use it.
    // If not or if it was 1 but the time window (e.g. 23:44 -> 00:34) is 50m, use the time window.
    const finalElapsedMins =
      matchedSchedule?.durationMinutes && matchedSchedule.durationMinutes > 1
        ? matchedSchedule.durationMinutes
        : timeWindowMins && timeWindowMins > 0
        ? timeWindowMins
        : computedDurationMins > 0
        ? computedDurationMins
        : matchedSchedule?.durationMinutes || Math.max(1, Math.round(elapsed / 60));

    return (
      <section
        id="stopwatch-cockpit"
        data-tour="current-activity"
        className="animate-pop-in mt-10 rounded-card bg-white p-8 shadow-soft"
      >
        <div className="flex items-center gap-4">
          <span className="animate-spring-in flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-mint-700">
            <IconCheck className="h-7 w-7 stroke-[2.5]" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-mint-700">
              Activity Completed
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Session recorded locally</p>
          </div>
        </div>

        {/* Spreadsheet Row Context Badges */}
        {matchedSchedule && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
              Row {matchedSchedule.rowNumber}
            </span>
            <span className="text-xs font-medium text-stone-500">
              #{matchedSchedule.activityCount} · {matchedSchedule.day}, {matchedSchedule.date}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPicBadge(matchedSchedule.pic)}`}>
              {matchedSchedule.pic}
            </span>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
              {matchedSchedule.mainMedia}
            </span>
          </div>
        )}

        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
          {topicTitle}
        </h2>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-2xl bg-stone-50 p-4 border border-stone-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Logged Duration
            </span>
            <p className="font-mono text-3xl font-bold text-stone-900">{finalElapsedMins} min</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Time Window
            </span>
            <p className="font-mono text-xl font-semibold text-stone-700">
              {startStr} → {endStr}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Status
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-0.5 text-xs font-semibold text-mint-800 mt-1">
              <IconCheck className="h-3 w-3" /> Done
            </span>
          </div>
        </div>

        <p className="mt-4 text-stone-500">Nice. That’s one less thing to carry around.</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {onDirectSyncToSheets && (
            <button
              type="button"
              disabled={isSyncingSheets}
              onClick={onDirectSyncToSheets}
              className="inline-flex items-center gap-2 min-h-12 rounded-full bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-700 active:scale-95 shadow-xs disabled:opacity-50"
            >
              <IconRocket className="h-4 w-4" />
              <span>{isSyncingSheets ? 'Syncing to Google Sheets…' : 'Sync to Google Sheets'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onFillSchedule}
            className="inline-flex items-center gap-2 min-h-12 rounded-full border border-stone-200 bg-white px-6 py-3 font-semibold text-stone-800 transition hover:bg-stone-50 active:scale-95 shadow-2xs"
          >
            <IconEdit className="h-4 w-4" />
            <span>Fill / Edit Row in Schedule</span>
          </button>
          <button
            type="button"
            onClick={onWriteReflection}
            className="inline-flex items-center gap-2 min-h-12 rounded-full bg-mint-700 px-6 py-3 font-semibold text-white transition hover:bg-mint-800 active:scale-95 shadow-xs"
          >
            <IconNote className="h-4 w-4" />
            <span>Write Diary Reflection</span>
          </button>
          <button
            type="button"
            onClick={onCopyGtoK}
            className="inline-flex items-center gap-2 min-h-12 rounded-full bg-stone-100 px-5 py-3 font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95"
            title="Copy tab-separated Duration, Start, End, Progress, Notes to clipboard"
          >
            {copiedGtoKToast ? (
              <>
                <IconCheck className="h-4 w-4 text-mint-600" />
                <span>Copied Cols G–K</span>
              </>
            ) : (
              <>
                <IconClipboard className="h-4 w-4" />
                <span>Copy Cols G–K TSV</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="min-h-12 rounded-full px-6 py-3 font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
          >
            Continue to Next Activity
          </button>
        </div>
      </section>
    );
  }

  // Active / Ready Stopwatch View
  return (
    <section
      id="stopwatch-cockpit"
      data-tour="current-activity"
      className="animate-fade-up stagger-1 mt-10 rounded-card bg-white p-6 sm:p-8 shadow-soft transition hover:shadow-lift"
    >
      {/* Header status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-mint-500 animate-pulse-soft" />
              <IconClock className="h-3.5 w-3.5 text-mint-600" />
              <span className="text-mint-700 font-bold">Stopwatch Running</span>
              <span className="text-stone-400">· Started at {startedAt ? formatTimeHHMM(startedAt) : ''}</span>
            </>
          ) : isPaused ? (
            <>
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <IconPause className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-amber-700 font-bold">Stopwatch Paused</span>
              <span className="text-stone-400">· Paused at {pausedAt ? formatTimeHHMM(pausedAt) : ''}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span className="text-stone-500">Right Now · Ready</span>
            </>
          )}
        </div>

        {/* Activity Switcher trigger */}
        <button
          type="button"
          onClick={() => setSelectorOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-200 transition active:scale-95"
        >
          {selectorOpen ? (
            <>
              <span>Close Picker</span>
              <IconX className="h-3 w-3" />
            </>
          ) : (
            <>
              <span>Switch Topic</span>
              <IconChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {/* Activity Switcher Dropdown */}
      {selectorOpen && (
        <div className="mt-4 rounded-2xl bg-stone-50 border border-stone-200/80 p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <IconSearch className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              value={selectorSearch}
              onChange={(e) => setSelectorSearch(e.target.value)}
              placeholder="Search topic or row to focus..."
              className="w-full text-xs bg-white rounded-lg px-3 py-1.5 border border-stone-200 focus:outline-hidden"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredSchedule.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelectActivity({
                    id: s.id,
                    name: s.topic,
                    type: s.pic === 'HRD' ? 'welcome' : s.pic.includes('IT') ? 'setup' : 'learning',
                    plannedStart: s.startTime || 'TBD',
                    plannedEnd: s.endTime || 'TBD',
                    durationMinutes: s.durationMinutes,
                    status: s.progress === 'Done' ? 'done' : 'not-started',
                    pic: s.pic,
                    day: s.day,
                    date: s.date,
                  });
                  setSelectorOpen(false);
                }}
                className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-white cursor-pointer transition"
              >
                <div className="truncate pr-2">
                  <span className="font-bold text-stone-900 mr-2">Row {s.rowNumber}</span>
                  <span className="text-stone-700">{s.topic.split('\n')[0]}</span>
                </div>
                <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-200/60 text-stone-600">
                  {s.durationMinutes ? `${s.durationMinutes}m` : 'TBD'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic Title & Badges */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          {matchedSchedule && (
            <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
              Row {matchedSchedule.rowNumber}
            </span>
          )}
          {(matchedSchedule || activity) && (
            <span className="text-xs font-medium text-stone-500">
              {matchedSchedule?.activityCount ? `#${matchedSchedule.activityCount} · ` : ''}
              {matchedSchedule?.day || activity?.day || 'Day'}
              {matchedSchedule?.date ? `, ${matchedSchedule.date}` : activity?.date ? `, ${activity.date}` : ''}
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPicBadge(matchedSchedule?.pic || pic)}`}>
            {matchedSchedule?.pic || pic}
          </span>
          {matchedSchedule?.mainMedia && (
            <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600">
              {matchedSchedule.mainMedia}
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getProgressBadge(isRunning ? 'In Progress' : matchedSchedule?.progress || 'Not Started')}`}>
            {isRunning ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-peach-500 animate-pulse" />
                <span>In Progress</span>
              </span>
            ) : (
              matchedSchedule?.progress || 'Not Started'
            )}
          </span>
          {targetMinutes ? (
            <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-700">
              Target: {targetMinutes} min
            </span>
          ) : (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
              Flexible / TBD
            </span>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 leading-snug">
          {topicTitle}
        </h2>

        {subtopics.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setDetailsExpanded((o) => !o)}
              className="text-xs font-medium text-stone-500 hover:text-stone-800 underline underline-offset-2 inline-flex items-center gap-1"
            >
              <span>{detailsExpanded ? 'Hide outline ▴' : `View ${subtopics.length} outline details ▾`}</span>
            </button>
            {detailsExpanded && (
              <ul className="mt-2 space-y-1 rounded-2xl bg-stone-50 p-3.5 text-xs text-stone-700 border border-stone-100 animate-fade-in">
                {subtopics.map((sub, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-stone-400 font-bold">•</span>
                    <span>{sub.replace(/^[-*•]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Digital Stopwatch Display */}
      <div className="mt-6 rounded-3xl bg-stone-50 border border-stone-100 p-6 sm:p-8 text-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400 block mb-2">
          {isRunning ? 'Elapsed Stopwatch Time' : isPaused ? 'Paused Stopwatch Time' : 'Stopwatch Ready'}
        </span>

        {/* Big numbers */}
        <div
          className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-stone-900 tabular-nums select-none"
          aria-live="polite"
        >
          {formatted.display}
        </div>

        {/* Target comparison progress bar */}
        {targetMinutes ? (
          <div className="mt-5 max-w-md mx-auto">
            <div className="h-2.5 w-full rounded-full bg-stone-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isOvertime ? 'bg-amber-500' : 'bg-mint-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>{Math.floor(elapsed / 60)} min logged</span>
              <span>
                {isOvertime ? (
                  <span className="text-amber-700 font-bold">
                    +{Math.floor((elapsed - targetMinutes * 60) / 60)}m overtime
                  </span>
                ) : (
                  <span>{Math.max(0, targetMinutes - Math.floor(elapsed / 60))}m remaining</span>
                )}
              </span>
              <span>Target: {targetMinutes}m</span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-stone-500">
            {isRunning ? 'Ticking live · take as much time as you need' : 'Flexible duration topic'}
          </p>
        )}
      </div>

      {/* Action Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!startedAt ? (
          <button
            type="button"
            onClick={() => {
              if (activity) onStart(activity);
            }}
            disabled={!activity}
            className="inline-flex items-center justify-center gap-2 min-h-12 w-full sm:w-auto rounded-full bg-stone-900 px-8 py-3.5 text-base font-bold text-white transition hover:bg-stone-700 active:scale-95 shadow-md disabled:opacity-50"
          >
            <IconPlay className="h-5 w-5 fill-current" />
            <span>Start Stopwatch</span>
          </button>
        ) : isPaused ? (
          <>
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center gap-2 min-h-12 rounded-full bg-mint-700 px-6 py-3 font-semibold text-white transition hover:bg-mint-800 active:scale-95 shadow-xs"
            >
              <IconPlay className="h-4 w-4 fill-current" />
              <span>Resume Stopwatch</span>
            </button>
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center gap-2 min-h-12 rounded-full bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-700 active:scale-95 shadow-xs"
            >
              <IconStop className="h-4 w-4 fill-current" />
              <span>Finish & Stop</span>
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 min-h-12 rounded-full bg-stone-100 px-5 py-3 font-medium text-stone-600 transition hover:bg-stone-200 active:scale-95"
            >
              <IconRefresh className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onPause}
              className="inline-flex items-center gap-2 min-h-12 rounded-full bg-stone-100 px-6 py-3 font-semibold text-stone-700 transition hover:bg-stone-200 active:scale-95"
            >
              <IconPause className="h-4 w-4 fill-current" />
              <span>Pause Stopwatch</span>
            </button>
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center gap-2 min-h-12 rounded-full bg-stone-900 px-8 py-3.5 text-base font-bold text-white transition hover:bg-stone-700 active:scale-95 shadow-md"
            >
              <IconStop className="h-4 w-4 fill-current" />
              <span>Finish & Stop</span>
            </button>
            {onAdjustTime && (
              <div className="hidden sm:flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => onAdjustTime(300)}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition"
                  title="Add 5 minutes"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustTime(900)}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition"
                  title="Add 15 minutes"
                >
                  +15m
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 min-h-12 rounded-full px-5 py-3 font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
            >
              <IconRefresh className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
