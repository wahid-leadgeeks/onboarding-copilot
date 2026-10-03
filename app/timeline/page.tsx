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
import { SheetToolsMenu, type SheetToolsMenuItem } from '@/app/components/SheetToolsMenu';
import { IconSprout, IconTree, IconTrophy } from '@/app/components/Icons';

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

    fetch('/api/timeline')
      .then((res) => res.json())
      .then((data) => {
        if (data?.stages && Array.isArray(data.stages) && data.stages.length > 0) {
          setTimelineState((prev) => {
            let next = { ...prev };
            for (const st of data.stages) {
              if (st.startDate || st.endDate) {
                next = updateStageDates(next, st.id, {
                  startDate: st.startDate,
                  endDate: st.endDate,
                });
              }
            }
            try {
              localStorage.setItem(TIMELINE_STORAGE_KEY, writeTimelineState(next));
            } catch {
              /* ignore */
            }
            return next;
          });
        }
      })
      .catch(() => {});
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
    fetch('/api/timeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        stageId,
        startDate: field === 'startDate' ? value : undefined,
        endDate: field === 'endDate' ? value : undefined,
      }),
    }).catch(() => {});
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

  const pageToolItems: SheetToolsMenuItem[] = [
    {
      id: 'copy-timeline',
      label: 'Copy for spreadsheet',
      hint: `All ${TIMELINE_STAGES.length} stages, one row each · columns A–I`,
      onSelect: handleCopyAll,
      state: copiedAll ? 'done' : 'idle',
      doneLabel: 'Copied all stages',
    },
  ];

  return (
    <main
      data-hydrated={isHydrated}
      className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8"
    >
      {/* Header */}
      <header className="animate-fade-up relative z-10 pb-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Your 90-day journey
          </p>
          <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-800">
            Day {day} of {totalDays}
          </span>
        </div>
        <div className="mt-2 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Timeline &amp; Evidence
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Three onboarding stages, with the deliverables and evidence each one needs.
            </p>
          </div>
          <SheetToolsMenu items={pageToolItems} className="shrink-0 self-end" />
        </div>
      </header>

      {/* Holistic Progress Bar */}
      <section className="animate-fade-up stagger-1 rounded-3xl bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Overall progress
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-bold tracking-tight text-stone-900">
                Deliverables {overallProgress.completedDeliverables} of {overallProgress.totalDeliverables}
              </span>
              <span className="text-sm font-normal text-stone-500">({overallProgress.percentage}%)</span>
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
          aria-label="Deliverables completed"
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            3-Stage Roadmap &amp; Milestones
          </h2>
          <span className="text-xs text-stone-500">Open a stage to see its checklist and dates</span>
        </div>

        <div data-tour="timeline-stage-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIMELINE_STAGES.map((st) => {
            const sp = calculateStageProgress(st, timelineState);
            const dates = getStageDates(timelineState, st.id);

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st)}
                className={`group flex min-w-0 flex-col justify-between rounded-3xl border bg-white p-5 text-left transition-all ${
                  sp.isComplete
                    ? 'border-mint-200 hover:border-mint-300 hover:shadow-soft'
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-soft'
                }`}
              >
                <span className="block w-full">
                  <span className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
                      Stage {st.stageNumber}
                    </span>
                    {sp.isComplete ? (
                      <span className="rounded-full border border-mint-200 bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-800">
                        Completed ✓
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                        {sp.completed} of {sp.total} done
                      </span>
                    )}
                  </span>

                  <span className="mt-3 block text-base font-semibold text-stone-900 transition group-hover:text-mint-800">
                    {st.title}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-stone-500">
                    {st.pedagogicalSubtitle}
                  </span>
                  {st.pedagogy && (
                    <span className="mt-1 block text-xs italic text-stone-500">
                      {st.pedagogy}
                    </span>
                  )}
                </span>

                <span className="mt-5 block w-full space-y-3 border-t border-stone-100 pt-3">
                  {/* Mini Progress */}
                  <span className="block">
                    <span className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-stone-500">Progress</span>
                      <span className="font-bold text-stone-800">{sp.percentage}%</span>
                    </span>
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <span
                        className="block h-full rounded-full bg-mint-500 transition-all duration-300"
                        style={{ width: `${sp.percentage}%` }}
                      />
                    </span>
                  </span>

                  {/* Dates & Action */}
                  <span className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <span className="min-w-0 truncate text-stone-500">
                      {dates.startDate || 'Set dates'}
                    </span>
                    <span className="shrink-0 font-semibold text-stone-700 transition group-hover:translate-x-0.5 group-hover:text-stone-900">
                      View →
                    </span>
                  </span>
                </span>
              </button>
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
