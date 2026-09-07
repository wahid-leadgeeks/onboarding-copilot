'use client';

import { useEffect, useState } from 'react';
import {
  calculateDurationFromTimes,
  clipboardRowForScheduleGtoK,
  clipboardRowForScheduleFull,
  type ScheduleActivity,
} from '@/lib/schedule-catalog';
import {
  IconX,
  IconClock,
  IconCheckCircle,
  IconCheck,
  IconAlertTriangle,
  IconNote,
  IconClipboard,
  IconRocket,
} from './Icons';

interface ScheduleFillModalProps {
  activity: ScheduleActivity | null;
  onSave: (updated: ScheduleActivity) => void;
  onClose: () => void;
}

function getCurrentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function ScheduleFillModal({ activity, onSave, onClose }: ScheduleFillModalProps) {
  const [durationMinutes, setDurationMinutes] = useState<number | string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [progress, setProgress] = useState<string>('Done');
  const [notes, setNotes] = useState<string>('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedGtoK, setCopiedGtoK] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  useEffect(() => {
    if (activity) {
      setDurationMinutes(activity.durationMinutes !== undefined ? activity.durationMinutes : '');
      setStartTime(activity.startTime || '');
      setEndTime(activity.endTime || '');
      const initialProgress = activity.progress && activity.progress !== 'Not Started'
        ? activity.progress
        : (activity.durationMinutes || activity.startTime ? 'Done' : '');
      setProgress(initialProgress);
      setNotes(activity.notes || '');
      setSyncStatus(null);
    }
  }, [activity]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activity) return null;
  const currentActivity: ScheduleActivity = activity;

  function handleStartTimeChange(val: string) {
    setStartTime(val);
    if (val && endTime) {
      const dur = calculateDurationFromTimes(val, endTime);
      if (dur !== undefined) setDurationMinutes(dur);
    }
  }

  function handleEndTimeChange(val: string) {
    setEndTime(val);
    if (startTime && val) {
      const dur = calculateDurationFromTimes(startTime, val);
      if (dur !== undefined) setDurationMinutes(dur);
    }
  }

  function getUpdatedActivity(): ScheduleActivity {
    const durNum = typeof durationMinutes === 'number' ? durationMinutes : parseFloat(String(durationMinutes));
    const cleanProgress = progress.trim() === 'Not Started' ? '' : progress.trim();
    return {
      ...currentActivity,
      durationMinutes: !isNaN(durNum) ? durNum : undefined,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      progress: cleanProgress,
      notes: notes.trim(),
    };
  }

  async function handleDirectSync() {
    setIsSyncing(true);
    setSyncStatus(null);

    const updated = getUpdatedActivity();
    try {
      const res = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'Schedule',
          rowNumber: currentActivity.rowNumber,
          durationMinutes: updated.durationMinutes,
          startTime: updated.startTime,
          endTime: updated.endTime,
          progress: updated.progress,
          notes: updated.notes,
        }),
      });

      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success) {
        setSyncStatus({ success: true, message: `Synced Row ${currentActivity.rowNumber} to Google Sheets successfully!` });
        onSave(updated);
      } else {
        setSyncStatus({
          success: false,
          message: data.message || data.error || 'Sync failed. You can still copy TSV or save locally.',
        });
      }
    } catch {
      setSyncStatus({ success: false, message: 'Network error connecting to Google Sheets. Use TSV copy.' });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCopyGtoK() {
    const updated = getUpdatedActivity();
    const tsv = clipboardRowForScheduleGtoK(updated);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedGtoK(true);
        setTimeout(() => setCopiedGtoK(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleCopyFull() {
    const updated = getUpdatedActivity();
    const tsv = clipboardRowForScheduleFull(updated);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }

  function handleSaveLocal() {
    const updated = getUpdatedActivity();
    onSave(updated);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-pop-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 p-5 sm:p-6 bg-stone-50/50">
          <div className="pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-800">
                Sheet: Schedule · Row {activity.rowNumber}
              </span>
              <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-semibold text-mint-700">
                {activity.week} · {activity.day}
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                PIC: {activity.pic}
              </span>
            </div>
            <h2 id="schedule-modal-title" className="text-lg font-bold tracking-tight text-stone-900 sm:text-xl leading-snug">
              {activity.topic.split('\n')[0]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body: Columns G through K */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="rounded-xl bg-cream/70 p-3 text-xs text-stone-700 leading-relaxed">
            <span className="font-semibold text-stone-900">Columns G–K: </span>
            Fill your session times, duration, completion status, and notes. Sync directly to your Google Sheet or copy as TSV.
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Start Time (Column H) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="sched-start" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <IconClock className="h-3.5 w-3.5 text-stone-500" />
                  Start Time (Col H)
                </label>
                <button
                  type="button"
                  onClick={() => handleStartTimeChange(getCurrentTimeHHMM())}
                  className="text-[11px] text-mint-700 font-medium hover:underline"
                >
                  Set Now
                </button>
              </div>
              <input
                id="sched-start"
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            {/* End Time (Column I) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="sched-end" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <IconClock className="h-3.5 w-3.5 text-stone-500" />
                  End Time (Col I)
                </label>
                <button
                  type="button"
                  onClick={() => handleEndTimeChange(getCurrentTimeHHMM())}
                  className="text-[11px] text-mint-700 font-medium hover:underline"
                >
                  Set Now
                </button>
              </div>
              <input
                id="sched-end"
                type="time"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Duration Minutes (Column G) */}
            <div>
              <label htmlFor="sched-duration" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
                <IconClock className="h-3.5 w-3.5 text-stone-500" />
                Duration (minutes) (Col G)
              </label>
              <input
                id="sched-duration"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 45"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Progress (Column J) */}
            <div>
              <label htmlFor="sched-progress" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
                <IconCheckCircle className="h-3.5 w-3.5 text-stone-500" />
                Progress (Col J)
              </label>
              <select
                id="sched-progress"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                <option value="Done">Done</option>
                <option value="In Progress">In Progress</option>
                <option value="On-Hold">On-Hold</option>
                <option value="Reschedule">Reschedule</option>
                <option value="">Not Started (Blank in Sheet)</option>
              </select>
            </div>
          </div>

          {/* Notes (Column K) */}
          <div>
            <label htmlFor="sched-notes" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
              <IconNote className="h-3.5 w-3.5 text-stone-500" />
              Notes / Drive Link (Col K)
            </label>
            <textarea
              id="sched-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session takeaways, folder link, blockers, or discussion notes..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Sync Status Banner */}
          {syncStatus && (
            <div
              className={`rounded-xl p-3 text-xs font-medium flex items-center gap-2 ${
                syncStatus.success ? 'bg-mint-50 text-mint-800' : 'bg-peach-50 text-peach-800'
              }`}
            >
              {syncStatus.success ? (
                <IconCheck className="h-4 w-4 shrink-0 text-mint-700" />
              ) : (
                <IconAlertTriangle className="h-4 w-4 shrink-0 text-peach-700" />
              )}
              <span>{syncStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 bg-stone-50/50 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyGtoK}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 active:scale-95"
            >
              {copiedGtoK ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                  <span>Copied G–K!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy Cols G–K TSV</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyFull}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-white border border-stone-200 px-3.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 active:scale-95"
            >
              {copiedFull ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-mint-600" />
                  <span>Copied Full Row!</span>
                </>
              ) : (
                <>
                  <IconClipboard className="h-3.5 w-3.5" />
                  <span>Copy Row A–K</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveLocal}
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-800 transition hover:bg-stone-300 active:scale-95"
            >
              Save Locally
            </button>
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleDirectSync}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? (
                'Syncing...'
              ) : (
                <>
                  <IconRocket className="h-3.5 w-3.5" />
                  <span>1-Click Sync to Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
