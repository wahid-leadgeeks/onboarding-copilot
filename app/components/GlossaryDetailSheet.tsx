'use client';

import React, { useEffect } from 'react';
import type { TrainingModule } from '@/lib/glossary';
import {
  IconCalendar,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconMeeting,
  IconUser,
  IconVideo,
  IconX,
} from './Icons';

export interface GlossaryDetailSheetProps {
  readonly module: TrainingModule | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onPrevModule?: () => void;
  readonly onNextModule?: () => void;
  readonly hasPrev?: boolean;
  readonly hasNext?: boolean;
}

export function GlossaryDetailSheet({
  module,
  isOpen,
  onClose,
  onPrevModule,
  onNextModule,
  hasPrev = false,
  hasNext = false,
}: GlossaryDetailSheetProps) {
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

  if (!isOpen || !module) return null;

  const isVideo = module.media.toLowerCase().includes('video');
  const isMeeting = module.media.toLowerCase().includes('meeting');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-detail-sheet-title"
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
                  <span>{module.media}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                  <IconClock className="h-3 w-3 text-stone-400" />
                  <span>{module.durationMinutes} mins</span>
                </span>
              </div>
              <h2
                id="glossary-detail-sheet-title"
                className="text-lg font-semibold text-stone-900 sm:text-xl leading-snug"
              >
                {module.topic}
              </h2>
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <IconUser className="h-3.5 w-3.5 text-stone-400" />
                <span>
                  Person in Charge: <strong className="text-stone-700">{module.pic}</strong>
                </span>
              </div>
            </div>

            {/* Prev / Next & Close */}
            <div className="flex items-center gap-1 shrink-0">
              {onPrevModule && (
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={onPrevModule}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Previous module"
                  aria-label="Previous module"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {onNextModule && (
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextModule}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Next module"
                  aria-label="Next module"
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
            {/* Learning Objectives */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Learning Objectives
              </span>
              <p className="text-xs text-stone-800 leading-relaxed">
                {module.objectives}
              </p>
            </div>

            {/* Framework & Materials */}
            {module.frameworkMaterials && (
              <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-2xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Framework &amp; Core Materials
                </span>
                <div className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                  {module.frameworkMaterials}
                </div>
              </div>
            )}

            {/* Material Access / Links */}
            {(module.materialLinks && module.materialLinks.length > 0) || module.materialAccess ? (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Access &amp; External Resources
                </span>

                {module.materialLinks && module.materialLinks.length > 0 ? (
                  <div className="space-y-2">
                    {module.materialLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/50 p-3 text-xs font-medium text-stone-800 hover:bg-stone-100 hover:border-stone-300 transition"
                      >
                        <div className="flex items-center gap-2">
                          {link.type === 'video' ? (
                            <IconVideo className="h-4 w-4 text-stone-600 shrink-0" />
                          ) : (
                            <IconExternalLink className="h-4 w-4 text-stone-600 shrink-0" />
                          )}
                          <span>{link.label}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-mint-700">Open ↗</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-xs text-stone-700">
                    {module.materialAccess}
                  </div>
                )}
              </div>
            ) : null}

            {/* Delivery Notes */}
            {module.notes && (
              <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Delivery Guidance &amp; Notes
                </span>
                <p className="text-xs text-stone-700 leading-relaxed">
                  {module.notes}
                </p>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="border-t border-stone-100 bg-stone-50/90 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              {module.materialLinks && module.materialLinks[0] ? (
                <a
                  href={module.materialLinks[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition active:scale-95 shadow-xs"
                >
                  <span>Launch {module.materialLinks[0].label}</span>
                  <IconExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-xs text-stone-400">
                  {isMeeting ? 'Scheduled during live meeting' : 'Offline resource'}
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-stone-500 hover:text-stone-800 transition px-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
