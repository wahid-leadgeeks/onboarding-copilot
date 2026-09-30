'use client';

import { useState, useEffect } from 'react';
import {
  clipboardAllScheduleGtoL,
  clipboardRowForScheduleFull,
  type ScheduleActivity,
} from '@/lib/schedule-catalog';
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

interface ScheduleSyncAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ScheduleActivity[];
  selectedWeek?: string;
  onSyncSuccess?: (result: { totalUpdatedRows: number }) => void;
}

export function ScheduleSyncAllModal({
  isOpen,
  onClose,
  activities,
  selectedWeek = 'All',
  onSyncSuccess,
}: ScheduleSyncAllModalProps) {
  const [syncScope, setSyncScope] = useState<'all' | 'filtered'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    message: string;
    rows?: number;
    cells?: number;
    loginUrl?: string;
  } | null>(null);
  const [copiedGtoL, setCopiedGtoL] = useState(false);
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

  const filteredActivities = activities.filter((a) => {
    if (syncScope === 'all') return true;
    if (selectedWeek === 'All') return true;
    if (selectedWeek === 'Monthly Reviews') return a.week.startsWith('Month');
    return a.week === selectedWeek;
  });

  const totalToSync = filteredActivities.length;
  const completedCount = filteredActivities.filter((a) => a.progress === 'Done').length;

  async function handleDirectSync() {
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const response = await fetch('/api/schedule/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: syncScope === 'all' ? 'All' : selectedWeek,
          activities: filteredActivities,
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
        message: `Successfully synchronized ${data.totalUpdatedRows || totalToSync} activities (${data.totalUpdatedCells || totalToSync * 6} cells) to sheet 'Schedule'!`,
        rows: data.totalUpdatedRows || totalToSync,
        cells: data.totalUpdatedCells || totalToSync * 6,
      });

      if (onSyncSuccess) {
        onSyncSuccess({ totalUpdatedRows: data.totalUpdatedRows || totalToSync });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync schedule';
      setSyncStatus({
        success: false,
        message: `${msg}. You can use the clipboard TSV fallback below.`,
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCopyGtoL() {
    try {
      const tsv = clipboardAllScheduleGtoL(filteredActivities);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedGtoL(true);
        setTimeout(() => setCopiedGtoL(false), 3000);
      }
    } catch {
      alert('Could not copy to clipboard');
    }
  }

  async function handleCopyFull() {
    try {
      const sorted = [...filteredActivities].sort((a, b) => a.rowNumber - b.rowNumber);
      const tsv = sorted.map((act) => clipboardRowForScheduleFull(act)).join('\n');
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 3000);
      }
    } catch {
      alert('Could not copy to clipboard');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-schedule-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-100 overflow-hidden sm:p-7 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
              <IconRefresh className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 id="sync-schedule-title" className="text-lg font-semibold tracking-tight text-stone-900">
                Sync Schedule to Spreadsheet
              </h2>
              <p className="text-xs text-stone-500">
                Publish database activities directly into sheet &apos;Schedule&apos;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close modal"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 pt-5 overflow-y-auto pr-1">
          {/* Summary Card */}
          <div className="rounded-2xl bg-stone-50/80 p-4 border border-stone-100/90 text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200/50">
              <span className="font-semibold text-stone-700">Source:</span>
              <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                PostgreSQL Database ({activities.length} total)
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200/50">
              <span className="font-semibold text-stone-700">Destination:</span>
              <span className="font-mono text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200">
                &apos;Schedule&apos;!G3:L58 (Columns G–L)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-700">Ready to Sync:</span>
              <span className="font-semibold text-stone-900">
                {totalToSync} activities ({completedCount} marked Done)
              </span>
            </div>
          </div>

          {/* Scope Selector if week filter active */}
          {selectedWeek !== 'All' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700">Sync Scope</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSyncScope('all')}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                    syncScope === 'all'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className="font-semibold">All 53 Activities</span>
                  <span className={`text-[11px] ${syncScope === 'all' ? 'text-stone-300' : 'text-stone-400'}`}>
                    Weeks 1–5 & Monthly Reviews
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncScope('filtered')}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                    syncScope === 'filtered'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className="font-semibold">Current Selection</span>
                  <span className={`text-[11px] ${syncScope === 'filtered' ? 'text-stone-300' : 'text-stone-400'}`}>
                    {selectedWeek} ({filteredActivities.length} items)
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Sync Status Banner */}
          {syncStatus && (
            <div
              className={`rounded-2xl p-4 text-xs animate-fade-in ${
                syncStatus.success
                  ? 'bg-mint-50 border border-mint-200 text-mint-900'
                  : 'bg-amber-50 border border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {syncStatus.success ? (
                  <IconCheckCircle className="h-5 w-5 text-mint-600 shrink-0 mt-0.5" />
                ) : (
                  <IconAlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 flex-1">
                  <p className="font-medium leading-relaxed">{syncStatus.message}</p>
                  {syncStatus.loginUrl && (
                    <a
                      href={syncStatus.loginUrl}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
                    >
                      <IconGoogle className="h-3.5 w-3.5" />
                      <span>Sign in with Google OAuth</span>
                      <IconExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleDirectSync}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-stone-900 py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 active:scale-98 transition disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <IconRefresh className="h-4 w-4 animate-spin text-stone-300" />
                  <span>Syncing {totalToSync} activities to Google Sheets...</span>
                </>
              ) : syncStatus?.success ? (
                <>
                  <IconCheck className="h-4 w-4 text-mint-400" />
                  <span>Re-Sync to Google Sheets</span>
                </>
              ) : (
                <>
                  <IconGoogle className="h-4 w-4" />
                  <span>Sync {totalToSync} Activities to Google Sheets</span>
                </>
              )}
            </button>
          </div>

          {/* Clipboard Fallback Section */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Clipboard TSV Fallback
              </span>
              <span className="text-[11px] text-stone-400">Pasting directly into sheet</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopyGtoL}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 px-3 font-semibold text-stone-700 hover:bg-stone-50 active:scale-98 transition"
              >
                {copiedGtoL ? (
                  <>
                    <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                    <span className="text-mint-700">Copied (G–L)!</span>
                  </>
                ) : (
                  <>
                    <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                    <span>Copy G–L TSV</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 px-3 font-semibold text-stone-700 hover:bg-stone-50 active:scale-98 transition"
              >
                {copiedFull ? (
                  <>
                    <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                    <span className="text-mint-700">Copied (A–L)!</span>
                  </>
                ) : (
                  <>
                    <IconClipboard className="h-3.5 w-3.5 text-stone-500" />
                    <span>Copy Full Table (A–L)</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-stone-400 leading-normal">
              Copy G–L TSV then click cell <strong className="text-stone-600">G3</strong> in Google Sheets and press <kbd className="px-1 py-0.5 rounded bg-stone-100 border text-[10px]">Ctrl+V</kbd>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
