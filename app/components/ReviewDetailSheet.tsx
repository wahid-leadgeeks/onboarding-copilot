'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { type MonthlyReviewMilestone, type ReviewSelfAssessment } from '@/lib/reviews';
import { SheetToolsMenu, type SheetToolsMenuItem } from './SheetToolsMenu';
import { shouldSheetCloseOnEscape } from './sheetEscape';
import { useRestoreFocus } from './useRestoreFocus';
import { IconCheck, IconEdit, IconX } from './Icons';

export interface ReviewDetailSheetProps {
  readonly milestone: MonthlyReviewMilestone | null;
  readonly existingAssessment?: ReviewSelfAssessment;
  readonly scores: Record<string, number>;
  readonly onScoreChange: (criteriaId: string, score: number) => void;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (assessment: ReviewSelfAssessment) => void;
  readonly onCopyTsv?: (milestone: MonthlyReviewMilestone) => void;
  readonly onPrevMilestone?: () => void;
  readonly onNextMilestone?: () => void;
  readonly hasPrev?: boolean;
  readonly hasNext?: boolean;
  readonly isCopied?: boolean;
}

export function ReviewDetailSheet({
  milestone,
  existingAssessment,
  scores,
  onScoreChange,
  isOpen,
  onClose,
  onSave,
  onCopyTsv,
  onPrevMilestone,
  onNextMilestone,
  hasPrev = false,
  hasNext = false,
  isCopied = false,
}: ReviewDetailSheetProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [achievements, setAchievements] = useState<string>('');
  const [challenges, setChallenges] = useState<string>('');
  const [goalsNextMonth, setGoalsNextMonth] = useState<string>('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const fieldId = useId();
  useRestoreFocus(isOpen && Boolean(milestone), closeRef);

  useEffect(() => {
    if (milestone) {
      if (existingAssessment) {
        setAchievements(existingAssessment.achievements || '');
        setChallenges(existingAssessment.challenges || '');
        setGoalsNextMonth(existingAssessment.goalsNextMonth || '');
        const hasContent = Boolean(
          existingAssessment.achievements.trim() ||
            existingAssessment.challenges.trim() ||
            existingAssessment.goalsNextMonth.trim()
        );
        setIsEditing(!hasContent);
      } else {
        setAchievements('');
        setChallenges('');
        setGoalsNextMonth('');
        setIsEditing(true);
      }
    }
  }, [milestone, existingAssessment]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    // Capture phase: runs before the Sheet tools menu's own handler, while the menu is still marked open,
    // so an Escape meant for an open menu (even with focus on its trigger) closes only the menu.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldSheetCloseOnEscape(e)) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !milestone) return null;

  const hasAssessment = Boolean(
    achievements.trim() || challenges.trim() || goalsNextMonth.trim()
  );

  const handleSave = () => {
    const record: ReviewSelfAssessment = {
      month: milestone.month,
      achievements: achievements.trim(),
      challenges: challenges.trim(),
      goalsNextMonth: goalsNextMonth.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSave(record);
    setIsEditing(false);
  };

  // Calculate average score for criteria in this milestone
  const allCriteria = [...milestone.technicalCriteria, ...milestone.valuesCriteria];
  const scoredItems = allCriteria.filter((c) => scores[c.id] && scores[c.id] > 0);
  const avgScore =
    scoredItems.length > 0
      ? (
          scoredItems.reduce((acc, c) => acc + (scores[c.id] || 0), 0) /
          scoredItems.length
        ).toFixed(1)
      : null;

  const sheetItems: SheetToolsMenuItem[] = onCopyTsv
    ? [
        {
          id: 'copy-month',
          label: 'Copy for spreadsheet',
          hint: `Month ${milestone.month} as one row · 7 columns`,
          onSelect: () => onCopyTsv(milestone),
          state: isCopied ? 'done' : 'idle',
          doneLabel: 'Copied',
        },
      ]
    : [];

  const iconButton =
    'inline-flex size-11 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 sm:size-9';
  const scoreButton = (selected: boolean) =>
    `min-h-11 flex-1 rounded-xl text-xs font-bold transition sm:min-h-8 ${
      selected
        ? 'bg-stone-900 text-white shadow-xs'
        : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
    }`;
  const fieldLabel = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-stone-600';
  const textareaClass =
    'w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-500 focus:border-stone-900 focus:outline-none';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-detail-sheet-title"
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
          {/* Mobile Handle Indicator */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-stone-100 p-5 sm:p-6">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
                  Month {milestone.month} Review
                </span>
                <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-800">
                  Target: Day {milestone.targetDays}
                </span>
                {hasAssessment ? (
                  <span className="rounded-full border border-mint-200 bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-800">
                    Completed ✓ {avgScore ? `· Avg ${avgScore}/5` : ''}
                  </span>
                ) : (
                  <span className="rounded-full border border-peach-200 bg-peach-50 px-2.5 py-0.5 text-xs font-semibold text-peach-800">
                    Needs Self-Assessment
                  </span>
                )}
              </div>
              <h2
                id="review-detail-sheet-title"
                className="text-lg font-semibold text-stone-900 sm:text-xl leading-snug"
              >
                {milestone.stageTitle}
              </h2>
            </div>

            {/* Prev / Next & Close */}
            <div className="flex items-center gap-1 shrink-0">
              {onPrevMilestone && (
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={onPrevMilestone}
                  className={iconButton}
                  title="Previous month"
                  aria-label="Previous month"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {onNextMilestone && (
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextMilestone}
                  className={iconButton}
                  title="Next month"
                  aria-label="Next month"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className={iconButton}
                aria-label="Close"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {/* Focusable so keyboard users can scroll it even when it holds no controls (view mode). */}
          <div tabIndex={0} className="flex-1 space-y-6 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300 sm:p-6">
            {/* Focus Banner */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Evaluation Focus
              </span>
              <p className="text-xs text-stone-800 leading-relaxed">
                {milestone.focus}
              </p>
            </div>

            {!isEditing ? (
              /* VIEW MODE */
              <div className="space-y-6">
                {/* Criteria Ratings Breakdown */}
                <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Criteria Ratings Summary
                    </h3>
                    {avgScore && (
                      <span className="rounded-md bg-mint-50 px-2 py-0.5 text-xs font-bold text-mint-800">
                        Avg: {avgScore} / 5.0
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      Technical &amp; Role Competencies
                    </h4>
                    {milestone.technicalCriteria.map((c) => {
                      const score = scores[c.id] || 0;
                      return (
                        <div key={c.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-800 font-medium">{c.title}</span>
                            <span className="font-bold text-stone-900">
                              {score > 0 ? `${score} / 5` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-mint-500 transition-all duration-300"
                              style={{ width: `${(score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <h4 className="pt-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      HARPS Values Alignment
                    </h4>
                    {milestone.valuesCriteria.map((c) => {
                      const score = scores[c.id] || 0;
                      return (
                        <div key={c.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-800 font-medium">{c.title}</span>
                            <span className="font-bold text-stone-900">
                              {score > 0 ? `${score} / 5` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-mint-500 transition-all duration-300"
                              style={{ width: `${(score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Self-Reflection Summary */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Self-Reflection Answers
                  </h3>

                  {achievements ? (
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-xs font-semibold text-stone-600 block mb-1">
                        1. Key Achievements &amp; Milestones
                      </span>
                      <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                        {achievements}
                      </p>
                    </div>
                  ) : null}

                  {challenges ? (
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-xs font-semibold text-stone-600 block mb-1">
                        2. Challenges &amp; Areas Needing Support
                      </span>
                      <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                        {challenges}
                      </p>
                    </div>
                  ) : null}

                  {goalsNextMonth ? (
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-xs font-semibold text-stone-600 block mb-1">
                        3. Focus &amp; Goals for Next Month
                      </span>
                      <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                        {goalsNextMonth}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="space-y-6">
                {/* 1. Technical Competencies */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    1. Technical &amp; Role Competencies (1 to 5)
                  </h3>
                  {milestone.technicalCriteria.map((c) => {
                    const currentScore = scores[c.id] || 0;
                    return (
                      <div key={c.id} className="rounded-2xl border border-stone-100 bg-stone-50/50 p-3.5 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-xs font-semibold text-stone-900">{c.title}</h4>
                          <span className="text-xs font-bold text-mint-800">
                            {currentScore > 0 ? `${currentScore} / 5` : 'Not rated'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">{c.description}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => onScoreChange(c.id, val)}
                              aria-pressed={currentScore === val}
                              aria-label={`${c.title}: ${val} of 5`}
                              className={scoreButton(currentScore === val)}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. HARPS Values */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      2. HARPS Values Alignment (1 to 5)
                    </h3>
                  </div>
                  {milestone.valuesCriteria.map((c) => {
                    const currentScore = scores[c.id] || 0;
                    return (
                      <div key={c.id} className="rounded-2xl border border-stone-100 bg-stone-50/50 p-3.5 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-xs font-semibold text-stone-900">{c.title}</h4>
                          <span className="text-xs font-bold text-mint-800">
                            {currentScore > 0 ? `${currentScore} / 5` : 'Not rated'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">{c.description}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => onScoreChange(c.id, val)}
                              aria-pressed={currentScore === val}
                              aria-label={`${c.title}: ${val} of 5`}
                              className={scoreButton(currentScore === val)}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Self-Assessment Reflections */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    3. Self-Assessment Reflections
                  </h3>

                  <div>
                    <label htmlFor={`${fieldId}-achievements`} className={fieldLabel}>
                      Key Achievements &amp; Milestones
                    </label>
                    <textarea
                      id={`${fieldId}-achievements`}
                      rows={3}
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                      placeholder="What were your biggest accomplishments and outputs delivered during this period?"
                      className={textareaClass}
                    />
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-challenges`} className={fieldLabel}>
                      Challenges &amp; Areas Needing Support
                    </label>
                    <textarea
                      id={`${fieldId}-challenges`}
                      rows={3}
                      value={challenges}
                      onChange={(e) => setChallenges(e.target.value)}
                      placeholder="What challenges or roadblocks did you encounter? What support do you need?"
                      className={textareaClass}
                    />
                  </div>

                  <div>
                    <label htmlFor={`${fieldId}-goals`} className={fieldLabel}>
                      Focus &amp; Goals for Next Month
                    </label>
                    <textarea
                      id={`${fieldId}-goals`}
                      rows={3}
                      value={goalsNextMonth}
                      onChange={(e) => setGoalsNextMonth(e.target.value)}
                      placeholder="What are your target competencies and deliverables for the upcoming period?"
                      className={textareaClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="border-t border-stone-100 bg-stone-50/90 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!isEditing ? (
                <>
                  {sheetItems.length > 0 && (
                    <SheetToolsMenu items={sheetItems} placement="up" align="start" className="mr-auto" />
                  )}

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium text-stone-600 transition hover:text-stone-900 sm:min-h-9"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-stone-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:min-h-9"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      <span>Edit Assessment</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasAssessment) {
                        setIsEditing(false);
                      } else {
                        onClose();
                      }
                    }}
                    className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 active:scale-95 sm:min-h-9"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-stone-900 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:min-h-9"
                  >
                    <IconCheck className="h-4 w-4" />
                    <span>Save Assessment</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
