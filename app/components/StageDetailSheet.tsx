'use client';

import React, { useEffect } from 'react';
import {
  calculateStageProgress,
  formatTimelineDateForInput,
  getStageDates,
} from '@/lib/timeline';
import type { StageDates, TimelineStage, TimelineState } from '@/lib/types/timeline';
import {
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconX,
} from './Icons';

export interface StageDetailSheetProps {
  readonly stage: TimelineStage | null;
  readonly timelineState: TimelineState;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onDateChange: (stageId: string, field: keyof StageDates, value: string) => void;
  readonly onToggleEvidence: (evidenceId: string) => void;
  readonly onCopyStage: (stageId: string) => void;
  readonly onPrevStage?: () => void;
  readonly onNextStage?: () => void;
  readonly hasPrev?: boolean;
  readonly hasNext?: boolean;
  readonly isCopied?: boolean;
}

export function StageDetailSheet({
  stage,
  timelineState,
  isOpen,
  onClose,
  onDateChange,
  onToggleEvidence,
  onCopyStage,
  onPrevStage,
  onNextStage,
  hasPrev = false,
  hasNext = false,
  isCopied = false,
}: StageDetailSheetProps) {
  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !stage) return null;

  const stageProgress = calculateStageProgress(stage, timelineState);
  const stageDates = getStageDates(timelineState, stage.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-detail-sheet-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        <div
          className="pointer-events-auto flex w-screen flex-col bg-white shadow-lift
            max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[92vh] max-sm:rounded-t-3xl
            sm:max-w-xl sm:h-full sm:rounded-l-3xl animate-fade-in"
        >
          {/* Mobile Handle */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6">
            <div className="space-y-1.5 pr-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
                  Stage {stage.stageNumber}
                </span>
                <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-800">
                  {stage.pedagogicalSubtitle}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                    stageProgress.isComplete
                      ? 'bg-mint-50 text-mint-700 border-mint-200'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  {stageProgress.completed} / {stageProgress.total} Deliverables ({stageProgress.percentage}%)
                </span>
              </div>
              <h2
                id="stage-detail-sheet-title"
                className="text-lg font-semibold text-stone-900 sm:text-xl leading-snug"
              >
                {stage.title}
              </h2>
              {stage.pedagogy && (
                <p className="text-xs text-stone-500 font-medium italic">
                  Pedagogical Model: {stage.pedagogy}
                </p>
              )}
            </div>

            {/* Prev / Next & Close */}
            <div className="flex items-center gap-1 shrink-0">
              {onPrevStage && (
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={onPrevStage}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Previous stage"
                  aria-label="Previous stage"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {onNextStage && (
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextStage}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Next stage"
                  aria-label="Next stage"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition ml-1"
                aria-label="Close sheet"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Objective Callout */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Stage Objective
              </span>
              <p className="text-xs text-stone-800 leading-relaxed">
                {stage.objective}
              </p>
            </div>

            {/* Date Editor Section */}
            <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-1.5 text-stone-500 border-b border-stone-100 pb-2">
                <IconCalendar className="h-4 w-4 text-stone-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Timeline Execution Window (Cols B &amp; C)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formatTimelineDateForInput(stageDates.startDate)}
                    onChange={(e) => onDateChange(stage.id, 'startDate', e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formatTimelineDateForInput(stageDates.endDate)}
                    onChange={(e) => onDateChange(stage.id, 'endDate', e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Deliverables & Evidence Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Required Evidence &amp; Deliverables (Cols D–H)
                </span>
                <span className="text-xs font-semibold text-mint-700">
                  {stageProgress.completed} of {stageProgress.total} completed
                </span>
              </div>

              <div className="space-y-2">
                {stage.deliverables.map((item, idx) => {
                  const isChecked = Boolean(timelineState.completedEvidence[item.id]);

                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition select-none ${
                        isChecked
                          ? 'border-mint-200 bg-mint-50/40 text-stone-700'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleEvidence(item.id)}
                        className="mt-0.5 size-4 rounded text-mint-700 focus:ring-mint-500 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-stone-100 px-1.5 py-0.2 text-[10px] font-bold text-stone-600">
                            #{idx + 1}
                          </span>
                          <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-stone-400' : 'font-medium text-stone-900'}`}>
                            {item.text}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Key Activities summary */}
            {stage.keyActivities && (
              <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Weekly Syllabus Topics (Col I)
                </span>
                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {stage.keyActivities}
                </p>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="border-t border-stone-100 bg-stone-50/90 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onCopyStage(stage.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition active:scale-95 shadow-xs"
              >
                {isCopied ? (
                  <>
                    <IconCheck className="h-3.5 w-3.5 text-mint-300" />
                    <span>Stage Row Copied!</span>
                  </>
                ) : (
                  <>
                    <IconClipboard className="h-3.5 w-3.5 text-stone-300" />
                    <span>Copy Stage Row (Cols A–I)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-stone-500 hover:text-stone-800 transition px-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
