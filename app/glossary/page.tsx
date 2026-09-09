'use client';

import { useState } from 'react';
import { PrimaryNav } from '@/app/components/PrimaryNav';
import {
  OFFICIAL_SHEET_GUIDES,
  OFFICIAL_TRAINING_MODULES,
  type SheetGuideItem,
  type TrainingModule,
} from '@/lib/glossary';
import { GlossaryDetailSheet } from '@/app/components/GlossaryDetailSheet';
import {
  IconVideo,
  IconMeeting,
  IconFileText,
  IconExternalLink,
} from '@/app/components/Icons';

const sheetRoutes: Record<string, string> = {
  Schedule: '/schedule',
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
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  const filteredModules = OFFICIAL_TRAINING_MODULES.filter((mod) => {
    if (mediaFilter !== 'all' && !mod.media.toLowerCase().includes(mediaFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        mod.topic.toLowerCase().includes(q) ||
        mod.pic.toLowerCase().includes(q) ||
        mod.objectives.toLowerCase().includes(q) ||
        mod.frameworkMaterials.toLowerCase().includes(q) ||
        (mod.materialAccess && mod.materialAccess.toLowerCase().includes(q)) ||
        (mod.notes && mod.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Prev / Next navigation for drawer
  const currentIndex = selectedModule
    ? filteredModules.findIndex((m) => m.id === selectedModule.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredModules.length - 1;
  const onPrevModule = hasPrev ? () => setSelectedModule(filteredModules[currentIndex - 1]) : undefined;
  const onNextModule = hasNext ? () => setSelectedModule(filteredModules[currentIndex + 1]) : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Glossary" />

      {/* Header */}
      <header className="animate-fade-up pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Worksheet: Glossaries &amp; Guide · Master Curriculum Catalog
        </p>
        <div className="mt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Glossary &amp; Guides
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Master syllabus covering 19 mandatory onboarding training modules and guide to all 6 sheets in your workbook.
          </p>
        </div>
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
            Syllabus Modules ({OFFICIAL_TRAINING_MODULES.length})
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
            Workbook Guide (6 Sheets)
          </button>
        </div>
      </div>

      {activeTab === 'modules' && (
        <section className="animate-fade-up stagger-2 mt-5 space-y-4" aria-label="Syllabus Modules">
          {/* Minimal Pulse Bar: Filters & Search */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMediaFilter('all')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    mediaFilter === 'all'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  All ({OFFICIAL_TRAINING_MODULES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter('Video')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    mediaFilter === 'Video'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <IconVideo className="h-3 w-3" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter('Online Meeting')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    mediaFilter === 'Online Meeting'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <IconMeeting className="h-3 w-3" />
                  <span>Online Meeting</span>
                </button>
              </div>

              <div>
                <input
                  type="search"
                  placeholder="Search topic or PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none sm:w-64"
                />
              </div>
            </div>

            {/* Clean 1-Line Module Rows */}
            <div className="mt-4 space-y-2">
              {filteredModules.map((mod, idx) => {
                const isVideo = mod.media.toLowerCase().includes('video');
                const isMeeting = mod.media.toLowerCase().includes('meeting');

                return (
                  <div
                    key={mod.id}
                    onClick={() => setSelectedModule(mod)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-stone-200 bg-white p-3 sm:px-4 sm:py-2.5 cursor-pointer hover:border-stone-300 hover:shadow-2xs transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Number Pill */}
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-bold text-stone-600">
                        {idx + 1}
                      </span>

                      {/* Topic Title */}
                      <h3 className="text-sm font-medium text-stone-900 truncate">
                        {mod.topic}
                      </h3>
                    </div>

                    {/* Right side: PIC chip, Media badge, Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-9 sm:pl-0">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                        {mod.pic}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isVideo
                            ? 'bg-lavender-50 text-lavender-800'
                            : isMeeting
                            ? 'bg-peach-50 text-peach-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {isVideo ? (
                          <IconVideo className="h-3 w-3" />
                        ) : isMeeting ? (
                          <IconMeeting className="h-3 w-3" />
                        ) : (
                          <IconFileText className="h-3 w-3" />
                        )}
                        <span>{mod.durationMinutes}m</span>
                      </span>

                      <span className="text-xs font-semibold text-stone-500 group-hover:text-stone-900 transition pl-1">
                        Details →
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredModules.length === 0 && (
                <p className="py-8 text-center text-xs text-stone-400">
                  No syllabus modules match your filter.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'guide' && (
        <section className="animate-fade-up stagger-2 mt-5 space-y-3" aria-label="Workbook Guide">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OFFICIAL_SHEET_GUIDES.map((item) => {
              const targetRoute = sheetRoutes[item.tabName] || '/';

              return (
                <div
                  key={item.tabName}
                  className="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-2xs hover:shadow-soft transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white">
                        {item.tabName}
                      </span>
                      <a
                        href={targetRoute}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-mint-700 hover:text-mint-900 transition"
                      >
                        <span>Open Screen</span>
                        <IconExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <p className="mt-3 text-xs text-stone-700 leading-relaxed">
                      {item.function}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      How to use
                    </span>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      {item.howToUse}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Slide-over Glossary Detail Drawer */}
      <GlossaryDetailSheet
        module={selectedModule}
        isOpen={Boolean(selectedModule)}
        onClose={() => setSelectedModule(null)}
        onPrevModule={onPrevModule}
        onNextModule={onNextModule}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </main>
  );
}
