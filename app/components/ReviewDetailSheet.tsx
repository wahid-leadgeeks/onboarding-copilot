'use client';

import React, { useEffect, useState } from 'react';
import {
  HARPS_VALUES,
  type MonthlyReviewMilestone,
  type ReviewSelfAssessment,
} from '@/lib/reviews';
import {
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconEdit,
  IconX,
} from './Icons';

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
          <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6">
            <div className="space-y-1.5 pr-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
                  Month {milestone.month} Review
                </span>
                <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-800">
                  Target: Day {milestone.targetDays}
                </span>
                {hasAssessment ? (
                  <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-700 border border-mint-200">
                    Completed ✓ {avgScore ? `· Avg ${avgScore}/5` : ''}
                  </span>
                ) : (
                  <span className="rounded-full bg-peach-50 px-2.5 py-0.5 text-[11px] font-semibold text-peach-700 border border-peach-200">
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
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Previous month"
                  aria-label="Previous month"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {onNextMilestone && (
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextMilestone}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Next month"
                  aria-label="Next month"
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
                      <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-md">
                        Avg: {avgScore} / 5.0
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
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

                    <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider pt-2">
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
                        <div className="flex items-baseline justify-between">
                          <h4 className="text-xs font-semibold text-stone-900">{c.title}</h4>
                          <span className="text-xs font-bold text-mint-700">
                            {currentScore > 0 ? `${currentScore} / 5` : 'Not rated'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">{c.description}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => onScoreChange(c.id, val)}
                              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                                currentScore === val
                                  ? 'bg-stone-900 text-white shadow-xs'
                                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                              }`}
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
                        <div className="flex items-baseline justify-between">
                          <h4 className="text-xs font-semibold text-stone-900">{c.title}</h4>
                          <span className="text-xs font-bold text-mint-700">
                            {currentScore > 0 ? `${currentScore} / 5` : 'Not rated'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">{c.description}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => onScoreChange(c.id, val)}
                              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                                currentScore === val
                                  ? 'bg-stone-900 text-white shadow-xs'
                                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                              }`}
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
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Key Achievements &amp; Milestones
                    </label>
                    <textarea
                      rows={3}
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                      placeholder="What were your biggest accomplishments and outputs delivered during this period?"
                      className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Challenges &amp; Areas Needing Support
                    </label>
                    <textarea
                      rows={3}
                      value={challenges}
                      onChange={(e) => setChallenges(e.target.value)}
                      placeholder="What challenges or roadblocks did you encounter? What support do you need?"
                      className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Focus &amp; Goals for Next Month
                    </label>
                    <textarea
                      rows={3}
                      value={goalsNextMonth}
                      onChange={(e) => setGoalsNextMonth(e.target.value)}
                      placeholder="What are your target competencies and deliverables for the upcoming period?"
                      className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition active:scale-95 shadow-xs"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      <span>Edit Assessment</span>
                    </button>

                    {onCopyTsv && (
                      <button
                        type="button"
                        onClick={() => onCopyTsv(milestone)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition active:scale-95"
                      >
                        {isCopied ? (
                          <>
                            <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                            <span className="text-mint-700 font-semibold">Copied TSV!</span>
                          </>
                        ) : (
                          <>
                            <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                            <span>Copy Month TSV</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-medium text-stone-500 hover:text-stone-800 transition px-2"
                  >
                    Close
                  </button>
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
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 rounded-full bg-mint-700 px-5 py-2 text-xs font-semibold text-white hover:bg-mint-800 transition active:scale-95 shadow-xs"
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
