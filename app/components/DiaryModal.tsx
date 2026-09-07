'use client';

import { useEffect, useRef, useState } from 'react';
import {
  clipboardRowForDiary,
  suggestAiLearnings,
  suggestAiNotes,
  type DiaryEntryRecord,
  type DiaryTopicItem,
} from '@/lib/diary-cockpit';

export interface DiaryModalProps {
  readonly topic: DiaryTopicItem;
  readonly existingEntry?: DiaryEntryRecord;
  readonly onSave: (entry: DiaryEntryRecord) => void;
  readonly onClose: () => void;
  readonly onSyncComplete?: (rowNumber: number, learned: string, notes: string) => void;
}

export function DiaryModal({
  topic,
  existingEntry,
  onSave,
  onClose,
  onSyncComplete,
}: DiaryModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  const [learned, setLearned] = useState<string>(() => {
    if (existingEntry?.learned !== undefined) return existingEntry.learned;
    return topic.defaultLearned || '';
  });

  const [notes, setNotes] = useState<string>(() => {
    if (existingEntry?.notes !== undefined) return existingEntry.notes;
    return topic.defaultNotes || '';
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [aiLearningsDraft, setAiLearningsDraft] = useState<string | null>(null);
  const [aiNotesDraft, setAiNotesDraft] = useState<string | null>(null);

  // Focus trap & Escape key
  useEffect(() => {
    firstFocusRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function handleCopyTsv() {
    const tsv = clipboardRowForDiary(topic.rowNumber, learned, notes);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* ignore clipboard error */
    }
  }

  async function handleSyncToSheets() {
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
      if (!res.ok || !data.success) {
        const errorMsg =
          data.message ||
          data.error ||
          'Failed to update cells in Google Sheets. Make sure Google sign-in is active.';
        setSyncError(errorMsg);
      } else {
        setSyncMessage(`✓ Synced to Onboarding Diary row ${topic.rowNumber} in Google Sheets!`);
        const updatedEntry: DiaryEntryRecord = {
          rowNumber: topic.rowNumber,
          learned,
          notes,
          updatedAt: new Date().toISOString(),
          syncedToSheets: true,
          syncedAt: new Date().toISOString(),
        };
        onSave(updatedEntry);
        onSyncComplete?.(topic.rowNumber, learned, notes);
      }
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Network error updating Google Sheets');
    } finally {
      setSyncing(false);
    }
  }

  function handleSaveLocal() {
    onSave({
      rowNumber: topic.rowNumber,
      learned,
      notes,
      updatedAt: new Date().toISOString(),
      syncedToSheets: existingEntry?.syncedToSheets,
      syncedAt: existingEntry?.syncedAt,
    });
    onClose();
  }

  function handleGenerateAiLearnings() {
    const draft = suggestAiLearnings(topic);
    setAiLearningsDraft(draft);
  }

  function handleApplyAiLearnings() {
    if (aiLearningsDraft) {
      setLearned(aiLearningsDraft);
      setAiLearningsDraft(null);
    }
  }

  function handleGenerateAiNotes() {
    const draft = suggestAiNotes(topic);
    setAiNotesDraft(draft);
  }

  function handleApplyAiNotes() {
    if (aiNotesDraft) {
      setNotes(aiNotesDraft);
      setAiNotesDraft(null);
    }
  }

  const isCompleted = Boolean(learned.trim() && notes.trim());
  const isNeedsNotes = Boolean(learned.trim() && !notes.trim());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diary-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-soft sm:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                Row {topic.rowNumber}
              </span>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                Week {topic.week} · {topic.day}
              </span>
              {topic.date && topic.date !== topic.day && (
                <span className="text-xs text-stone-400">{topic.date}</span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isCompleted
                    ? 'bg-mint-50 text-mint-700'
                    : isNeedsNotes
                      ? 'bg-peach-50 text-peach-700'
                      : 'bg-stone-100 text-stone-600'
                }`}
              >
                {isCompleted ? '✓ Completed' : isNeedsNotes ? '✍️ Needs Notes' : '○ To Do'}
              </span>
            </div>

            <h2
              id="diary-modal-title"
              className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl"
            >
              {topic.topic}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Person in Charge (PIC):{' '}
              <span className="font-medium text-stone-700">{topic.pic}</span>
            </p>
          </div>

          <button
            ref={firstFocusRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-400"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Sync / Error Banner */}
        {syncMessage && (
          <div className="mt-4 rounded-xl bg-mint-50 p-3 text-xs font-medium text-mint-800" role="status">
            {syncMessage}
          </div>
        )}
        {syncError && (
          <div className="mt-4 rounded-xl bg-peach-50 p-3 text-xs font-medium text-peach-800" role="alert">
            {syncError}
          </div>
        )}

        {/* Section 1: Column G (Learnings) */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label
                htmlFor="diary-learnings-input"
                className="block text-sm font-semibold text-stone-900"
              >
                List 3 things you learned from the topic{' '}
                <span className="font-normal text-xs text-stone-400">(Column G)</span>
              </label>
              <p className="text-xs text-stone-500">
                Key concepts, frameworks, or insights gained from this session.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateAiLearnings}
              className="inline-flex items-center gap-1.5 rounded-full bg-lavender-50 px-3 py-1 text-xs font-medium text-lavender-700 transition hover:bg-lavender-100"
            >
              ✨ Draft learnings with AI
            </button>
          </div>

          {/* AI Draft Preview for Learnings */}
          {aiLearningsDraft && (
            <div className="mt-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lavender-900">✨ AI Assistive Suggestion:</span>
                <span className="text-[11px] text-lavender-600">Review before accepting</span>
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-stone-800 leading-relaxed">
                {aiLearningsDraft}
              </pre>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyAiLearnings}
                  className="rounded-full bg-lavender-700 px-3 py-1 font-semibold text-white transition hover:bg-lavender-800"
                >
                  Use this draft
                </button>
                <button
                  type="button"
                  onClick={() => setAiLearningsDraft(null)}
                  className="rounded-full border border-lavender-200 bg-white px-3 py-1 font-medium text-stone-600 transition hover:bg-lavender-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <textarea
            id="diary-learnings-input"
            rows={4}
            value={learned}
            onChange={(e) => setLearned(e.target.value)}
            placeholder="1. First key takeaway...&#10;2. Second key takeaway...&#10;3. Third key takeaway..."
            className="mt-2 w-full rounded-2xl border border-stone-200 p-3.5 text-sm text-stone-800 transition focus:border-stone-900 focus:outline-none"
          />
        </div>

        {/* Section 2: Column H (Notes) */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label
                htmlFor="diary-notes-input"
                className="block text-sm font-semibold text-stone-900"
              >
                Your Notes{' '}
                <span className="font-normal text-xs text-stone-400">(Column H)</span>
              </label>
              <p className="text-xs text-stone-500">
                Detailed notes, personal observations, questions, and action items.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateAiNotes}
              className="inline-flex items-center gap-1.5 rounded-full bg-lavender-50 px-3 py-1 text-xs font-medium text-lavender-700 transition hover:bg-lavender-100"
            >
              ✨ Draft notes with AI
            </button>
          </div>

          {/* AI Draft Preview for Notes */}
          {aiNotesDraft && (
            <div className="mt-3 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lavender-900">✨ AI Assistive Suggestion:</span>
                <span className="text-[11px] text-lavender-600">Review before accepting</span>
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-stone-800 leading-relaxed">
                {aiNotesDraft}
              </pre>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyAiNotes}
                  className="rounded-full bg-lavender-700 px-3 py-1 font-semibold text-white transition hover:bg-lavender-800"
                >
                  Use this draft
                </button>
                <button
                  type="button"
                  onClick={() => setAiNotesDraft(null)}
                  className="rounded-full border border-lavender-200 bg-white px-3 py-1 font-medium text-stone-600 transition hover:bg-lavender-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <textarea
            id="diary-notes-input"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document notes, discussion highlights, and how you will apply this knowledge..."
            className="mt-2 w-full rounded-2xl border border-stone-200 p-3.5 text-sm text-stone-800 transition focus:border-stone-900 focus:outline-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTsv}
              className="rounded-full border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 active:scale-95"
            >
              {copied ? '✓ Copied TSV! 🌿' : '📋 Copy Row for Sheet'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveLocal}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Save Locally
            </button>

            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncToSheets}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-stone-700 active:scale-95 disabled:opacity-50"
            >
              {syncing ? 'Writing to Google Sheets…' : 'Sync to Google Sheets 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
