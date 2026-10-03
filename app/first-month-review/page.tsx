'use client';

import React, { useState, useEffect, useId } from 'react';
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
import { ReviewsTabs } from '@/app/components/ReviewsTabs';
import { RowTag } from '@/app/components/RowTag';
import { SheetToolsMenu, type SheetToolsMenuItem } from '@/app/components/SheetToolsMenu';
import { IconRefresh } from '@/app/components/Icons';

type TabKey = 'technical' | 'values' | 'supervisor' | 'ratings' | 'qualitative' | 'hrd';

export default function FirstMonthReviewPage() {
  const { toast } = useToast();
  const [review, setReview] = useState<FirstMonthReview>(OFFICIAL_FIRST_MONTH_REVIEW);
  const [activeTab, setActiveTab] = useState<TabKey>('technical');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fieldId = useId();

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
        toast.success(`Copied ${label}. Paste it into the spreadsheet.`);
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

  /** Sheet tools for one section: a single "Copy for spreadsheet" item; the paste range lives only in its hint. */
  function copyItems(key: string, label: string, range: string, build: () => string): SheetToolsMenuItem[] {
    return [
      {
        id: `copy-${key}`,
        label: 'Copy for spreadsheet',
        hint: `pastes at ${range}`,
        onSelect: () => copyToClipboard(build(), key, label),
        state: copiedKey === key ? 'done' : 'idle',
        doneLabel: 'Copied',
      },
    ];
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
      <header className="relative z-10 mb-6 min-w-0">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Probation checkpoints
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              First Month Review
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-stone-500">
              Comprehensive 30-day onboarding review for {review.metadata.employeeName} ({review.metadata.title}), evaluated by {review.metadata.supervisorName}.
            </p>
            <p className="mt-1 text-xs font-medium text-stone-500">
              Review period: {review.metadata.reviewPeriod}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-800 sm:min-h-9"
            title="Reset all fields to the official initial state"
          >
            <IconRefresh className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        <ReviewsTabs className="mt-4" />

        {/* Executive Score Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
              <span>Technical Avg</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${techMeta.badgeBg} ${techMeta.badgeText} border ${techMeta.badgeBorder}`}>
                {techMeta.level}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-sky-950">
                {avgTech.toFixed(1)}
              </span>
              <span className="text-xs text-sky-700">/ 100</span>
            </div>
            <p className="mt-1 text-xs text-sky-800">11 Technical Competencies</p>
          </div>

          <div className="rounded-2xl border border-mint-200/80 bg-mint-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-mint-900">
              <span>Values Avg</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${valMeta.badgeBg} ${valMeta.badgeText} border ${valMeta.badgeBorder}`}>
                {valMeta.level}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-mint-950">
                {avgVal.toFixed(1)}
              </span>
              <span className="text-xs text-mint-700">/ 100</span>
            </div>
            <p className="mt-1 text-xs text-mint-800">8 Department Values</p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
              <span>Feedback Rating</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                Likert
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-950">
                {avgRate.toFixed(1)}
              </span>
              <span className="text-xs text-amber-700">/ 5.0</span>
            </div>
            <p className="mt-1 text-xs text-amber-800">10 Employee Satisfaction Items</p>
          </div>

          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span>Supervisor Outcome</span>
              <span className="rounded-full bg-mint-100 px-2 py-0.5 text-xs font-bold text-mint-800">
                Approved
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-stone-900 line-clamp-1">
                Continue Training
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500">Non-final interim review</p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3" aria-label="Review sections" role="group">
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
              aria-pressed={active}
              className={`inline-flex min-h-11 items-center rounded-full px-3.5 text-xs font-semibold transition sm:min-h-8 ${
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
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50 p-3.5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900">
                1.1 Technical Assessment
              </h2>
              <p className="text-xs text-stone-500">
                Score each technical responsibility (60.0 – 100.0) and document supervisor observations.
              </p>
            </div>
            <SheetToolsMenu
              className="ml-auto"
              items={copyItems('tech', 'Technical assessment', 'B15:C25', () => clipboardForTechnicalAssessment(review.technicalAssessment))}
            />
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
                    <div className="flex min-w-0 max-w-2xl items-start gap-2.5">
                      <RowTag rowNumber={item.rowNumber} className="mt-0.5" />
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
                    <span className="mr-1 text-xs font-medium text-stone-500">Score:</span>
                    {STANDARD_SCORES.map((s) => {
                      const isSelected = item.score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateTechnical(idx, { score: s })}
                          aria-pressed={isSelected}
                          className={`min-h-11 min-w-11 rounded-lg px-2.5 text-xs font-bold transition active:scale-95 sm:min-h-7 sm:min-w-0 ${
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
                    <label htmlFor={`${fieldId}-tech-${idx}`} className="mb-1 block text-xs font-medium text-stone-600">
                      Your assessment
                    </label>
                    <textarea
                      id={`${fieldId}-tech-${idx}`}
                      rows={2}
                      value={item.assessment || ''}
                      onChange={(e) => handleUpdateTechnical(idx, { assessment: e.target.value })}
                      placeholder="Enter supervisor assessment or observations..."
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 text-xs text-stone-800 placeholder:text-stone-500 focus:border-peach-400 focus:bg-white"
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
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50 p-3.5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900">
                1.2 Values Assessment
              </h2>
              <p className="text-xs text-stone-500">
                Evaluate adherence to LeadGeeks core values and departmental culture.
              </p>
            </div>
            <SheetToolsMenu
              className="ml-auto"
              items={copyItems('values', 'Values assessment', 'B29:C36', () => clipboardForValuesAssessment(review.valuesAssessment))}
            />
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
                    <div className="flex min-w-0 max-w-2xl items-start gap-2.5">
                      <RowTag rowNumber={item.rowNumber} className="mt-0.5" />
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
                    <span className="mr-1 text-xs font-medium text-stone-500">Score:</span>
                    {STANDARD_SCORES.map((s) => {
                      const isSelected = item.score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleUpdateValues(idx, { score: s })}
                          aria-pressed={isSelected}
                          className={`min-h-11 min-w-11 rounded-lg px-2.5 text-xs font-bold transition active:scale-95 sm:min-h-7 sm:min-w-0 ${
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
                    <label htmlFor={`${fieldId}-values-${idx}`} className="mb-1 block text-xs font-medium text-stone-600">
                      Your assessment
                    </label>
                    <textarea
                      id={`${fieldId}-values-${idx}`}
                      rows={2}
                      value={item.assessment || ''}
                      onChange={(e) => handleUpdateValues(idx, { assessment: e.target.value })}
                      placeholder="Enter value assessment..."
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 text-xs text-stone-800 placeholder:text-stone-500 focus:border-peach-400 focus:bg-white"
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
              Additional Supervisor Questions
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
                  <RowTag rowNumber={q.rowNumber} className="mt-0.5" />
                  <p className="text-sm font-semibold text-stone-900">{q.question}</p>
                </div>
                <div className="mt-2 rounded-xl bg-stone-50 p-3 border border-stone-100">
                  <span className="mb-1 block text-xs font-semibold text-stone-600">
                    Supervisor&apos;s answer
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
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50 p-3.5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900">
                2.1 Feedback Rating
              </h2>
              <p className="text-xs text-stone-500">
                Employee onboarding experience ratings (1.0 to 5.0 Likert scale).
              </p>
            </div>
            <SheetToolsMenu
              className="ml-auto"
              items={copyItems('ratings', 'Feedback ratings', 'B51:B60', () => clipboardForFeedbackRatings(review.feedbackRatings))}
            />
          </div>

          <div className="space-y-3">
            {review.feedbackRatings.map((item, idx) => (
              <div
                key={item.rowNumber}
                className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-4.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 hover:shadow-xs transition"
              >
                <div className="flex min-w-0 max-w-xl items-center gap-2.5">
                  <RowTag rowNumber={item.rowNumber} />
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
                        aria-pressed={active}
                        aria-label={`${item.question}: ${rating} of 5`}
                        className={`size-11 rounded-lg text-xs font-bold transition active:scale-95 sm:size-7 ${
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
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50 p-3.5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900">
                2.2 Qualitative Feedback
              </h2>
              <p className="text-xs text-stone-500">
                Qualitative reflections comparing Supervisor's feedback with Employee's perspective.
              </p>
            </div>
            <SheetToolsMenu
              className="ml-auto"
              items={copyItems('qualitative', 'Qualitative feedback', 'B64:D66', () => clipboardForQualitativeFeedback(review.qualitativeFeedback))}
            />
          </div>

          <div className="space-y-4">
            {review.qualitativeFeedback.map((item, idx) => (
              <div
                key={item.rowNumber}
                className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-2xs space-y-3 hover:shadow-xs transition"
              >
                <div className="flex items-start gap-2.5">
                  <RowTag rowNumber={item.rowNumber} className="mt-0.5" />
                  <h3 className="text-sm font-semibold text-stone-900">{item.question}</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  {/* Supervisor comment */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                    <span className="mb-1 block text-xs font-semibold text-stone-600">
                      Supervisor&apos;s comment
                    </span>
                    <p className="text-xs leading-relaxed text-stone-800 whitespace-pre-line">
                      {item.supervisorComment}
                    </p>
                  </div>

                  {/* Employee comment */}
                  <div className="rounded-xl border border-peach-200 bg-peach-50/30 p-3.5">
                    <label htmlFor={`${fieldId}-qualitative-${idx}`} className="mb-1 block text-xs font-semibold text-peach-900">
                      Your comment
                    </label>
                    <textarea
                      id={`${fieldId}-qualitative-${idx}`}
                      rows={6}
                      value={item.employeeComment}
                      onChange={(e) => handleUpdateQualitative(idx, { employeeComment: e.target.value })}
                      className="w-full rounded-lg border border-peach-200/80 bg-white p-2 text-xs leading-relaxed text-stone-800 focus:ring-2 focus:ring-peach-300"
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
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-stone-50 p-3.5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900">
                HRD Questions
              </h2>
              <p className="text-xs text-stone-500">
                Employee reflections on adaptation, challenges, internal systems, and long-term career goals.
              </p>
            </div>
            <SheetToolsMenu
              className="ml-auto"
              items={copyItems('hrd', 'HRD reflections', 'B68:B73', () => clipboardForHrdQuestions(review.hrdQuestions))}
            />
          </div>

          <div className="space-y-4">
            {review.hrdQuestions.map((item, idx) => (
              <div
                key={item.rowNumber}
                className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-2xs space-y-3 hover:shadow-xs transition"
              >
                <div className="flex items-start gap-2.5">
                  <RowTag rowNumber={item.rowNumber} className="mt-0.5" />
                  <h3 className="text-sm font-semibold text-stone-900 whitespace-pre-line">
                    {item.question}
                  </h3>
                </div>

                <div>
                  <label htmlFor={`${fieldId}-hrd-${idx}`} className="mb-1 block text-xs font-semibold text-stone-600">
                    Your comment
                  </label>
                  <textarea
                    id={`${fieldId}-hrd-${idx}`}
                    rows={6}
                    value={item.employeeComment}
                    onChange={(e) => handleUpdateHrd(idx, e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs leading-relaxed text-stone-800 placeholder:text-stone-500 focus:border-peach-400 focus:bg-white"
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
