'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  clipboardRowForDiary,
  suggestAiLearnings,
  suggestAiNotes,
  type DiaryEntryRecord,
  type DiaryTopicItem,
} from '@/lib/diary-cockpit';
import { markSynced, notifySyncChanged } from '@/lib/sync-status';
import { RowTag } from './RowTag';
import { SheetToolsMenu, type SheetToolsMenuItem } from './SheetToolsMenu';
import { shouldSheetCloseOnEscape } from './sheetEscape';
import { useRestoreFocus } from './useRestoreFocus';
import { IconCheck, IconEdit, IconSparkles, IconUser, IconX } from './Icons';

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface DiaryDetailSheetProps {
  readonly topic: DiaryTopicItem | null;
  readonly existingEntry?: DiaryEntryRecord;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (entry: DiaryEntryRecord) => void;
  readonly onCopyTsv?: (topic: DiaryTopicItem, entry?: DiaryEntryRecord) => void;
  readonly onPrevTopic?: () => void;
  readonly onNextTopic?: () => void;
  readonly hasPrev?: boolean;
  readonly hasNext?: boolean;
  readonly isCopied?: boolean;
}

export function DiaryDetailSheet({
  topic,
  existingEntry,
  isOpen,
  onClose,
  onSave,
  onCopyTsv,
  onPrevTopic,
  onNextTopic,
  hasPrev = false,
  hasNext = false,
  isCopied = false,
}: DiaryDetailSheetProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [learned, setLearned] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [aiLearningsDraft, setAiLearningsDraft] = useState<string | null>(null);
  const [aiNotesDraft, setAiNotesDraft] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const learnedId = useId();
  const notesId = useId();
  useRestoreFocus(isOpen && Boolean(topic), closeRef);

  // Sync state whenever topic or existingEntry changes
  useEffect(() => {
    if (topic) {
      const currentLearned = existingEntry?.learned !== undefined ? existingEntry.learned : (topic.defaultLearned || '');
      const currentNotes = existingEntry?.notes !== undefined ? existingEntry.notes : (topic.defaultNotes || '');
      setLearned(currentLearned);
      setNotes(currentNotes);
      setSyncMessage(null);
      setSyncError(null);
      setAiLearningsDraft(null);
      setAiNotesDraft(null);

      // If both are empty, open in edit mode; otherwise open in view mode
      const hasContent = Boolean(currentLearned.trim() || currentNotes.trim());
      setIsEditing(!hasContent);
    }
  }, [topic, existingEntry]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    // Capture phase: runs before the Sheet tools menu's own handler, while the menu is still marked open,
    // so an Escape meant for an open menu (even with focus on its trigger) closes only the menu.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldSheetCloseOnEscape(e)) return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !topic) return null;

  const isCompleted = Boolean(learned.trim() && notes.trim());
  const isNeedsNotes = Boolean(learned.trim() && !notes.trim());

  const handleSave = () => {
    const entry: DiaryEntryRecord = {
      rowNumber: topic.rowNumber,
      learned: learned.trim(),
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSave(entry);
    setIsEditing(false);
  };

  const handleSyncToSheets = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setSyncError(null);

    try {
      const res = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowNumber: topic.rowNumber,
          learned,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        markSynced(safeLocalStorage());
        notifySyncChanged();
        setSyncMessage('Synced to the sheet.');
      } else {
        setSyncError(
          `${data.error || "Couldn't sync this topic."} You can copy it from Sheet tools instead.`
        );
      }
    } catch {
      setSyncError("Couldn't reach the server to sync. You can copy this topic from Sheet tools instead.");
    } finally {
      setSyncing(false);
    }
  };

  const sheetItems: SheetToolsMenuItem[] = [
    {
      id: 'sync-topic',
      label: 'Sync this topic to the sheet',
      hint: `Writes columns G–H of row ${topic.rowNumber}`,
      onSelect: handleSyncToSheets,
      state: syncing ? 'busy' : 'idle',
    },
    ...(onCopyTsv
      ? [
          {
            id: 'copy-topic',
            label: 'Copy for the sheet',
            hint: `Columns G–H · paste at G${topic.rowNumber}`,
            onSelect: () => onCopyTsv(topic, existingEntry),
            state: isCopied ? ('done' as const) : ('idle' as const),
            doneLabel: 'Copied',
          },
        ]
      : []),
  ];

  const iconButton =
    'inline-flex size-11 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 sm:size-9';
  const sectionTitle = 'block text-[11px] font-semibold uppercase tracking-wider text-stone-500';
  const fieldLabel = 'text-[11px] font-semibold uppercase tracking-wider text-stone-600';
  const suggestButton =
    'inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-lavender-700 transition hover:text-lavender-900 sm:min-h-0';
  const draftAction = 'inline-flex min-h-11 items-center text-xs sm:min-h-0';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diary-detail-sheet-title"
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
          {/* Mobile Handle */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-stone-100 p-5 sm:p-6">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <RowTag rowNumber={topic.rowNumber} />
                <span className="rounded-full bg-lavender-50 px-2.5 py-0.5 text-xs font-semibold text-lavender-800">
                  {topic.day} · Week {topic.week}
                </span>
                {isCompleted ? (
                  <span className="rounded-full border border-mint-200 bg-mint-50 px-2 py-0.5 text-xs font-semibold text-mint-800">
                    Completed ✓
                  </span>
                ) : isNeedsNotes ? (
                  <span className="rounded-full border border-peach-200 bg-peach-50 px-2 py-0.5 text-xs font-semibold text-peach-800">
                    Needs notes
                  </span>
                ) : (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                    To do
                  </span>
                )}
              </div>
              <h2
                id="diary-detail-sheet-title"
                className="text-lg font-semibold text-stone-900 sm:text-xl leading-snug"
              >
                {topic.topic.split('\n')[0]}
              </h2>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="flex min-w-0 items-center gap-1">
                  <IconUser className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                  Led by <strong className="truncate text-stone-700">{topic.pic}</strong>
                </span>
              </div>
            </div>

            {/* Prev / Next & Close */}
            <div className="flex items-center gap-1 shrink-0">
              {onPrevTopic && (
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={onPrevTopic}
                  className={iconButton}
                  title="Previous topic"
                  aria-label="Previous topic"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {onNextTopic && (
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextTopic}
                  className={iconButton}
                  title="Next topic"
                  aria-label="Next topic"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className={iconButton}
                aria-label="Close"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Status alerts */}
            {syncMessage && (
              <div role="status" className="flex items-center gap-2 rounded-xl border border-mint-200 bg-mint-50 p-3 text-xs font-medium text-mint-900">
                <IconCheck className="h-4 w-4 shrink-0 text-mint-700" />
                <span>{syncMessage}</span>
              </div>
            )}
            {syncError && (
              <div role="alert" className="rounded-xl border border-peach-200 bg-peach-50 p-3 text-xs font-medium text-peach-900">
                {syncError}
              </div>
            )}

            {!isEditing ? (
              /* VIEW MODE */
              <div className="space-y-5">
                <section className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-2">
                  <h3 className={sectionTitle}>3 things you learned</h3>
                  {learned.trim() ? (
                    <div className="rounded-xl bg-white p-3.5 border border-stone-100 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                      {learned}
                    </div>
                  ) : (
                    <p className="text-xs italic text-stone-500">Nothing written yet.</p>
                  )}
                </section>

                <section className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-2">
                  <h3 className={sectionTitle}>Your notes</h3>
                  {notes.trim() ? (
                    <div className="rounded-xl bg-white p-3.5 border border-stone-100 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                      {notes}
                    </div>
                  ) : (
                    <p className="text-xs italic text-stone-500">No notes yet.</p>
                  )}
                </section>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={learnedId} className={fieldLabel}>
                      3 things you learned
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const suggestion = suggestAiLearnings(topic);
                        setAiLearningsDraft(suggestion);
                      }}
                      className={suggestButton}
                    >
                      <IconSparkles className="h-3.5 w-3.5" />
                      <span>Suggest ideas</span>
                    </button>
                  </div>

                  {aiLearningsDraft && (
                    <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-3 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-x-2">
                        <span className="font-semibold text-lavender-900">Suggested takeaways</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setLearned(aiLearningsDraft);
                              setAiLearningsDraft(null);
                            }}
                            className={`${draftAction} font-bold text-lavender-800 hover:underline`}
                          >
                            Use this
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiLearningsDraft(null)}
                            className={`${draftAction} text-stone-600 hover:text-stone-800`}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap">{aiLearningsDraft}</p>
                    </div>
                  )}

                  <textarea
                    id={learnedId}
                    rows={4}
                    value={learned}
                    onChange={(e) => setLearned(e.target.value)}
                    placeholder="1. First key takeaway...&#10;2. Second key takeaway...&#10;3. Third key takeaway..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-500 focus:border-stone-900 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={notesId} className={fieldLabel}>
                      Your notes
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const suggestion = suggestAiNotes(topic);
                        setAiNotesDraft(suggestion);
                      }}
                      className={suggestButton}
                    >
                      <IconSparkles className="h-3.5 w-3.5" />
                      <span>Suggest notes</span>
                    </button>
                  </div>

                  {aiNotesDraft && (
                    <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-3 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-x-2">
                        <span className="font-semibold text-lavender-900">Suggested notes</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setNotes(aiNotesDraft);
                              setAiNotesDraft(null);
                            }}
                            className={`${draftAction} font-bold text-lavender-800 hover:underline`}
                          >
                            Use this
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiNotesDraft(null)}
                            className={`${draftAction} text-stone-600 hover:text-stone-800`}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap">{aiNotesDraft}</p>
                    </div>
                  )}

                  <textarea
                    id={notesId}
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How does this apply to your day-to-day role? Any questions or action items?"
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-500 focus:border-stone-900 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="border-t border-stone-100 bg-stone-50/90 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!isEditing ? (
                <>
                  <SheetToolsMenu items={sheetItems} placement="up" align="start" className="mr-auto" />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium text-stone-600 transition hover:text-stone-900 sm:min-h-9"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-stone-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:min-h-9"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      <span>{learned.trim() || notes.trim() ? 'Edit notes' : 'Add notes'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (learned.trim() || notes.trim()) {
                        setIsEditing(false);
                      } else {
                        onClose();
                      }
                    }}
                    className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 active:scale-95 sm:min-h-9"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-stone-900 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 sm:min-h-9"
                  >
                    <IconCheck className="h-4 w-4" />
                    <span>Save notes</span>
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
