'use client';

import { useEffect, useState } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
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

export default function ReviewsPage() {
  const [selectedMonth, setSelectedMonth] = useState<1 | 2 | 3>(1);
  const [assessments, setAssessments] = useState<ReviewSelfAssessment[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [copiedMonth, setCopiedMonth] = useState<number | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active form inputs for selected month
  const [achievements, setAchievements] = useState('');
  const [challenges, setChallenges] = useState('');
  const [goalsNextMonth, setGoalsNextMonth] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
      const list = readReviewAssessments(raw);
      setAssessments(list);

      const existing = list.find((a) => a.month === selectedMonth);
      if (existing) {
        setAchievements(existing.achievements);
        setChallenges(existing.challenges);
        setGoalsNextMonth(existing.goalsNextMonth);
      }
    } catch {
      /* ignore */
    }
  }, [selectedMonth]);

  function handleSelectMonth(m: 1 | 2 | 3) {
    setSelectedMonth(m);
    setSavedSuccess(false);
    const existing = assessments.find((a) => a.month === m);
    if (existing) {
      setAchievements(existing.achievements);
      setChallenges(existing.challenges);
      setGoalsNextMonth(existing.goalsNextMonth);
    } else {
      setAchievements('');
      setChallenges('');
      setGoalsNextMonth('');
    }
  }

  function handleSave() {
    const updated: ReviewSelfAssessment = {
      month: selectedMonth,
      achievements,
      challenges,
      goalsNextMonth,
      updatedAt: new Date().toISOString(),
    };
    const nextList = upsertReviewAssessment(assessments, updated);
    setAssessments(nextList);
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, writeReviewAssessments(nextList));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      /* ignore storage quota error */
    }
  }

  async function handleCopyTsv(milestone: MonthlyReviewMilestone) {
    const assessment = assessments.find((a) => a.month === milestone.month) || {
      month: milestone.month,
      achievements,
      challenges,
      goalsNextMonth,
      updatedAt: new Date().toISOString(),
    };
    const row = clipboardRowForReview(milestone, assessment, scores);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopiedMonth(milestone.month);
        setTimeout(() => setCopiedMonth(null), 2500);
      }
    } catch {
      /* ignore */
    }
  }

  const milestone = OFFICIAL_MONTHLY_REVIEWS.find((m) => m.month === selectedMonth) ?? OFFICIAL_MONTHLY_REVIEWS[0];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Reviews" />

      {/* Header */}
      <header className="animate-fade-up pb-6">
        <p className="text-sm font-medium text-stone-500">Sheet: 1st to 3rd Month Review · Probation Checkpoints</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Monthly Reviews & Values 🎯
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Evaluations across Month 1, Month 2, and Month 3 probation milestones, plus HARPS Core Values alignment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCopyTsv(milestone)}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 shrink-0 ${
              copiedMonth === milestone.month
                ? 'bg-mint-500 text-white shadow-soft'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
          >
            {copiedMonth === milestone.month ? '✓ Copied Review TSV!' : '📋 Copy Month TSV'}
          </button>
        </div>
      </header>

      {/* Month Selector Tabs - Single View Page Principle */}
      <div className="animate-fade-up stagger-1" role="tablist" aria-label="Review Milestones">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-stone-100 p-1">
          {OFFICIAL_MONTHLY_REVIEWS.map((m) => {
            const isSelected = selectedMonth === m.month;
            const hasAssessment = assessments.some((a) => a.month === m.month && a.achievements.trim().length > 0);
            return (
              <button
                key={m.month}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectMonth(m.month)}
                className={`flex flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition ${
                  isSelected
                    ? 'bg-white font-semibold text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">Month {m.month}</span>
                  {hasAssessment && <span className="text-[10px] text-mint-600 font-bold">✓</span>}
                </div>
                <span className="mt-0.5 text-[11px] text-stone-400">Day {m.targetDays}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Milestone Card */}
      <section className="animate-fade-up stagger-2 mt-4 rounded-card bg-white p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
              Probation Milestone
            </span>
            <h2 className="mt-1.5 text-xl font-semibold text-stone-900 sm:text-2xl">
              {milestone.stageTitle}
            </h2>
          </div>
          <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-medium text-mint-700">
            Target: Day {milestone.targetDays}
          </span>
        </div>

        {/* Milestone Focus */}
        <div className="mt-4 rounded-xl bg-cream/70 p-3.5 text-xs leading-relaxed text-stone-700">
          <span className="font-semibold text-stone-900">Evaluation Focus: </span>
          {milestone.focus}
        </div>

        {/* Technical Competencies Grid */}
        <div className="mt-6 border-t border-stone-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            1. Technical & Role Competencies
          </h3>
          <div className="mt-3 space-y-3">
            {milestone.technicalCriteria.map((item) => {
              const currentScore = scores[item.id] || 0;
              return (
                <div key={item.id} className="rounded-xl border border-stone-100 p-3.5 bg-stone-50/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900">{item.title}</h4>
                      <p className="mt-0.5 text-[11px] text-stone-500 leading-normal">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setScores((prev) => ({ ...prev, [item.id]: score }))}
                          className={`size-6 rounded-lg text-[11px] font-bold transition ${
                            currentScore === score
                              ? 'bg-stone-900 text-white'
                              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                          }`}
                          aria-label={`Score ${score} for ${item.title}`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HARPS Core Values Grid */}
        <div className="mt-6 border-t border-stone-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              2. HARPS Values Assessment
            </h3>
            <span className="text-[11px] text-stone-400">Honest · Adaptive · Responsible · Punctual · Solution-oriented</span>
          </div>
          <div className="mt-3 space-y-3">
            {milestone.valuesCriteria.map((item) => {
              const currentScore = scores[item.id] || 0;
              return (
                <div key={item.id} className="rounded-xl border border-stone-100 p-3.5 bg-stone-50/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900">{item.title}</h4>
                      <p className="mt-0.5 text-[11px] text-stone-500 leading-normal">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setScores((prev) => ({ ...prev, [item.id]: score }))}
                          className={`size-6 rounded-lg text-[11px] font-bold transition ${
                            currentScore === score
                              ? 'bg-mint-600 text-white'
                              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                          }`}
                          aria-label={`Score ${score} for ${item.title}`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Self-Assessment Reflection */}
        <div className="mt-6 border-t border-stone-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            3. Self-Reflection & Next Commitments
          </h3>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="achievements" className="block text-xs font-medium text-stone-700 mb-1">
                Key Achievements & Highlights
              </label>
              <textarea
                id="achievements"
                rows={2}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="What went well? Major features shipped, onboarding syllabus completed, SOPs established..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="challenges" className="block text-xs font-medium text-stone-700 mb-1">
                Challenges & Obstacles Faced
              </label>
              <textarea
                id="challenges"
                rows={2}
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder="What was tricky or where do you need more support or guidance?"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="goalsNextMonth" className="block text-xs font-medium text-stone-700 mb-1">
                Focus & Goals for Next Month
              </label>
              <textarea
                id="goalsNextMonth"
                rows={2}
                value={goalsNextMonth}
                onChange={(e) => setGoalsNextMonth(e.target.value)}
                placeholder="Specific competencies or projects you will own in the upcoming month..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-stone-900 px-5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95"
            >
              {savedSuccess ? '✓ Saved Locally!' : 'Save Reflection'}
            </button>
            {savedSuccess && (
              <span className="text-xs text-mint-700 font-medium">Ready to sync or paste</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleCopyTsv(milestone)}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-stone-100 px-4 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95"
          >
            {copiedMonth === milestone.month ? '✓ Copied TSV!' : '📋 Copy Row TSV'}
          </button>
        </div>
      </section>

      {/* HARPS Legend Drawer */}
      <section className="animate-fade-up stagger-3 mt-6 rounded-card bg-lavender-50/60 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-lavender-800">
          LeadGeeks HARPS Values Guide
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {HARPS_VALUES.map((v) => (
            <div key={v.key} className="rounded-xl bg-white/80 p-3 text-xs shadow-xs">
              <span className="font-bold text-stone-900">{v.name}</span>
              <p className="mt-0.5 text-stone-600 text-[11px] leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
