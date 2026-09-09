'use client';

import React, { useEffect, useState } from 'react';
import {
  clipboardRowForDiary,
  suggestAiLearnings,
  suggestAiNotes,
  type DiaryEntryRecord,
  type DiaryTopicItem,
} from '@/lib/diary-cockpit';
import {
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconEdit,
  IconRocket,
  IconSparkles,
  IconUser,
  IconX,
} from './Icons';

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
        setSyncMessage(`Row ${topic.rowNumber} successfully synced to Google Sheets!`);
      } else {
        setSyncError(data.error || 'Failed to sync to Google Sheets.');
      }
    } catch {
      setSyncError('Network error while syncing to Google Sheets.');
    } finally {
      setSyncing(false);
    }
  };

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
          <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6">
            <div className="space-y-1.5 pr-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
                  Row {topic.rowNumber}
                </span>
                <span className="rounded-full bg-lavender-50 px-2.5 py-0.5 text-[11px] font-semibold text-lavender-800">
                  {topic.day} · Week {topic.week}
                </span>
                {isCompleted ? (
                  <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-semibold text-mint-700 border border-mint-200">
                    Completed ✓
                  </span>
                ) : isNeedsNotes ? (
                  <span className="rounded-full bg-peach-50 px-2 py-0.5 text-[11px] font-semibold text-peach-700 border border-peach-200">
                    Needs Notes (Col H)
                  </span>
                ) : (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                    To Do
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
                <span className="flex items-center gap-1">
                  <IconUser className="h-3.5 w-3.5 text-stone-400" />
                  PIC: <strong className="text-stone-700">{topic.pic}</strong>
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
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Previous topic"
                  aria-label="Previous topic"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {onNextTopic && (
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={onNextTopic}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 transition"
                  title="Next topic"
                  aria-label="Next topic"
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
            {/* Status alerts */}
            {syncMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-mint-200 bg-mint-50 p-3 text-xs text-mint-900 font-medium">
                <IconCheck className="h-4 w-4 text-mint-600 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}
            {syncError && (
              <div className="rounded-xl border border-peach-200 bg-peach-50 p-3 text-xs text-peach-900 font-medium">
                {syncError}
              </div>
            )}

            {!isEditing ? (
              /* VIEW MODE */
              <div className="space-y-5">
                {/* 3 Learnings Section */}
                <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                    3 Things You Learned (Column G)
                  </span>
                  {learned.trim() ? (
                    <div className="rounded-xl bg-white p-3.5 border border-stone-100 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                      {learned}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">No key learnings recorded yet.</p>
                  )}
                </div>

                {/* Personal Notes Section */}
                <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                    Your Personal Notes &amp; Reflections (Column H)
                  </span>
                  {notes.trim() ? (
                    <div className="rounded-xl bg-white p-3.5 border border-stone-100 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                      {notes}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic">No personal notes or reflections logged yet.</p>
                  )}
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="space-y-6">
                {/* Learnings Input (Col G) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                      3 Things You Learned (Col G)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const suggestion = suggestAiLearnings(topic);
                        setAiLearningsDraft(suggestion);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-lavender-700 hover:text-lavender-900 transition"
                    >
                      <IconSparkles className="h-3.5 w-3.5" />
                      <span>Suggest Ideas</span>
                    </button>
                  </div>

                  {aiLearningsDraft && (
                    <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lavender-900 text-[11px]">AI Suggested Takeaways:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLearned(aiLearningsDraft);
                              setAiLearningsDraft(null);
                            }}
                            className="font-bold text-lavender-700 hover:underline text-[11px]"
                          >
                            Apply to notes
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiLearningsDraft(null)}
                            className="text-stone-400 hover:text-stone-600 text-[11px]"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap">{aiLearningsDraft}</p>
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={learned}
                    onChange={(e) => setLearned(e.target.value)}
                    placeholder="1. First key takeaway...&#10;2. Second key takeaway...&#10;3. Third key takeaway..."
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Personal Notes Input (Col H) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                      Personal Notes &amp; Observations (Col H)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const suggestion = suggestAiNotes(topic);
                        setAiNotesDraft(suggestion);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-lavender-700 hover:text-lavender-900 transition"
                    >
                      <IconSparkles className="h-3.5 w-3.5" />
                      <span>Suggest Notes</span>
                    </button>
                  </div>

                  {aiNotesDraft && (
                    <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lavender-900 text-[11px]">AI Suggested Notes:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNotes(aiNotesDraft);
                              setAiNotesDraft(null);
                            }}
                            className="font-bold text-lavender-700 hover:underline text-[11px]"
                          >
                            Apply to notes
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiNotesDraft(null)}
                            className="text-stone-400 hover:text-stone-600 text-[11px]"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap">{aiNotesDraft}</p>
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How does this apply to your day-to-day role? Any questions or action items?"
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none leading-relaxed"
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition active:scale-95 shadow-xs"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      <span>{learned.trim() || notes.trim() ? 'Edit Notes' : 'Fill Notes'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={syncing}
                      onClick={handleSyncToSheets}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition active:scale-95 disabled:opacity-50"
                      title="Sync directly to Google Sheets via API"
                    >
                      <IconRocket className="h-3.5 w-3.5 text-stone-600" />
                      <span>{syncing ? 'Syncing…' : 'Sync to Sheets'}</span>
                    </button>

                    {onCopyTsv && (
                      <button
                        type="button"
                        onClick={() => onCopyTsv(topic, existingEntry)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition active:scale-95"
                      >
                        {isCopied ? (
                          <>
                            <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                            <span className="text-mint-700 font-semibold">Copied TSV!</span>
                          </>
                        ) : (
                          <>
                            <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                            <span>Copy TSV (Cols G &amp; H)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-medium text-stone-500 hover:text-stone-800 transition px-2"
                  >
                    Close
                  </button>
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
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 rounded-full bg-mint-700 px-5 py-2 text-xs font-semibold text-white hover:bg-mint-800 transition active:scale-95 shadow-xs"
                  >
                    <IconCheck className="h-4 w-4" />
                    <span>Save Notes</span>
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
