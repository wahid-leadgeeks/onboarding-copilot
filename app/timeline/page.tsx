'use client';

import { useEffect, useState } from 'react';
import {
  TIMELINE_STAGES,
  TIMELINE_STORAGE_KEY,
  calculateStageProgress,
  calculateTimelineProgress,
  clipboardRowForTimelineStage,
  clipboardSummaryForTimeline,
  getDefaultTimelineState,
  getStageDates,
  readTimelineState,
  toggleEvidenceItem,
  updateStageDates,
  writeTimelineState,
} from '@/lib/timeline';
import type { StageDates, TimelineStage, TimelineState } from '@/lib/types/timeline';
import { StageDetailSheet } from '@/app/components/StageDetailSheet';
import {
  IconCheck,
  IconClipboard,
  IconSprout,
  IconTree,
  IconTrophy,
} from '@/app/components/Icons';

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
  const [activeStage, setActiveStage] = useState<TimelineStage | null>(null);
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

  const growthIcon =
    overallProgress.percentage <= 25
      ? 'sprout'
      : overallProgress.percentage <= 75
      ? 'tree'
      : 'trophy';

  // Previous & Next navigation for active stage in drawer
  const currentStageIndex = activeStage
    ? TIMELINE_STAGES.findIndex((s) => s.id === activeStage.id)
    : -1;
  const hasPrev = currentStageIndex > 0;
  const hasNext = currentStageIndex >= 0 && currentStageIndex < TIMELINE_STAGES.length - 1;
  const onPrevStage = hasPrev ? () => setActiveStage(TIMELINE_STAGES[currentStageIndex - 1]) : undefined;
  const onNextStage = hasNext ? () => setActiveStage(TIMELINE_STAGES[currentStageIndex + 1]) : undefined;

  return (
    <main
      data-hydrated={isHydrated}
      className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8"
    >
      {/* Header */}
      <header className="animate-fade-up pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Worksheet: Timeline (Columns A–I)
          </p>
          <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700">
            Day {day} of {totalDays}
          </span>
        </div>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Timeline &amp; Evidence
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              3 onboarding stages, output deliverables, and 1-click Google Sheets TSV synchronization.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-stone-800 active:scale-95 shrink-0"
            aria-label="Copy entire timeline sheet summary with all 3 stages"
          >
            {copiedAll ? (
              <>
                <IconCheck className="h-3.5 w-3.5 text-mint-300" />
                <span>All 3 Stages Copied!</span>
              </>
            ) : (
              <>
                <IconClipboard className="h-3.5 w-3.5" />
                <span>Copy Entire Timeline Sheet</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Holistic Progress Bar */}
      <section className="animate-fade-up stagger-1 rounded-3xl bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
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
          <span
            className="flex size-10 items-center justify-center rounded-2xl bg-mint-50 text-mint-700"
            aria-hidden="true"
          >
            {growthIcon === 'trophy' ? (
              <IconTrophy className="h-6 w-6 text-sun-500" />
            ) : growthIcon === 'tree' ? (
              <IconTree className="h-6 w-6 text-emerald-600" />
            ) : (
              <IconSprout className="h-6 w-6 text-mint-600" />
            )}
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

      {/* High-Level 3-Stage Milestone Cards */}
      <div className="animate-fade-up stagger-2 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            3-Stage Roadmap &amp; Milestones
          </h2>
          <span className="text-xs text-stone-400">Click any stage to view checklist &amp; dates</span>
        </div>

        <div data-tour="timeline-stage-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIMELINE_STAGES.map((st) => {
            const sp = calculateStageProgress(st, timelineState);
            const dates = getStageDates(timelineState, st.id);

            return (
              <div
                key={st.id}
                onClick={() => setActiveStage(st)}
                className={`group flex flex-col justify-between rounded-3xl border p-5 cursor-pointer transition-all ${
                  sp.isComplete
                    ? 'border-mint-200 bg-white hover:border-mint-300 hover:shadow-soft'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-soft'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white">
                      Stage {st.stageNumber}
                    </span>
                    {sp.isComplete ? (
                      <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-700 border border-mint-200">
                        Completed ✓
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                        {sp.completed}/{sp.total} Deliverables
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-stone-900 group-hover:text-mint-800 transition">
                    {st.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500 font-medium">
                    {st.pedagogicalSubtitle}
                  </p>
                  {st.pedagogy && (
                    <p className="mt-1 text-[11px] text-stone-400 italic">
                      {st.pedagogy}
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-3 pt-3 border-t border-stone-100">
                  {/* Mini Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-stone-500 font-medium">Progress</span>
                      <span className="font-bold text-stone-800">{sp.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-mint-500 transition-all duration-300"
                        style={{ width: `${sp.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates & Action */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-stone-400 text-[11px] truncate max-w-[130px]">
                      {dates.startDate || 'Set dates'}
                    </span>
                    <span className="font-semibold text-stone-700 group-hover:text-stone-900 group-hover:translate-x-0.5 transition">
                      View →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-over Stage Detail & Checklist Drawer */}
      <StageDetailSheet
        stage={activeStage}
        timelineState={timelineState}
        isOpen={Boolean(activeStage)}
        onClose={() => setActiveStage(null)}
        onDateChange={handleDateChange}
        onToggleEvidence={handleToggleEvidence}
        onCopyStage={handleCopyStage}
        onPrevStage={onPrevStage}
        onNextStage={onNextStage}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isCopied={Boolean(activeStage && copiedStageId === activeStage.id)}
      />
    </main>
  );
}
