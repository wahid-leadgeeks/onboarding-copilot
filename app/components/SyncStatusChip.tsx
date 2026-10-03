'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deriveSyncState,
  isHealthSnapshot,
  notifySyncChanged,
  readLastSyncedAt,
  readPendingCount,
  retryPendingSessionSyncs,
  SYNC_CHANGED_EVENT,
  type HealthSnapshot,
  type SyncTone,
} from '@/lib/sync-status';

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const dotClass: Record<SyncTone, string> = {
  mint: 'bg-mint-500',
  stone: 'bg-stone-400',
  peach: 'bg-peach-600',
};

const textClass: Record<SyncTone, string> = {
  mint: 'text-mint-800',
  stone: 'text-stone-600',
  peach: 'text-peach-800',
};

export interface SyncStatusChipProps {
  /** 'full' shows the label; 'compact' shows only the dot with a screen-reader label. */
  variant?: 'full' | 'compact';
  className?: string;
}

/** The single truthful sync status shown across the app. */
export function SyncStatusChip({ variant = 'full', className = '' }: SyncStatusChipProps) {
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const readLocal = useCallback(() => {
    const storage = safeLocalStorage();
    setPendingCount(readPendingCount(storage));
    setLastSyncedAt(readLastSyncedAt(storage));
  }, []);

  const refreshHealth = useCallback(async () => {
    const response = await fetch('/api/health', { cache: 'no-store' }).catch(() => null);
    const value: unknown = response?.ok ? await response.json().catch(() => null) : null;
    if (isHealthSnapshot(value)) {
      setHealth(value);
      setHealthFailed(false);
    } else {
      setHealthFailed(true);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      readLocal();
      void refreshHealth();
    };
    refresh();
    window.addEventListener(SYNC_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SYNC_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [readLocal, refreshHealth]);

  async function retry() {
    if (retrying) return;
    setRetrying(true);
    try {
      const storage = safeLocalStorage();
      if (storage && readPendingCount(storage) > 0) await retryPendingSessionSyncs(storage, fetch);
    } finally {
      setRetrying(false);
      notifySyncChanged();
    }
  }

  const state = deriveSyncState({ health, healthFailed, pendingCount, lastSyncedAt });
  const label = retrying ? 'Retrying…' : state.label;
  const dot = <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dotClass[state.tone]}`} />;

  if (variant === 'compact') {
    return (
      <span role="status" title={label} className={`inline-flex items-center ${className}`}>
        {dot}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 text-xs font-medium ${className}`}>
      <span role="status" className={`inline-flex min-w-0 items-center gap-2 ${textClass[state.tone]}`}>
        {dot}
        <span className="truncate">{label}</span>
      </span>
      {state.kind === 'error' && (
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold text-stone-700 underline-offset-2 hover:bg-stone-100 hover:underline disabled:opacity-60 sm:min-h-8"
        >
          Retry
        </button>
      )}
    </div>
  );
}
