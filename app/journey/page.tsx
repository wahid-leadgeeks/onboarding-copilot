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

export default function JourneyPage() {
  const [timelineState, setTimelineState] = useState<TimelineState>(() => getDefaultTimelineState());
  const [isHydrated, setIsHydrated] = useState(false);
  const [copiedStageId, setCopiedStageId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Hydration-safe initial state loading from localStorage
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

  const growthEmoji =
    overallProgress.percentage <= 25
      ? '🌱'
      : overallProgress.percentage <= 75
        ? '🌿'
        : '🌳';

  const progressNote =
    overallProgress.percentage >= 100
      ? 'All 12 deliverables completed! 🌳 Ready for full role activation 🎉'
      : overallProgress.percentage >= 75
        ? 'Almost there! 🌱 Finalizing transition and autonomous ownership.'
        : overallProgress.percentage >= 30
          ? 'Growing steadily — building competence through guided practice.'
          : 'Setting strong roots — absorbing environment, workflows, and standards.';

  return (
    <main
      data-hydrated={isHydrated}
      className="mx-auto min-h-screen max-w-5xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8"
    >
      <PrimaryNav active="Journey" />

      {/* Header */}
      <header className="animate-fade-up pb-8">
        <p className="text-sm font-medium text-stone-500">Your 90-day journey</p>
        <div className="mt-2 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
              Timeline & Evidence. 🗺️
            </h1>
            <p className="mt-3 max-w-xl text-lg text-stone-600">
              Track your 3 official HR stages, complete deliverable evidence, and sync back to your Timeline sheet.
            </p>
          </div>
          <div className="w-fit rounded-full bg-mint-50 px-4 py-1.5 text-sm font-semibold text-mint-700">
            Day {day} of {totalDays}
          </div>
        </div>
      </header>

      {/* Overall Journey Progress Card (Hero) */}
      <section
        aria-labelledby="progress-heading"
        className="animate-fade-up stagger-1 mt-8 rounded-card bg-white p-6 shadow-soft sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 id="progress-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Overall Journey Deliverables
            </h2>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
                {overallProgress.completedDeliverables}
              </span>
              <span className="text-xl font-normal text-stone-400 sm:text-2xl">
                of 12 deliverables completed ({overallProgress.percentage}%)
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-stone-500">
              Across 3 structured stages: Training, Trial, and Transition
            </p>
          </div>
          <span className="animate-float shrink-0 text-5xl sm:text-6xl" aria-hidden="true">
            {growthEmoji}
          </span>
        </div>

        {/* Shimmer Progress Bar */}
        <div
          className="mt-8 h-3 overflow-hidden rounded-full bg-stone-100"
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

        <div className="mt-3 flex justify-between text-xs font-medium text-stone-400">
          <span>0 Deliverables</span>
          <span>6 Halfway</span>
          <span>12 Complete</span>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-stone-600">{progressNote}</p>
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white shadow-soft transition hover:bg-stone-800 hover:shadow-lift active:scale-95 focus-visible:outline-2 focus-visible:outline-stone-900"
            aria-label="Copy entire timeline sheet summary with all 3 stages"
          >
            {copiedAll ? '✓ All 3 Stages Copied! 🌿' : '📋 Copy Entire Timeline Sheet'}
          </button>
        </div>
      </section>

      {/* 3 Stage Cards Section */}
      <section aria-labelledby="stages-heading" className="animate-fade-up stagger-2 mt-12">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Official HR Framework
            </p>
            <h2 id="stages-heading" className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
              The Three Developmental Stages
            </h2>
          </div>
          <p className="text-sm text-stone-500">From knowledge transfer to autonomous ownership</p>
        </div>

        <div className="space-y-8">
          {TIMELINE_STAGES.map((stage, index) => {
            const stageProgress = calculateStageProgress(stage, timelineState);
            const dates = getStageDates(timelineState, stage.id);
            const isCopied = copiedStageId === stage.id;

            return (
              <article
                key={stage.id}
                className={`animate-fade-up stagger-${index + 1} rounded-card bg-white p-6 shadow-soft transition duration-200 hover:shadow-lift sm:p-8 ${
                  stageProgress.isComplete ? 'ring-2 ring-mint-300' : ''
                }`}
              >
                {/* Stage Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                        Stage {stage.stageNumber}
                      </span>
                      <span className="rounded-full bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                        {stage.pedagogy}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          stageProgress.isComplete
                            ? 'bg-mint-50 text-mint-700'
                            : stageProgress.completed > 0
                              ? 'bg-peach-50 text-peach-700'
                              : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {stageProgress.isComplete
                          ? 'Done ✓'
                          : stageProgress.completed > 0
                            ? 'In Progress'
                            : 'Upcoming'}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-semibold text-stone-900 sm:text-2xl">
                      {stage.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-stone-500">
                      <span>{stage.pedagogicalSubtitle}</span>
                      <span>•</span>
                      <span>Duration: {stage.duration}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-semibold text-stone-900">
                      {stageProgress.completed}
                      <span className="text-sm font-normal text-stone-400">/{stageProgress.total}</span>
                    </span>
                    <p className="text-xs font-medium text-stone-400">deliverables</p>
                  </div>
                </div>

                {/* Objective Callout Block */}
                <div className="mt-4 rounded-2xl bg-cream/70 p-4 text-sm leading-relaxed text-stone-700">
                  <span className="font-semibold text-stone-900">Objective: </span>
                  {stage.objective}
                </div>

                {/* Stage Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold text-stone-400">
                    <span className="uppercase tracking-[0.16em]">Stage Completion</span>
                    <span>
                      {stageProgress.completed} of {stageProgress.total} items · {stageProgress.percentage}%
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"
                    role="progressbar"
                    aria-label={`${stage.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={stageProgress.total}
                    aria-valuenow={stageProgress.completed}
                  >
                    <div
                      className="bar-gradient progress-shimmer h-full rounded-full transition-all duration-300"
                      style={{ width: `${stageProgress.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Editable Date Range Inputs */}
                <div className="mt-6 border-t border-stone-100 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Timeline Dates (Sheet Columns C & D)
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`start-${stage.id}`}
                        className="block text-xs font-medium text-stone-600 mb-1"
                      >
                        Start Date
                      </label>
                      <input
                        id={`start-${stage.id}`}
                        type="date"
                        value={formatTimelineDateForInput(dates.startDate)}
                        onChange={(e) => handleDateChange(stage.id, 'startDate', e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-sm text-stone-900 transition hover:bg-stone-50 focus:border-mint-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint-100"
                      />
                      <span className="mt-1 block text-xs text-stone-400">
                        Spreadsheet: {formatTimelineDateForSheet(dates.startDate) || '—'}
                      </span>
                    </div>
                    <div>
                      <label
                        htmlFor={`end-${stage.id}`}
                        className="block text-xs font-medium text-stone-600 mb-1"
                      >
                        End Date
                      </label>
                      <input
                        id={`end-${stage.id}`}
                        type="date"
                        value={formatTimelineDateForInput(dates.endDate)}
                        onChange={(e) => handleDateChange(stage.id, 'endDate', e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-sm text-stone-900 transition hover:bg-stone-50 focus:border-mint-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint-100"
                      />
                      <span className="mt-1 block text-xs text-stone-400">
                        Spreadsheet: {formatTimelineDateForSheet(dates.endDate) || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidence Checklist */}
                <div className="mt-6 border-t border-stone-100 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                      Outputs / Evidence Checklist
                    </h4>
                    <span className="text-xs text-stone-400">
                      {stageProgress.completed} of {stageProgress.total} verified
                    </span>
                  </div>

                  <ul className="space-y-2.5" role="list">
                    {stage.deliverables.map((item) => {
                      const isCompleted = Boolean(
                        timelineState.completedEvidence?.[item.id] ??
                          timelineState.stages?.[stage.stageNumber]?.evidence?.[item.id] ??
                          timelineState.stages?.[stage.id]?.evidence?.[item.id]
                      );

                      return (
                        <li key={item.id}>
                          <label
                            htmlFor={item.id}
                            className={`group flex min-h-11 cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 transition select-none ${
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
                              className={`flex size-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                                isCompleted
                                  ? 'border-mint-500 bg-mint-500 text-white animate-spring-in'
                                  : 'border-stone-300 bg-white text-transparent group-hover:border-stone-400'
                              }`}
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span
                              className={`text-sm font-medium transition ${
                                isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'
                              }`}
                            >
                              {item.text}
                            </span>
                            {isCompleted ? (
                              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-0.5 text-xs font-semibold text-mint-700">
                                ✓ Done
                              </span>
                            ) : (
                              <span className="ml-auto text-xs text-stone-400 group-hover:text-stone-500">
                                Pending
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Stage Copy TSV Footer */}
                <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-stone-400">
                    Copies 9-column TSV row matching columns A–I of the Timeline sheet.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyStage(stage.id)}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 focus-visible:outline-2 ${
                      isCopied
                        ? 'bg-mint-500 text-white shadow-soft focus-visible:outline-mint-500'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 focus-visible:outline-stone-400'
                    }`}
                    aria-label={`Copy Timeline sheet row for Stage ${stage.stageNumber}`}
                  >
                    {isCopied ? '✓ Copied for Timeline! 🌿' : '📋 Copy Stage TSV'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Call to Action aside */}
      <aside className="animate-fade-up stagger-4 mt-12 rounded-card bg-lavender-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <p className="text-base font-semibold text-lavender-700">Make today count. ✨</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">Your next step is waiting on Today.</p>
        </div>
        <a
          href="/"
          className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 sm:mt-0"
        >
          Go to Today
        </a>
      </aside>
    </main>
  );
}
