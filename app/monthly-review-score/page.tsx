'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  SCORING_CATEGORIES,
  DEPARTMENT_VALUES_SCORING_INDICATORS,
  TECHNICAL_SCORING_INDICATORS,
  STANDARD_SCORES,
  clipboardForScoringRubric,
  type ScoringLevel,
} from '@/lib/review-scoring';
import { useToast } from '@/app/components/Toast';
import {
  IconTarget,
  IconClipboard,
  IconCheck,
  IconTrophy,
  IconStar,
  IconBookOpen,
} from '@/app/components/Icons';

export default function MonthlyReviewScorePage() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'department-values' | 'technical' | 'comparison'>('all');
  const [selectedScoreFilter, setSelectedScoreFilter] = useState<number | 'all'>('all');
  const [copiedRubric, setCopiedRubric] = useState(false);
  const [copiedItemKey, setCopiedItemKey] = useState<string | null>(null);

  async function handleCopyRubric() {
    const tsv = clipboardForScoringRubric();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedRubric(true);
        toast.success('Copied entire Scoring Rubric TSV to clipboard!');
        setTimeout(() => setCopiedRubric(false), 3000);
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  }

  async function handleCopyItem(level: ScoringLevel, score: string, desc: string, key: string) {
    const text = `${level}\t${score}\t${desc}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedItemKey(key);
        toast.success(`Copied ${level} (${score}) indicator!`);
        setTimeout(() => setCopiedItemKey(null), 2500);
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-peach-100 px-3 py-1 text-xs font-semibold text-peach-800">
                <IconTarget className="h-3.5 w-3.5 text-peach-700" />
                Sheet: Monthly Review Score
              </span>
              <span className="text-xs font-medium text-stone-500">
                Standard Scoring Indicator Rubric
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Monthly Review Score
            </h1>
            <p className="mt-1 text-sm text-stone-500 max-w-2xl">
              The official 5-tier evaluation rubric defining standard expectations for Department Values and Technical Competency across all monthly reviews.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyRubric}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 active:scale-95"
            >
              {copiedRubric ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                  <span className="text-mint-700">Copied Rubric!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                  <span>Copy Rubric TSV</span>
                </>
              )}
            </button>

            <Link
              href="/first-month-review"
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-stone-700 active:scale-95"
            >
              <IconTrophy className="h-3.5 w-3.5 text-amber-400" />
              <span>Go to First Month Review →</span>
            </Link>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STANDARD_SCORES.map((score) => {
            const valItem = DEPARTMENT_VALUES_SCORING_INDICATORS.find((i) => i.score === score);
            const isFilterActive = selectedScoreFilter === score;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setSelectedScoreFilter((prev) => (prev === score ? 'all' : score))}
                className={`rounded-2xl border p-3 text-left transition-all duration-200 active:scale-98 ${
                  isFilterActive
                    ? 'border-stone-900 bg-stone-900 text-white shadow-sm ring-2 ring-stone-900/20'
                    : 'border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base font-bold ${isFilterActive ? 'text-white' : 'text-stone-900'}`}>
                    {score.toFixed(1)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isFilterActive
                        ? 'bg-stone-800 text-stone-200'
                        : valItem?.theme.badgeBg + ' ' + valItem?.theme.badgeText
                    }`}
                  >
                    {valItem?.level}
                  </span>
                </div>
                <p className={`mt-1 text-[11px] line-clamp-1 ${isFilterActive ? 'text-stone-300' : 'text-stone-500'}`}>
                  {score === 100 ? 'Sets benchmark' : score >= 80 ? 'Independent' : 'Supervised'}
                </p>
              </button>
            );
          })}
        </div>
      </header>

      {/* Navigation Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'department-values', label: 'Department Values' },
            { id: 'technical', label: 'Technical Assessment' },
            { id: 'comparison', label: 'Side-by-Side Matrix' },
          ].map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as typeof selectedCategory)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
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

        {selectedScoreFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedScoreFilter('all')}
            className="text-xs font-medium text-stone-500 hover:text-stone-900 underline underline-offset-2"
          >
            Clear score filter ({selectedScoreFilter.toFixed(1)})
          </button>
        )}
      </div>

      {/* View 1 & 2: Category Cards */}
      {selectedCategory !== 'comparison' && (
        <div className="space-y-8">
          {SCORING_CATEGORIES.filter((cat) =>
            selectedCategory === 'all' ? true : cat.key === selectedCategory
          ).map((cat) => {
            const filteredItems = cat.items.filter((item) =>
              selectedScoreFilter === 'all' ? true : item.score === selectedScoreFilter
            );

            return (
              <section key={cat.key} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-stone-900">
                      {cat.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-stone-500">{cat.description}</p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">
                    {filteredItems.length} tiers
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-1">
                  {filteredItems.map((item) => {
                    const key = `${cat.key}-${item.score}`;
                    const isCopied = copiedItemKey === key;

                    return (
                      <div
                        key={item.score}
                        className={`group relative rounded-2xl border p-4.5 sm:p-5 transition-all duration-200 hover:shadow-md ${item.theme.bg} ${item.theme.border}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="rounded-lg bg-stone-900 px-2.5 py-1 text-sm font-bold text-white shadow-2xs">
                              {item.formattedScore}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.theme.badgeBg} ${item.theme.badgeText}`}>
                              {item.level}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyItem(item.level, item.formattedScore, item.description, key)}
                            className="opacity-90 group-hover:opacity-100 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-stone-700 shadow-2xs backdrop-blur-xs transition hover:bg-white active:scale-95"
                            title="Copy single indicator row (TSV)"
                          >
                            {isCopied ? (
                              <>
                                <IconCheck className="h-3 w-3 text-mint-600" />
                                <span className="text-mint-700 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <IconClipboard className="h-3 w-3 text-stone-400" />
                                <span>Copy TSV</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className={`mt-3 text-sm leading-relaxed ${item.theme.text}`}>
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* View 3: Side-by-Side Comparison Matrix */}
      {selectedCategory === 'comparison' && (
        <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-2xs">
          <div className="p-4 border-b border-stone-100 bg-stone-50/60">
            <h2 className="text-sm font-bold text-stone-900">Side-by-Side Level Comparison</h2>
            <p className="text-xs text-stone-500">
              Direct comparison between Department Values and Technical expectations across identical score tiers.
            </p>
          </div>

          <div className="divide-y divide-stone-100">
            {STANDARD_SCORES.map((score) => {
              const val = DEPARTMENT_VALUES_SCORING_INDICATORS.find((i) => i.score === score);
              const tech = TECHNICAL_SCORING_INDICATORS.find((i) => i.score === score);

              return (
                <div key={score} className="p-4 sm:p-5 hover:bg-stone-50/30 transition">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-lg bg-stone-900 px-2.5 py-1 text-sm font-bold text-white shadow-2xs">
                      {score.toFixed(1)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${val?.theme.badgeBg} ${val?.theme.badgeText}`}>
                      {val?.level}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-900 mb-1.5">
                        <IconStar className="h-3.5 w-3.5 text-sky-600" />
                        <span>Department Values Assessment</span>
                      </div>
                      <p className="text-xs leading-relaxed text-sky-950">
                        {val?.description}
                      </p>
                    </div>

                    <div className="rounded-xl border border-mint-100 bg-mint-50/30 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-mint-900 mb-1.5">
                        <IconBookOpen className="h-3.5 w-3.5 text-mint-600" />
                        <span>Technical Assessment</span>
                      </div>
                      <p className="text-xs leading-relaxed text-mint-950">
                        {tech?.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
