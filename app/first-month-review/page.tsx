'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  OFFICIAL_FIRST_MONTH_REVIEW,
  FIRST_MONTH_REVIEW_STORAGE_KEY,
  readFirstMonthReview,
  writeFirstMonthReview,
  getAverageScore,
  clipboardForTechnicalAssessment,
  clipboardForValuesAssessment,
  clipboardForFeedbackRatings,
  clipboardForQualitativeFeedback,
  clipboardForHrdQuestions,
  type FirstMonthReview,
  type AssessmentItem,
  type FeedbackRatingItem,
  type QualitativeFeedbackItem,
  type HrdQuestionItem,
} from '@/lib/first-month-review';
import {
  STANDARD_SCORES,
  getScoreMetadata,
} from '@/lib/review-scoring';
import { useToast } from '@/app/components/Toast';
import {
  IconTrophy,
  IconTarget,
  IconCheck,
  IconClipboard,
  IconStar,
  IconBookOpen,
  IconUser,
  IconRefresh,
  IconRocket,
} from '@/app/components/Icons';

type TabKey = 'technical' | 'values' | 'supervisor' | 'ratings' | 'qualitative' | 'hrd';

export default function FirstMonthReviewPage() {
  const { toast } = useToast();
  const [review, setReview] = useState<FirstMonthReview>(OFFICIAL_FIRST_MONTH_REVIEW);
  const [activeTab, setActiveTab] = useState<TabKey>('technical');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FIRST_MONTH_REVIEW_STORAGE_KEY);
      if (saved) {
        setReview(readFirstMonthReview(saved));
      }
    }
  }, []);

  function saveReviewState(updated: FirstMonthReview) {
    setReview(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FIRST_MONTH_REVIEW_STORAGE_KEY, writeFirstMonthReview(updated));
    }
  }

  function handleUpdateTechnical(index: number, partial: Partial<AssessmentItem>) {
    const nextList = [...review.technicalAssessment];
    nextList[index] = { ...nextList[index], ...partial };
    saveReviewState({ ...review, technicalAssessment: nextList });
  }

  function handleUpdateValues(index: number, partial: Partial<AssessmentItem>) {
    const nextList = [...review.valuesAssessment];
    nextList[index] = { ...nextList[index], ...partial };
    saveReviewState({ ...review, valuesAssessment: nextList });
  }

  function handleUpdateRating(index: number, score: number) {
    const nextList = [...review.feedbackRatings];
    nextList[index] = { ...nextList[index], score };
    saveReviewState({ ...review, feedbackRatings: nextList });
  }

  function handleUpdateQualitative(index: number, partial: Partial<QualitativeFeedbackItem>) {
    const nextList = [...review.qualitativeFeedback];
    nextList[index] = { ...nextList[index], ...partial };
    saveReviewState({ ...review, qualitativeFeedback: nextList });
  }

  function handleUpdateHrd(index: number, employeeComment: string) {
    const nextList = [...review.hrdQuestions];
    nextList[index] = { ...nextList[index], employeeComment };
    saveReviewState({ ...review, hrdQuestions: nextList });
  }

  async function copyToClipboard(tsv: string, key: string, label: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedKey(key);
        toast.success(`Copied ${label} TSV! Ready to paste into Google Sheets.`);
        setTimeout(() => setCopiedKey(null), 3000);
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  }

  function handleResetToDefaults() {
    if (window.confirm('Reset First Month Review back to official initial content?')) {
      saveReviewState(OFFICIAL_FIRST_MONTH_REVIEW);
      toast.success('Reset to official template values.');
    }
  }

  async function handleSyncWithGoogleSheets() {
    setIsSyncing(true);
    try {
      // Direct API update for section cells if endpoint available, or informative toast
      toast.info('To sync First Month Review directly, use the 1-click TSV copy buttons to paste into cells B15, B29, B51, and B64 in Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  }

  // Summary Metrics
  const avgTech = getAverageScore(review.technicalAssessment);
  const avgVal = getAverageScore(review.valuesAssessment);
  const avgRate = Math.round((review.feedbackRatings.reduce((a, c) => a + c.score, 0) / review.feedbackRatings.length) * 10) / 10;
  const techMeta = getScoreMetadata(avgTech);
  const valMeta = getScoreMetadata(avgVal);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-peach-100 px-3 py-1 text-xs font-semibold text-peach-800">
                <IconTrophy className="h-3.5 w-3.5 text-peach-700" />
                Sheet: First Month Review
              </span>
              <span className="text-xs font-medium text-stone-500">
                Review Period: {review.metadata.reviewPeriod}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              First Month Review
            </h1>
            <p className="mt-1 text-sm text-stone-500 max-w-2xl">
              Comprehensive 30-day onboarding review for {review.metadata.employeeName} ({review.metadata.title}), evaluated by {review.metadata.supervisorName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/monthly-review-score"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95"
            >
              <IconTarget className="h-3.5 w-3.5 text-stone-500" />
              <span>Scoring Rubric</span>
            </Link>

            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
              title="Reset all fields to the official initial state"
            >
              <IconRefresh className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Executive Score Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
              <span>Technical Avg</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${techMeta.badgeBg} ${techMeta.badgeText} border ${techMeta.badgeBorder}`}>
                {techMeta.level}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-sky-950">
                {avgTech.toFixed(1)}
              </span>
              <span className="text-xs text-sky-700">/ 100</span>
            </div>
            <p className="mt-1 text-[11px] text-sky-800/80">11 Technical Competencies</p>
          </div>

          <div className="rounded-2xl border border-mint-200/80 bg-mint-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-mint-900">
              <span>Values Avg</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${valMeta.badgeBg} ${valMeta.badgeText} border ${valMeta.badgeBorder}`}>
                {valMeta.level}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-mint-950">
                {avgVal.toFixed(1)}
              </span>
              <span className="text-xs text-mint-700">/ 100</span>
            </div>
            <p className="mt-1 text-[11px] text-mint-800/80">8 Department Values</p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
              <span>Feedback Rating</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Likert
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-950">
                {avgRate.toFixed(1)}
              </span>
              <span className="text-xs text-amber-700">/ 5.0</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-800/80">10 Employee Satisfaction Items</p>
          </div>

          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span>Supervisor Outcome</span>
              <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-bold text-mint-800">
                Approved
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-stone-900 line-clamp-1">
                Continue Training
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">Non-final interim review</p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
        {[
          { id: 'technical' as TabKey, label: '1.1 Technical (11)' },
          { id: 'values' as TabKey, label: '1.2 Values (8)' },
          { id: 'supervisor' as TabKey, label: 'Supervisor Qs (7)' },
          { id: 'ratings' as TabKey, label: '2.1 Ratings (10)' },
          { id: 'qualitative' as TabKey, label: '2.2 Qualitative (3)' },
          { id: 'hrd' as TabKey, label: 'HRD Reflections (6)' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Section 1.1 Technical Assessment */}
      {activeTab === 'technical' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                1.1 Technical Assessment (Rows 15–25)
              </h2>
              <p className="text-xs text-stone-500">
                Score each technical responsibility (60.0 – 100.0) and document supervisor observations.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  clipboardForTechnicalAssessment(review.technicalAssessment),
                  'tech',
                  'Technical Assessment (B15:C25)'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-stone-700 active:scale-95"
            >
              {copiedKey === 'tech' ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-400" />
                  <span>Copied TSV!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy TSV (Paste to B15:C25)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {review.technicalAssessment.map((item, idx) => {
              const meta = getScoreMetadata(item.score);
              return (
                <div
                  key={item.rowNumber}
                  className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-2xs space-y-3 hover:shadow-xs transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 max-w-2xl">
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0 mt-0.5">
                        Row {item.rowNumber}
                      </span>
                      <h3 className="text-sm font-semibold leading-snug text-stone-900">
                        {item.responsibility}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`}>
                        {item.score !== undefined ? `${item.score.toFixed(1)} · ${meta.level}` : 'Unrated'}
                      </span>
                    </div>
                  </div>

                  {/* Standard Score Selector Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-stone-400 mr-1">Score:</span>
                    {STANDARD_SCORES.map((s) => {
                      const isSelected = item.score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateTechnical(idx, { score: s })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                            isSelected
                              ? 'bg-stone-900 text-white shadow-2xs'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                          }`}
                        >
                          {s.toFixed(1)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Assessment text */}
                  <div>
                    <label className="block text-[11px] font-medium text-stone-500 mb-1">
                      Assessment & Justification (Column C)
                    </label>
                    <textarea
                      rows={2}
                      value={item.assessment || ''}
                      onChange={(e) => handleUpdateTechnical(idx, { assessment: e.target.value })}
                      placeholder="Enter supervisor assessment or observations..."
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 text-xs text-stone-800 placeholder-stone-400 focus:border-peach-400 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab 2: Section 1.2 Values Assessment */}
      {activeTab === 'values' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                1.2 Values Assessment (Rows 29–36)
              </h2>
              <p className="text-xs text-stone-500">
                Evaluate adherence to LeadGeeks core values and departmental culture.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  clipboardForValuesAssessment(review.valuesAssessment),
                  'values',
                  'Values Assessment (B29:C36)'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-stone-700 active:scale-95"
            >
              {copiedKey === 'values' ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-400" />
                  <span>Copied TSV!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy TSV (Paste to B29:C36)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {review.valuesAssessment.map((item, idx) => {
              const meta = getScoreMetadata(item.score);
              return (
                <div
                  key={item.rowNumber}
                  className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-2xs space-y-3 hover:shadow-xs transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 max-w-2xl">
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0 mt-0.5">
                        Row {item.rowNumber}
                      </span>
                      <h3 className="text-sm font-semibold leading-snug text-stone-900">
                        {item.responsibility}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`}>
                        {item.score !== undefined ? `${item.score.toFixed(1)} · ${meta.level}` : 'Unrated'}
                      </span>
                    </div>
                  </div>

                  {/* Standard Score Selector Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-stone-400 mr-1">Score:</span>
                    {STANDARD_SCORES.map((s) => {
                      const isSelected = item.score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateValues(idx, { score: s })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                            isSelected
                              ? 'bg-stone-900 text-white shadow-2xs'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                          }`}
                        >
                          {s.toFixed(1)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Assessment text */}
                  <div>
                    <label className="block text-[11px] font-medium text-stone-500 mb-1">
                      Assessment & Evidence (Column C)
                    </label>
                    <textarea
                      rows={2}
                      value={item.assessment || ''}
                      onChange={(e) => handleUpdateValues(idx, { assessment: e.target.value })}
                      placeholder="Enter value assessment..."
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 text-xs text-stone-800 placeholder-stone-400 focus:border-peach-400 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab 3: Additional Supervisor Questions */}
      {activeTab === 'supervisor' && (
        <section className="space-y-4">
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <h2 className="text-sm font-bold text-stone-900">
              Additional Supervisor Questions (Rows 39–45)
            </h2>
            <p className="text-xs text-stone-500">
              Supervisor confirmation and recommendation for the onboarding review period.
            </p>
          </div>

          <div className="space-y-3">
            {review.additionalQuestions.map((q) => (
              <div
                key={q.rowNumber}
                className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-2xs space-y-2 hover:shadow-xs transition"
              >
                <div className="flex items-start gap-2.5">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0 mt-0.5">
                    Row {q.rowNumber}
                  </span>
                  <p className="text-sm font-semibold text-stone-900">{q.question}</p>
                </div>
                <div className="mt-2 rounded-xl bg-stone-50 p-3 border border-stone-100">
                  <span className="text-[11px] font-bold text-stone-500 block mb-1">
                    SUPERVISOR'S ANSWER (Column B):
                  </span>
                  <p className="text-xs leading-relaxed text-stone-800 font-medium">
                    {q.answer || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab 4: Section 2.1 Feedback Ratings */}
      {activeTab === 'ratings' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                2.1 Feedback Rating (Rows 51–60)
              </h2>
              <p className="text-xs text-stone-500">
                Employee onboarding experience ratings (1.0 to 5.0 Likert scale).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  clipboardForFeedbackRatings(review.feedbackRatings),
                  'ratings',
                  'Feedback Ratings (B51:B60)'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-stone-700 active:scale-95"
            >
              {copiedKey === 'ratings' ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-400" />
                  <span>Copied TSV!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy TSV (Paste to B51:B60)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {review.feedbackRatings.map((item, idx) => (
              <div
                key={item.rowNumber}
                className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-4.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 hover:shadow-xs transition"
              >
                <div className="flex items-center gap-2.5 max-w-xl">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0">
                    Row {item.rowNumber}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-stone-900">{item.question}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1.0, 2.0, 3.0, 4.0, 5.0].map((rating) => {
                    const active = item.score === rating;
                    return (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleUpdateRating(idx, rating)}
                        className={`h-7 w-7 rounded-lg text-xs font-bold transition active:scale-95 ${
                          active
                            ? 'bg-stone-900 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab 5: Section 2.2 Qualitative Feedback */}
      {activeTab === 'qualitative' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                2.2 Qualitative Feedback (Rows 64–66)
              </h2>
              <p className="text-xs text-stone-500">
                Qualitative reflections comparing Supervisor's feedback with Employee's perspective.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  clipboardForQualitativeFeedback(review.qualitativeFeedback),
                  'qualitative',
                  'Qualitative Feedback (B64:D66)'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-stone-700 active:scale-95"
            >
              {copiedKey === 'qualitative' ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-400" />
                  <span>Copied TSV!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy TSV (Paste to B64:D66)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {review.qualitativeFeedback.map((item, idx) => (
              <div
                key={item.rowNumber}
                className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-2xs space-y-3 hover:shadow-xs transition"
              >
                <div className="flex items-start gap-2.5">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0 mt-0.5">
                    Row {item.rowNumber}
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900">{item.question}</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  {/* Supervisor comment */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                    <span className="text-[11px] font-bold text-stone-600 block mb-1">
                      SUPERVISOR’S COMMENT (Column B)
                    </span>
                    <p className="text-xs leading-relaxed text-stone-800 whitespace-pre-line">
                      {item.supervisorComment}
                    </p>
                  </div>

                  {/* Employee comment */}
                  <div className="rounded-xl border border-peach-200 bg-peach-50/30 p-3.5">
                    <span className="text-[11px] font-bold text-peach-900 block mb-1">
                      EMPLOYEE’S COMMENT (Column D)
                    </span>
                    <textarea
                      rows={6}
                      value={item.employeeComment}
                      onChange={(e) => handleUpdateQualitative(idx, { employeeComment: e.target.value })}
                      className="w-full rounded-lg border border-peach-200/80 bg-white p-2 text-xs leading-relaxed text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-peach-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab 6: HRD Questions */}
      {activeTab === 'hrd' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                QUESTIONS (HRD) (Rows 68–73)
              </h2>
              <p className="text-xs text-stone-500">
                Employee reflections on adaptation, challenges, internal systems, and long-term career goals.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  clipboardForHrdQuestions(review.hrdQuestions),
                  'hrd',
                  'HRD Reflections (B68:B73)'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-stone-700 active:scale-95"
            >
              {copiedKey === 'hrd' ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-400" />
                  <span>Copied TSV!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy TSV (Paste to B68:B73)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {review.hrdQuestions.map((item, idx) => (
              <div
                key={item.rowNumber}
                className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-2xs space-y-3 hover:shadow-xs transition"
              >
                <div className="flex items-start gap-2.5">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600 shrink-0 mt-0.5">
                    Row {item.rowNumber}
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900 whitespace-pre-line">
                    {item.question}
                  </h3>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    EMPLOYEE’S COMMENT (Column B)
                  </label>
                  <textarea
                    rows={6}
                    value={item.employeeComment}
                    onChange={(e) => handleUpdateHrd(idx, e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs leading-relaxed text-stone-800 placeholder-stone-400 focus:border-peach-400 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
