'use client';

import { useEffect, useState } from 'react';
import { clipboardRowForModule, type TrainingModule, type MaterialLink } from '@/lib/glossary';

interface GlossaryDetailModalProps {
  module: TrainingModule | null;
  onClose: () => void;
}

function getLinkIcon(type: MaterialLink['type']) {
  switch (type) {
    case 'video':
      return '🎥';
    case 'slides':
      return '📑';
    case 'doc':
      return '📄';
    case 'sheet':
      return '📊';
    default:
      return '🔗';
  }
}

export function GlossaryDetailModal({ module, onClose }: GlossaryDetailModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!module) return null;

  async function handleCopy() {
    if (!module) return;
    const row = clipboardRowForModule(module);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(row);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }

  const links = module.materialLinks || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-pop-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 p-6 sm:p-7">
          <div className="pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                {module.media}
              </span>
              <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-700">
                {module.durationMinutes} min
              </span>
              <span className="rounded-full bg-lavender-50 px-2.5 py-0.5 text-xs font-medium text-lavender-700">
                PIC: {module.pic}
              </span>
            </div>
            <h2 id="glossary-modal-title" className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl leading-snug">
              {module.topic}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* Section 1: Objectives */}
          <section aria-labelledby="section-objectives">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-mint-100 text-xs text-mint-800">
                🎯
              </span>
              <h3 id="section-objectives" className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Objectives
              </h3>
            </div>
            <div className="rounded-2xl bg-stone-50/80 p-4 text-xs sm:text-sm leading-relaxed text-stone-700 whitespace-pre-line border border-stone-100">
              {module.objectives || 'No explicit objectives stated.'}
            </div>
          </section>

          {/* Section 2: Framework / Materials */}
          <section aria-labelledby="section-materials">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-lavender-100 text-xs text-lavender-800">
                🧩
              </span>
              <h3 id="section-materials" className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Framework &amp; Materials
              </h3>
            </div>
            <div className="rounded-2xl bg-stone-50/80 p-4 text-xs sm:text-sm leading-relaxed text-stone-700 whitespace-pre-line border border-stone-100">
              {module.frameworkMaterials || module.materials || 'No materials checklist specified.'}
            </div>
          </section>

          {/* Section 3: Material Access (Clickable Links & Live Resources) */}
          <section aria-labelledby="section-access">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-sky-100 text-xs text-sky-800">
                🔗
              </span>
              <h3 id="section-access" className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Material Access &amp; Links
              </h3>
            </div>

            <div className="rounded-2xl bg-sky-50/40 p-4 border border-sky-100 space-y-3">
              {/* If structured clickable links are present */}
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-xl bg-white p-3 shadow-xs border border-sky-200 transition hover:border-sky-400 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{getLinkIcon(link.type)}</span>
                        <span className="text-xs sm:text-sm font-semibold text-sky-900 group-hover:text-sky-700">
                          {link.label}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800 group-hover:bg-sky-200 transition">
                        Open Link ↗
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {/* Text description from worksheet */}
              <div className="text-xs sm:text-sm leading-relaxed text-stone-600 whitespace-pre-line">
                {module.materialAccess}
              </div>
            </div>
          </section>

          {/* Section 4: Notes & Guidelines */}
          {module.notes && (
            <section aria-labelledby="section-notes">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-sun-100 text-xs text-sun-800">
                  📝
                </span>
                <h3 id="section-notes" className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Session Notes &amp; Guidelines
                </h3>
              </div>
              <div className="rounded-2xl bg-sun-50/50 p-4 text-xs sm:text-sm leading-relaxed text-sun-900 whitespace-pre-line border border-sun-100">
                {module.notes}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/50 p-4 sm:p-5">
          <a
            href="/diary"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-white border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            Open Onboarding Diary →
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-stone-100 px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-200 active:scale-95"
            >
              {copied ? '✓ Copied TSV!' : '📋 Copy Module TSV'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-stone-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
