'use client';

import { useRef, useState, type ReactNode } from 'react';
import { markSynced, notifySyncChanged } from '@/lib/sync-status';
import { ModalDialog } from './ModalDialog';
import { RowTag } from './RowTag';
import { SheetToolsMenu, type SheetToolsMenuItem } from './SheetToolsMenu';
import { IconAlertTriangle, IconCheckCircle, IconExternalLink, IconRefresh } from './Icons';

export type BulkSyncRowStatus = 'ready' | 'blocking' | 'skipped';

export interface BulkSyncModalRow {
  rowNumber: number;
  label: string;
  status: BulkSyncRowStatus;
}

export interface BulkSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** Overwrite warning naming the exact sheet ranges. */
  warning: ReactNode;
  /** Optional controls above the counts (e.g. a scope selector). */
  controls?: ReactNode | ((state: { busy: boolean }) => ReactNode);
  rows: BulkSyncModalRow[];
  /** Number of sheet rows the sync overwrites. */
  writeCount: number;
  /** Badge for rows that block the sync, e.g. "Needs notes". */
  blockingLabel?: string;
  /** Count phrase for blocking rows, e.g. "not filled in yet" (defaults to "still {blockingLabel}"). */
  blockingCountLabel?: string;
  /** Lead-in for the blocking list. */
  blockingHelp?: string;
  /** "Fill" action for a blocking row; the modal closes first so dialogs never stack. */
  onFill?: (rowNumber: number) => void;
  endpoint: string;
  /** Builds the request body; may throw (e.g. while data is loading or the plan is empty). */
  buildBody: () => unknown;
  /** When set, syncing is unavailable and this reason is shown. */
  disabledReason?: string | null;
  formatSuccess: (data: Record<string, unknown>) => string;
  onSyncSuccess?: (data: Record<string, unknown>) => void;
  toolsItems?: SheetToolsMenuItem[];
  /** Link shown after a successful sync. */
  sheetUrl?: string | null;
}

type SyncResult =
  | { kind: 'success'; message: string }
  | { kind: 'signin'; message: string; loginUrl: string }
  | { kind: 'blocked'; message: string; rows: number[] }
  | { kind: 'error'; message: string };

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const statusBadge: Record<BulkSyncRowStatus, string> = {
  ready: 'bg-mint-50 text-mint-800',
  blocking: 'bg-peach-50 text-peach-800',
  skipped: 'bg-stone-100 text-stone-600',
};

export function BulkSyncModal({
  isOpen,
  onClose,
  title,
  description,
  warning,
  controls,
  rows,
  writeCount,
  blockingLabel = 'Needs details',
  blockingCountLabel,
  blockingHelp = 'Finish these rows before syncing:',
  onFill,
  endpoint,
  buildBody,
  disabledReason,
  formatSuccess,
  onSyncSuccess,
  toolsItems = [],
  sheetUrl,
}: BulkSyncModalProps) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const inFlight = useRef(false);

  const serverBlocked = result?.kind === 'blocked' ? result.rows : [];
  const viewRows = rows.map((row) =>
    row.status === 'ready' && serverBlocked.includes(row.rowNumber) ? { ...row, status: 'blocking' as const } : row
  );
  const blocking = viewRows.filter((row) => row.status === 'blocking');
  const readyCount = viewRows.filter((row) => row.status === 'ready').length;
  const skippedCount = viewRows.filter((row) => row.status === 'skipped').length;
  const canSync = !busy && !disabledReason && blocking.length === 0 && writeCount > 0;

  function handleClose() {
    if (inFlight.current) return;
    setResult(null);
    onClose();
  }

  async function handleSync() {
    if (inFlight.current || !canSync) return;
    let body: unknown;
    try {
      body = buildBody();
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Nothing to sync yet.' });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = ((await response.json().catch(() => null)) ?? {}) as Record<string, unknown>;
      if (!response.ok || data.success !== true) {
        if (response.status === 401 || data.authenticated === false) {
          setResult({
            kind: 'signin',
            message: 'Sign in with Google to update the spreadsheet. Nothing was written.',
            loginUrl: typeof data.loginUrl === 'string' ? data.loginUrl : '/api/auth/login',
          });
          return;
        }
        if (response.status === 409 && Array.isArray(data.emptyRows)) {
          const emptyRows = data.emptyRows.filter((row): row is number => typeof row === 'number');
          setResult({ kind: 'blocked', message: 'Some rows are still empty, so nothing was written.', rows: emptyRows });
          return;
        }
        const reason = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : '';
        throw new Error(reason || `The sync failed (status ${response.status}).`);
      }
      markSynced(safeLocalStorage());
      notifySyncChanged();
      setResult({ kind: 'success', message: formatSuccess(data) });
      onSyncSuccess?.(data);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'The sync failed.';
      setResult({ kind: 'error', message: `${reason} You can copy the rows from Sheet tools instead.` });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const footer = (
    <>
      {toolsItems.length > 0 && (
        <SheetToolsMenu items={toolsItems} placement="up" align="start" className="mr-auto" />
      )}
      {!busy && (
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 sm:min-h-9 sm:min-w-0"
        >
          {result ? 'Close' : 'Cancel'}
        </button>
      )}
      {result?.kind !== 'success' && (
        <button
          type="button"
          onClick={handleSync}
          disabled={!canSync}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9"
        >
          {busy && <IconRefresh className="h-4 w-4 animate-spin" />}
          {busy ? 'Overwriting…' : `Overwrite ${writeCount} row${writeCount === 1 ? '' : 's'}`}
        </button>
      )}
    </>
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      footer={footer}
      maxWidth="2xl"
      dismissible={!busy}
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl bg-peach-50 p-4 text-sm text-peach-900">
          <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-peach-700" />
          <div className="min-w-0">{warning}</div>
        </div>

        {typeof controls === 'function' ? controls({ busy }) : controls}

        <p className="text-sm text-stone-700" aria-live="polite">
          <span className="font-semibold text-stone-900">{readyCount} ready</span>
          {blocking.length > 0 && (
            <> · {blocking.length} {blockingCountLabel ?? `still ${blockingLabel.toLowerCase()}`}</>
          )}
          {skippedCount > 0 && <> · {skippedCount} left unchanged</>}
        </p>

        {disabledReason && <p className="text-sm text-stone-600">{disabledReason}</p>}

        {blocking.length > 0 && (
          <section aria-labelledby="bulk-sync-blocking" className="rounded-2xl border border-peach-100 p-3">
            <h3 id="bulk-sync-blocking" className="px-1 text-sm font-semibold text-stone-900">
              {blockingHelp}
            </h3>
            <ul className="mt-2 divide-y divide-stone-100">
              {blocking.map((row) => (
                <li key={row.rowNumber} className="flex min-w-0 items-center gap-2.5 py-1.5 pl-1">
                  <RowTag rowNumber={row.rowNumber} />
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-800">{row.label}</span>
                  {onFill && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onFill(row.rowNumber);
                      }}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 sm:min-h-8 sm:min-w-0"
                    >
                      Fill<span className="sr-only"> {row.label}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="bulk-sync-rows">
          <h3 id="bulk-sync-rows" className="text-sm font-semibold text-stone-900">
            Rows
          </h3>
          {/* Focusable so keyboard users can scroll the list (axe: scrollable-region-focusable). */}
          <ul
            tabIndex={0}
            aria-labelledby="bulk-sync-rows"
            className="mt-2 max-h-56 divide-y divide-stone-100 overflow-y-auto rounded-2xl border border-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
          >
            {viewRows.map((row) => (
              <li key={row.rowNumber} className="flex min-w-0 items-center gap-2.5 px-3 py-2">
                <RowTag rowNumber={row.rowNumber} />
                <span className="min-w-0 flex-1 truncate text-sm text-stone-800">{row.label}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[row.status]}`}>
                  {row.status === 'ready'
                    ? 'Ready'
                    : row.status === 'blocking'
                      ? blockingLabel
                      : 'No data — left unchanged in the sheet'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {result && (
          <div
            role={result.kind === 'success' ? 'status' : 'alert'}
            className={`flex gap-3 rounded-2xl p-4 text-sm ${
              result.kind === 'success' ? 'bg-mint-50 text-mint-900' : 'bg-peach-50 text-peach-900'
            }`}
          >
            {result.kind === 'success' ? (
              <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-mint-700" />
            ) : (
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-peach-700" />
            )}
            <div className="min-w-0 space-y-2">
              <p className="font-medium">{result.message}</p>
              {result.kind === 'signin' && (
                <a
                  href={result.loginUrl}
                  className="inline-flex min-h-11 items-center rounded-full bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 sm:min-h-9"
                >
                  Sign in with Google
                </a>
              )}
              {result.kind === 'success' && sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-mint-800 underline underline-offset-2"
                >
                  Open the spreadsheet
                  <IconExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
