'use client';

import { useEffect, useState } from 'react';
import {
  HARPS_VALUES,
  OFFICIAL_MONTHLY_REVIEWS,
  REVIEWS_STORAGE_KEY,
  clipboardRowForReview,
  readReviewAssessments,
  upsertReviewAssessment,
  writeReviewAssessments,
  type MonthlyReviewMilestone,
  type ReviewSelfAssessment,
} from '@/lib/reviews';
import { ReviewDetailSheet } from '@/app/components/ReviewDetailSheet';
import { useToast } from '@/app/components/Toast';
import { ReviewsTabs } from '@/app/components/ReviewsTabs';

export default function ReviewsPage() {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<ReviewSelfAssessment[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<MonthlyReviewMilestone | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [copiedMonth, setCopiedMonth] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
      const list = readReviewAssessments(raw);
      setAssessments(list);

      const savedScores = localStorage.getItem('nova-monthly-reviews-scores');
      if (savedScores) {
        setScores(JSON.parse(savedScores));
      }
    } catch {
      /* ignore */
    }

    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (data?.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
          const dbAssessments: ReviewSelfAssessment[] = data.reviews.map((r: any) => ({
            month: r.month,
            achievements: r.achievements || '',
            challenges: r.challenges || '',
            goalsNextMonth: r.goalsNextMonth || '',
            updatedAt: r.updatedAt || new Date().toISOString(),
          }));
          setAssessments(dbAssessments);
        }
      })
      .catch(() => {});
  }, []);

  function persistAssessments(next: ReviewSelfAssessment[]) {
    setAssessments(next);
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, writeReviewAssessments(next));
    } catch {
      /* ignore */
    }
  }

  function handleScoreChange(criteriaId: string, score: number) {
    setScores((prev) => {
      const next = { ...prev, [criteriaId]: score };
      try {
        localStorage.setItem('nova-monthly-reviews-scores', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function handleSaveAssessment(assessment: ReviewSelfAssessment) {
    const next = upsertReviewAssessment(assessments, assessment);
    persistAssessments(next);
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        month: assessment.month,
        achievements: assessment.achievements,
        challenges: assessment.challenges,
        goalsNextMonth: assessment.goalsNextMonth,
        technicalRatings: scores,
      }),
    }).catch(() => {});
    toast.success(`Month ${assessment.month} self-assessment saved!`);
  }

  async function handleCopyTsv(milestone: MonthlyReviewMilestone) {
    const existing = assessments.find((a) => a.month === milestone.month);
    const row = clipboardRowForReview(milestone, existing, scores);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedMonth(milestone.month);
        toast.success(`Copied Month ${milestone.month} review. Paste it into the spreadsheet.`);
        setTimeout(() => setCopiedMonth(null), 2500);
      }
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  }

  // Prev / Next navigation for drawer
  const currentIndex = activeMilestone
    ? OFFICIAL_MONTHLY_REVIEWS.findIndex((m) => m.month === activeMilestone.month)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < OFFICIAL_MONTHLY_REVIEWS.length - 1;
  const onPrevMilestone = hasPrev
    ? () => setActiveMilestone(OFFICIAL_MONTHLY_REVIEWS[currentIndex - 1])
    : undefined;
  const onNextMilestone = hasNext
    ? () => setActiveMilestone(OFFICIAL_MONTHLY_REVIEWS[currentIndex + 1])
    : undefined;

  const activeAssessment = activeMilestone
    ? assessments.find((a) => a.month === activeMilestone.month)
    : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="animate-fade-up pb-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Probation checkpoints
          </p>
          <span className="rounded-full bg-sun-50 px-3 py-1 text-xs font-semibold text-sun-800">
            Day 30, 60 and 90
          </span>
        </div>
        <div className="mt-2 min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Monthly Reviews &amp; Values
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Self-evaluations across Month 1, Month 2, and Month 3 probation milestones, plus HARPS Core Values alignment.
          </p>
        </div>
        <ReviewsTabs className="mt-4" />
      </header>

      {/* 3 Clean Milestone Cards */}
      <section aria-labelledby="reviews-milestones-heading" className="animate-fade-up stagger-1 mt-4 space-y-4">
        <h2 id="reviews-milestones-heading" className="sr-only">
          Month-by-month reviews
        </h2>
        <div data-tour="reviews-cards-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {OFFICIAL_MONTHLY_REVIEWS.map((milestone) => {
            const assessment = assessments.find((a) => a.month === milestone.month);
            const isCompleted = Boolean(
              assessment &&
                (assessment.achievements.trim() ||
                  assessment.challenges.trim() ||
                  assessment.goalsNextMonth.trim())
            );

            // Compute average score
            const allCrit = [...milestone.technicalCriteria, ...milestone.valuesCriteria];
            const ratedCrit = allCrit.filter((c) => scores[c.id] && scores[c.id] > 0);
            const avg =
              ratedCrit.length > 0
                ? (
                    ratedCrit.reduce((sum, c) => sum + (scores[c.id] || 0), 0) /
                    ratedCrit.length
                  ).toFixed(1)
                : null;

            return (
              <button
                key={milestone.month}
                type="button"
                onClick={() => setActiveMilestone(milestone)}
                className={`group flex min-w-0 flex-col justify-between rounded-3xl border bg-white p-5 text-left transition-all ${
                  isCompleted
                    ? 'border-mint-200 hover:border-mint-300 hover:shadow-soft'
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-soft'
                }`}
              >
                <span className="block w-full">
                  <span className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
                      Month {milestone.month}
                    </span>
                    {isCompleted ? (
                      <span className="rounded-full border border-mint-200 bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-800">
                        Completed ✓
                      </span>
                    ) : (
                      <span className="rounded-full border border-peach-200 bg-peach-50 px-2.5 py-0.5 text-xs font-semibold text-peach-800">
                        Pending
                      </span>
                    )}
                  </span>

                  <span className="mt-3 block text-base font-semibold text-stone-900 transition group-hover:text-mint-800">
                    {milestone.stageTitle}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-stone-500">
                    {milestone.focus}
                  </span>
                </span>

                <span className="mt-5 block w-full space-y-3 border-t border-stone-100 pt-3">
                  <span className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">
                      {ratedCrit.length} / {allCrit.length} criteria rated
                    </span>
                    {avg ? (
                      <span className="rounded-md bg-mint-50 px-2 py-0.5 font-bold text-mint-800">
                        ★ {avg}
                      </span>
                    ) : (
                      <span className="text-stone-500">—</span>
                    )}
                  </span>

                  <span className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-stone-500">Day {milestone.targetDays}</span>
                    <span className="font-semibold text-stone-700 transition group-hover:translate-x-0.5 group-hover:text-stone-900">
                      Open Review →
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* HARPS Values Summary Strip */}
      <section className="animate-fade-up stagger-2 mt-6 rounded-3xl bg-stone-50/70 border border-stone-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-stone-200/60 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600">
            HARPS Core Values Framework
          </h2>
          <span className="text-xs text-stone-500">Evaluated in each monthly review</span>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-3">
          {HARPS_VALUES.map((val) => (
            <div key={val.key} className="rounded-2xl bg-white p-3 border border-stone-100 shadow-2xs">
              <span className="text-xs font-bold text-stone-900 block">{val.name}</span>
              <p className="mt-1 text-xs text-stone-500 leading-normal">
                {val.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Slide-over Review Detail & Self-Assessment Drawer */}
      <ReviewDetailSheet
        milestone={activeMilestone}
        existingAssessment={activeAssessment}
        scores={scores}
        onScoreChange={handleScoreChange}
        isOpen={Boolean(activeMilestone)}
        onClose={() => setActiveMilestone(null)}
        onSave={handleSaveAssessment}
        onCopyTsv={handleCopyTsv}
        onPrevMilestone={onPrevMilestone}
        onNextMilestone={onNextMilestone}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isCopied={Boolean(activeMilestone && copiedMonth === activeMilestone.month)}
      />
    </main>
  );
}
