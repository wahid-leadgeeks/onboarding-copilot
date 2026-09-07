'use client';

import { useState } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import {
  OFFICIAL_SHEET_GUIDES,
  OFFICIAL_TRAINING_MODULES,
  type SheetGuideItem,
  type TrainingModule,
} from '@/lib/glossary';

const sheetRoutes: Record<string, string> = {
  Schedule: '/',
  Timeline: '/timeline',
  'Onboarding Diary': '/diary',
  'Feedback Sheet': '/feedback',
  '1st to 3rd Month Review': '/reviews',
  Glossaries: '/glossary',
};

export default function GlossaryPage() {
  const [activeTab, setActiveTab] = useState<'modules' | 'guide'>('modules');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'Video' | 'Online Meeting'>('all');

  const filteredModules = OFFICIAL_TRAINING_MODULES.filter((mod) => {
    if (mediaFilter !== 'all' && mod.media !== mediaFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        mod.topic.toLowerCase().includes(q) ||
        mod.pic.toLowerCase().includes(q) ||
        mod.objectives.toLowerCase().includes(q) ||
        mod.materials.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Glossary" />

      {/* Header */}
      <header className="animate-fade-up pb-6">
        <p className="text-sm font-medium text-stone-500">Sheet: Glossaries & Guide · Master Catalog</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Glossary & Guides 📚
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Curriculum directory of mandatory onboarding training modules and guide to all 6 sheets in your workbook.
        </p>
      </header>

      {/* Tabs */}
      <div className="animate-fade-up stagger-1" role="tablist" aria-label="Glossary Views">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'modules'}
            onClick={() => setActiveTab('modules')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === 'modules'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Training Modules</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600">
              {OFFICIAL_TRAINING_MODULES.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'guide'}
            onClick={() => setActiveTab('guide')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === 'guide'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Spreadsheet Guide</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600">
              {OFFICIAL_SHEET_GUIDES.length} Sheets
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Training Modules */}
      {activeTab === 'modules' && (
        <section className="animate-fade-up stagger-2 mt-4 space-y-4" aria-label="Training Modules">
          {/* Controls Bar */}
          <div className="rounded-card bg-white p-4 shadow-soft sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Media format filter">
              <button
                type="button"
                onClick={() => setMediaFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mediaFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All ({OFFICIAL_TRAINING_MODULES.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('Video')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mediaFilter === 'Video'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                🎥 Video
              </button>
              <button
                type="button"
                onClick={() => setMediaFilter('Online Meeting')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mediaFilter === 'Online Meeting'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                💬 Online Meeting
              </button>
            </div>

            <div className="mt-3 sm:mt-0">
              <input
                type="search"
                placeholder="Search modules, PIC, objectives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none sm:w-64"
              />
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredModules.map((mod: TrainingModule) => (
              <article
                key={mod.id}
                className="rounded-card bg-white p-5 shadow-soft transition hover:shadow-lift flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                      {mod.media === 'Video' ? '🎥 Video' : '💬 Meeting'}
                    </span>
                    <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-semibold text-mint-700">
                      {mod.durationMinutes} min
                    </span>
                    <span className="ml-auto text-[11px] font-medium text-stone-400">
                      PIC: {mod.pic}
                    </span>
                  </div>

                  <h2 className="text-sm font-semibold text-stone-900 leading-snug">
                    {mod.topic}
                  </h2>
                  <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {mod.objectives}
                  </p>
                </div>

                <div className="mt-4 border-t border-stone-100 pt-3 flex items-center justify-between text-[11px]">
                  <span className="text-stone-400 truncate max-w-[180px]">
                    {mod.materialAccess || 'Workbook materials'}
                  </span>
                  <a
                    href="/diary"
                    className="font-medium text-mint-700 hover:text-mint-800 underline underline-offset-2"
                  >
                    View Diary →
                  </a>
                </div>
              </article>
            ))}
          </div>

          {filteredModules.length === 0 && (
            <div className="rounded-card bg-white p-12 text-center text-stone-400 shadow-soft">
              No training modules match your search criteria.
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Spreadsheet Guide */}
      {activeTab === 'guide' && (
        <section className="animate-fade-up stagger-2 mt-4 space-y-3" aria-label="Spreadsheet Guide">
          <div className="rounded-card bg-cream/70 p-4 text-xs text-stone-700">
            <span className="font-bold text-stone-900">Official HR Architecture: </span>
            The onboarding workbook is organized into 6 focused worksheets. NOVA provides a dedicated, lightweight cockpit for each sheet so you never have to wrestle with cumbersome spreadsheets.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OFFICIAL_SHEET_GUIDES.map((item: SheetGuideItem) => {
              const route = sheetRoutes[item.tabName] || '/';
              return (
                <article
                  key={item.tabName}
                  className="rounded-card bg-white p-5 shadow-soft transition hover:shadow-lift flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-800">
                        Sheet: {item.tabName}
                      </span>
                    </div>
                    <h2 className="mt-2 text-sm font-semibold text-stone-900">
                      Function & Purpose
                    </h2>
                    <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                      {item.function}
                    </p>
                    <div className="mt-3 rounded-lg bg-stone-50 p-2.5 text-[11px] text-stone-500">
                      <span className="font-semibold text-stone-700">How to use: </span>
                      {item.howToUse}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-stone-100 pt-3 flex justify-end">
                    <a
                      href={route}
                      className="inline-flex min-h-8 items-center justify-center rounded-full bg-stone-900 px-3.5 py-1 text-xs font-semibold text-white transition hover:bg-stone-800"
                    >
                      Open in NOVA →
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
