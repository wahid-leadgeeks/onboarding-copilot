'use client';

import { useState, useEffect } from 'react';
import {
  clipboardAllDiaryGtoH,
  clipboardAllDiaryFullTable,
  OFFICIAL_DIARY_TOPICS,
  type DiaryEntryRecord,
  type DiaryTopicItem,
} from '@/lib/diary-cockpit';
import {
  IconX,
  IconCheck,
  IconCheckCircle,
  IconAlertTriangle,
  IconRefresh,
  IconClipboard,
  IconGoogle,
  IconExternalLink,
} from './Icons';

interface DiarySyncAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DiaryEntryRecord[];
  topics?: readonly DiaryTopicItem[];
  spreadsheetId?: string | null;
  onSyncSuccess?: (result: { totalUpdatedRows: number }) => void;
}

export function DiarySyncAllModal({
  isOpen,
  onClose,
  entries,
  topics = OFFICIAL_DIARY_TOPICS,
  spreadsheetId,
  onSyncSuccess,
}: DiarySyncAllModalProps) {
  const [syncScope, setSyncScope] = useState<'official' | 'all'>('official');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    message: string;
    rows?: number;
    cells?: number;
    loginUrl?: string;
  } | null>(null);
  const [copiedGtoH, setCopiedGtoH] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSyncing) onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setSyncStatus(null);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSyncing, onClose]);

  if (!isOpen) return null;

  const maxRow = syncScope === 'official' ? 25 : 29;
  const filteredTopics = topics.filter((t) => t.rowNumber >= 2 && t.rowNumber <= maxRow);

  const totalToSync = filteredTopics.length;
  const documentedCount = filteredTopics.filter((t) => {
    const e = entries.find((x) => x.rowNumber === t.rowNumber);
    const learned = e ? e.learned : t.defaultLearned;
    const notes = e ? e.notes : t.defaultNotes;
    return !!(learned && learned.trim() && notes && notes.trim());
  }).length;

  async function handleDirectSync() {
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const response = await fetch('/api/diary/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: syncScope,
          maxRow,
          entries,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 401 || data.authenticated === false) {
          setSyncStatus({
            success: false,
            message: 'Google authentication required. Sign in with Google to enable automatic spreadsheet updates.',
            loginUrl: data.loginUrl || '/api/auth/login',
          });
          return;
        }
        throw new Error(data.error || data.message || 'API sync failed');
      }

      setSyncStatus({
        success: true,
        message: `Successfully synchronized ${data.totalUpdatedRows || totalToSync} diary topics (${data.totalUpdatedCells || totalToSync * 2} cells) to worksheet 'Onboarding Diary'!`,
        rows: data.totalUpdatedRows,
        cells: data.totalUpdatedCells,
      });

      if (onSyncSuccess) {
        onSyncSuccess({ totalUpdatedRows: data.totalUpdatedRows || totalToSync });
      }
    } catch (err) {
      setSyncStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Synchronization failed. You can use the clipboard TSV fallback below.',
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCopyGtoH() {
    try {
      const tsv = clipboardAllDiaryGtoH(entries, topics, maxRow);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedGtoH(true);
        setTimeout(() => setCopiedGtoH(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleCopyFull() {
    try {
      const tsv = clipboardAllDiaryFullTable(entries, topics, maxRow);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-diary-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-stone-200/80 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <IconGoogle className="h-4 w-4" />
              </span>
              <h2 id="sync-diary-title" className="text-xl font-bold text-stone-900">
                Sync Onboarding Diary to Spreadsheet
              </h2>
            </div>
            <p className="mt-1 text-xs text-stone-600">
              Synchronizes Column G (List 3 things you learned) &amp; Column H (Your Notes) directly into worksheet <span className="font-semibold text-stone-800">&apos;Onboarding Diary&apos;</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Scope Selector */}
          <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Select Sync Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSyncScope('official')}
                className={`flex flex-col items-start rounded-xl p-2.5 text-left border transition ${
                  syncScope === 'official'
                    ? 'border-emerald-600 bg-white shadow-xs text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-stone-200/70 bg-stone-100/60 text-stone-600 hover:bg-white'
                }`}
              >
                <span className="text-xs font-bold">Official Syllabus (Rows 2–25)</span>
                <span className="text-[11px] text-stone-500 mt-0.5">
                  24 topics · Matches exact Google Sheet table size
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSyncScope('all')}
                className={`flex flex-col items-start rounded-xl p-2.5 text-left border transition ${
                  syncScope === 'all'
                    ? 'border-emerald-600 bg-white shadow-xs text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-stone-200/70 bg-stone-100/60 text-stone-600 hover:bg-white'
                }`}
              >
                <span className="text-xs font-bold">All Recorded Topics (Rows 2–29)</span>
                <span className="text-[11px] text-stone-500 mt-0.5">
                  28 topics · Includes extended IT goals
                </span>
              </button>
            </div>
          </div>

          {/* Sync Telemetry Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <span className="text-stone-600 font-medium">
              Target Range: <span className="font-mono font-semibold text-stone-800">&apos;Onboarding Diary&apos;!G2:H{maxRow}</span>
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800">
              {documentedCount} of {totalToSync} Fully Documented
            </span>
          </div>

          {/* Topic Preview List */}
          <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white">
            <div className="bg-stone-50 px-3 py-2 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex justify-between">
              <span>Preview of Topics to be Synced</span>
              <span>{filteredTopics.length} Rows</span>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-stone-100 text-xs">
              {filteredTopics.map((topic) => {
                const entry = entries.find((e) => e.rowNumber === topic.rowNumber);
                const learned = entry ? entry.learned : (topic.defaultLearned || '');
                const notes = entry ? entry.notes : (topic.defaultNotes || '');
                const isReady = !!(learned.trim() && notes.trim());

                return (
                  <div key={topic.id} className="p-2.5 hover:bg-stone-50/60 flex items-start gap-2.5">
                    <span className="mt-0.5 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-700 shrink-0">
                      Row {topic.rowNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-stone-900 truncate">
                          {topic.topic.split('\n')[0]}
                        </span>
                        <span className="text-[10px] text-stone-400">({topic.pic})</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-stone-500 truncate">
                        Col G: {learned.split('\n')[0] || '(empty)'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {isReady ? 'Ready' : 'Needs Notes'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Status Feedback Message */}
          {syncStatus && (
            <div
              className={`rounded-2xl p-4 border text-xs animate-fade-in ${
                syncStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {syncStatus.success ? (
                  <IconCheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <IconAlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{syncStatus.message}</p>
                  {syncStatus.loginUrl && (
                    <div className="mt-3">
                      <a
                        href={syncStatus.loginUrl}
                        className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 font-medium text-white shadow-xs hover:bg-stone-800 transition"
                      >
                        <IconGoogle className="h-3.5 w-3.5" />
                        <span>Sign In with Google</span>
                      </a>
                    </div>
                  )}
                  {syncStatus.success && spreadsheetId && (
                    <div className="mt-2.5">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=592196667#gid=592196667`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline hover:text-emerald-950"
                      >
                        <span>Open &apos;Onboarding Diary&apos; in Google Sheets</span>
                        <IconExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-100 pt-4 mt-2 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Clipboard Fallbacks */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyGtoH}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition active:scale-95"
            >
              {copiedGtoH ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied G–H!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                  <span>Copy G–H TSV</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyFull}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition active:scale-95"
            >
              {copiedFull ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Table!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                  <span>Copy Full A–H</span>
                </>
              )}
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="rounded-full px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDirectSync}
              disabled={isSyncing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <IconRefresh className="h-4 w-4 animate-spin" />
                  <span>Syncing to Google Sheets...</span>
                </>
              ) : (
                <>
                  <IconGoogle className="h-4 w-4" />
                  <span>Sync {totalToSync} Topics Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
