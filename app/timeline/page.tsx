'use client';

import { useEffect, useState } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import {
  TIMELINE_STAGES,
  TIMELINE_STORAGE_KEY,
  calculateStageProgress,
  calculateTimelineProgress,
  clipboardRowForTimelineStage,
  clipboardSummaryForTimeline,
  formatTimelineDateForInput,
  formatTimelineDateForSheet,
  getDefaultTimelineState,
  getStageDates,
  readTimelineState,
  toggleEvidenceItem,
  updateStageDates,
  writeTimelineState,
} from '@/lib/timeline';
import type { StageDates, TimelineState } from '@/lib/types/timeline';

const totalDays = 90;
const journeyStart = Date.UTC(2026, 8, 1); // September 1, 2026

function getJourneyDay(now: Date): number {
  const elapsedDays = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - journeyStart) / 86400000
  );
  return Math.min(totalDays, Math.max(1, elapsedDays + 1));
}

export default function TimelinePage() {
  const [timelineState, setTimelineState] = useState<TimelineState>(() => getDefaultTimelineState());
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeStageNumber, setActiveStageNumber] = useState<'1.0' | '2.0' | '3.0'>('1.0');
  const [copiedStageId, setCopiedStageId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
      if (raw) {
        setTimelineState(readTimelineState(raw));
      }
    } catch {
      /* ignore storage read error */
    } finally {
      setIsHydrated(true);
    }
  }, []);

  function persist(nextState: TimelineState) {
    setTimelineState(nextState);
    try {
      localStorage.setItem(TIMELINE_STORAGE_KEY, writeTimelineState(nextState));
    } catch {
      /* ignore storage write error */
    }
  }

  function handleDateChange(stageId: string, field: keyof StageDates, value: string) {
    const nextState = updateStageDates(timelineState, stageId, { [field]: value });
    persist(nextState);
  }

  function handleToggleEvidence(evidenceId: string) {
    const nextState = toggleEvidenceItem(timelineState, evidenceId);
    persist(nextState);
  }

  async function handleCopyStage(stageId: string) {
    const row = clipboardRowForTimelineStage(stageId, timelineState);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedStageId(stageId);
        setTimeout(() => setCopiedStageId(null), 2500);
      }
    } catch {
      /* ignore clipboard error */
    }
  }

  async function handleCopyAll() {
    const summary = clipboardSummaryForTimeline(timelineState);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2500);
      }
    } catch {
      /* ignore clipboard error */
    }
  }

  const day = getJourneyDay(new Date());
  const overallProgress = calculateTimelineProgress(timelineState, { currentDate: new Date() });

  const activeStage = TIMELINE_STAGES.find((s) => s.stageNumber === activeStageNumber) ?? TIMELINE_STAGES[0];
  const activeStageProgress = calculateStageProgress(activeStage, timelineState);
  const activeDates = getStageDates(timelineState, activeStage.id);

  const growthEmoji =
    overallProgress.percentage <= 25
      ? '🌱'
      : overallProgress.percentage <= 75
        ? '🌿'
        : '🌳';

  return (
    <main
      data-hydrated={isHydrated}
      className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8"
    >
      <PrimaryNav active="Timeline" />

      {/* Header */}
      <header className="animate-fade-up pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-stone-500">Sheet: Timeline · 90-Day Journey</p>
          <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700">
            Day {day} of {totalDays}
          </span>
        </div>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Timeline & Evidence 🗺️
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Track your 3 onboarding stages, verify output deliverables, and copy rows directly into your Timeline sheet.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-stone-800 active:scale-95 shrink-0"
            aria-label="Copy entire timeline sheet summary with all 3 stages"
          >
            {copiedAll ? '✓ All 3 Stages Copied! 🌿' : '📋 Copy Entire Timeline Sheet'}
          </button>
        </div>
      </header>

      {/* Holistic Progress Bar */}
      <section className="animate-fade-up stagger-1 rounded-card bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Overall Journey Deliverables
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-stone-900">
                {overallProgress.completedDeliverables}
              </span>
              <span className="text-sm font-normal text-stone-400">
                / {overallProgress.totalDeliverables} deliverables ({overallProgress.percentage}%)
              </span>
            </div>
          </div>
          <span className="text-3xl sm:text-4xl" aria-hidden="true">
            {growthEmoji}
          </span>
        </div>

        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"
          role="progressbar"
          aria-label="Overall journey deliverables progress"
          aria-valuemin={0}
          aria-valuemax={overallProgress.totalDeliverables}
          aria-valuenow={overallProgress.completedDeliverables}
        >
          <div
            className="bar-gradient progress-shimmer h-full rounded-full transition-all duration-500"
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
      </section>

      {/* Stage Selector Tabs - Single View Page Principle */}
      <div className="animate-fade-up stagger-2 mt-6" role="tablist" aria-label="Timeline Stages">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-stone-100 p-1">
          {TIMELINE_STAGES.map((st) => {
            const sp = calculateStageProgress(st, timelineState);
            const isSelected = activeStageNumber === st.stageNumber;
            return (
              <button
                key={st.stageNumber}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveStageNumber(st.stageNumber)}
                className={`flex flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition ${
                  isSelected
                    ? 'bg-white font-semibold text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">Stage {st.stageNumber}</span>
                  {sp.isComplete && (
                    <span className="text-[10px] text-mint-600 font-bold">✓</span>
                  )}
                </div>
                <span className="mt-0.5 text-[11px] text-stone-400 truncate max-w-full">
                  {st.stageNumber === '1.0' ? 'Training' : st.stageNumber === '2.0' ? 'Trial' : 'Transition'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Stage Single View Card */}
      <section
        className={`animate-fade-up stagger-3 mt-4 rounded-card bg-white p-6 shadow-soft sm:p-7 ${
          activeStageProgress.isComplete ? 'ring-2 ring-mint-300' : ''
        }`}
        aria-labelledby="active-stage-title"
      >
        {/* Stage Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                Stage {activeStage.stageNumber}
              </span>
              <span className="rounded-full bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                {activeStage.pedagogy}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  activeStageProgress.isComplete
                    ? 'bg-mint-50 text-mint-700'
                    : activeStageProgress.completed > 0
                      ? 'bg-peach-50 text-peach-700'
                      : 'bg-stone-100 text-stone-500'
                }`}
              >
                {activeStageProgress.isComplete
                  ? 'Done ✓'
                  : activeStageProgress.completed > 0
                    ? 'In Progress'
                    : 'Upcoming'}
              </span>
            </div>
            <h2 id="active-stage-title" className="mt-2 text-xl font-semibold text-stone-900 sm:text-2xl">
              {activeStage.title}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-stone-500">
              {activeStage.pedagogicalSubtitle} · Duration: {activeStage.duration}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold text-stone-900">
              {activeStageProgress.completed}
              <span className="text-sm font-normal text-stone-400">/{activeStageProgress.total}</span>
            </span>
            <p className="text-[11px] font-medium text-stone-400">deliverables ({activeStageProgress.percentage}%)</p>
          </div>
        </div>

        {/* Objective */}
        <div className="mt-4 rounded-xl bg-cream/70 p-3.5 text-xs leading-relaxed text-stone-700">
          <span className="font-semibold text-stone-900">Objective: </span>
          {activeStage.objective}
        </div>

        {/* Editable Dates */}
        <div className="mt-5 border-t border-stone-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            Timeline Dates (Sheet Columns C & D)
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`start-${activeStage.id}`} className="block text-xs font-medium text-stone-600 mb-1">
                Start Date
              </label>
              <input
                id={`start-${activeStage.id}`}
                type="date"
                value={formatTimelineDateForInput(activeDates.startDate)}
                onChange={(e) => handleDateChange(activeStage.id, 'startDate', e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-900 transition hover:bg-stone-50 focus:border-mint-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint-100"
              />
              <span className="mt-0.5 block text-[11px] text-stone-400">
                Spreadsheet: {formatTimelineDateForSheet(activeDates.startDate) || '—'}
              </span>
            </div>
            <div>
              <label htmlFor={`end-${activeStage.id}`} className="block text-xs font-medium text-stone-600 mb-1">
                End Date
              </label>
              <input
                id={`end-${activeStage.id}`}
                type="date"
                value={formatTimelineDateForInput(activeDates.endDate)}
                onChange={(e) => handleDateChange(activeStage.id, 'endDate', e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-900 transition hover:bg-stone-50 focus:border-mint-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint-100"
              />
              <span className="mt-0.5 block text-[11px] text-stone-400">
                Spreadsheet: {formatTimelineDateForSheet(activeDates.endDate) || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Evidence Checklist */}
        <div className="mt-5 border-t border-stone-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Outputs / Evidence Checklist (Columns G & H)
            </h3>
            <span className="text-xs text-stone-400">
              {activeStageProgress.completed} of {activeStageProgress.total} verified
            </span>
          </div>

          <ul className="space-y-2" role="list">
            {activeStage.deliverables.map((item) => {
              const isCompleted = Boolean(
                timelineState.completedEvidence?.[item.id] ??
                  timelineState.stages?.[activeStage.stageNumber]?.evidence?.[item.id] ??
                  timelineState.stages?.[activeStage.id]?.evidence?.[item.id]
              );

              return (
                <li key={item.id}>
                  <label
                    htmlFor={item.id}
                    className={`group flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition select-none ${
                      isCompleted
                        ? 'border-mint-100 bg-mint-50/40 text-stone-700'
                        : 'border-stone-100 bg-white text-stone-800 hover:border-stone-200 hover:bg-stone-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={isCompleted}
                      onChange={() => handleToggleEvidence(item.id)}
                      className="sr-only peer"
                    />
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold transition-all ${
                        isCompleted
                          ? 'border-mint-500 bg-mint-500 text-white'
                          : 'border-stone-300 bg-white text-transparent group-hover:border-stone-400'
                      }`}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span
                      className={`text-xs font-medium transition ${
                        isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'
                      }`}
                    >
                      {item.text}
                    </span>
                    {isCompleted ? (
                      <span className="ml-auto inline-flex items-center rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-semibold text-mint-700">
                        ✓ Done
                      </span>
                    ) : (
                      <span className="ml-auto text-[11px] text-stone-400 group-hover:text-stone-500">
                        Pending
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Stage Footer: Copy TSV */}
        <div className="mt-5 flex flex-col gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-stone-400">
            Copies 9-column TSV row (Cols A–I) for Stage {activeStage.stageNumber} to paste into Timeline sheet.
          </p>
          <button
            type="button"
            onClick={() => handleCopyStage(activeStage.id)}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95 ${
              copiedStageId === activeStage.id
                ? 'bg-mint-500 text-white shadow-soft'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
            aria-label={`Copy Timeline row for Stage ${activeStage.stageNumber}`}
          >
            {copiedStageId === activeStage.id ? '✓ Copied Stage TSV!' : '📋 Copy Stage TSV'}
          </button>
        </div>
      </section>

      {/* Compact Quick Link */}
      <footer className="mt-8 flex justify-between items-center text-xs text-stone-400">
        <a href="/" className="hover:text-stone-700 transition">← Back to Schedule</a>
        <a href="/diary" className="hover:text-stone-700 transition">Go to Onboarding Diary →</a>
      </footer>
    </main>
  );
}
