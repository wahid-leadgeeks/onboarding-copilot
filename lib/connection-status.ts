import type { HealthSnapshot } from './sync-status';

/** True when a sheet error only means "no spreadsheet is set up" (e.g. the extract route's 400). */
export function isSheetNotConfiguredError(message: string | null | undefined): boolean {
  return Boolean(message && /not configured/i.test(message));
}

export interface PullNoticeInput {
  /** Raw failure message from the last pull, or null after a success. */
  error: string | null;
  health: HealthSnapshot | null;
  healthFailed: boolean;
}

/**
 * Whether the "Couldn't pull evaluations" notice is shown. It stays hidden in local mode and
 * when the only problem is that no sheet is configured (nothing is wrong then), and waits for
 * the health check so local-mode users never see a flash of it. A failed health check counts as
 * "can't tell", so the failure is shown.
 */
export function shouldShowPullNotice({ error, health, healthFailed }: PullNoticeInput): boolean {
  if (!error) return false;
  if (isSheetNotConfiguredError(error)) return false;
  if (health?.mode === 'local') return false;
  if (!health && !healthFailed) return false;
  return true;
}

/** Plain-language version of a spreadsheet load error for the Settings page. */
export function friendlyExtractError(message: string): string {
  if (isSheetNotConfiguredError(message)) {
    return 'No spreadsheet is set up for this app yet, so there is nothing to load.';
  }
  return message;
}

export type ConnectionTone = 'ok' | 'off' | 'warn';

export interface ConnectionLine {
  id: 'spreadsheet' | 'sheets-read' | 'schedule-write' | 'diary-write' | 'ai' | 'mode';
  label: string;
  value: string;
  tone: ConnectionTone;
  /** Spreadsheet id, shown separately (monospace) when present. */
  detail?: string;
}

const ready = (on: boolean | undefined): Pick<ConnectionLine, 'value' | 'tone'> =>
  on ? { value: 'Ready', tone: 'ok' } : { value: 'Not configured', tone: 'off' };

/** The Settings "Connection" lines, derived only from GET /api/health (nothing hardcoded). */
export function connectionLines(health: HealthSnapshot): ConnectionLine[] {
  const { integrations, spreadsheetId } = health;
  const spreadsheet: ConnectionLine = spreadsheetId
    ? integrations.sheets
      ? { id: 'spreadsheet', label: 'Spreadsheet', value: 'Connected', tone: 'ok', detail: spreadsheetId }
      : { id: 'spreadsheet', label: 'Spreadsheet', value: 'Partly set up', tone: 'warn', detail: spreadsheetId }
    : { id: 'spreadsheet', label: 'Spreadsheet', value: 'Not configured', tone: 'off' };
  const syncing = health.mode === 'connected' && integrations.sheets;
  return [
    spreadsheet,
    { id: 'sheets-read', label: 'Reading from the sheet', ...ready(integrations.sheetsRead) },
    { id: 'schedule-write', label: 'Writing the schedule', ...ready(integrations.sheetsWrite) },
    { id: 'diary-write', label: 'Writing the diary', ...ready(integrations.diaryWrite) },
    { id: 'ai', label: 'AI summaries', ...ready(integrations.ai) },
    {
      id: 'mode',
      label: 'Where your work is saved',
      value: syncing ? 'This device and the spreadsheet' : 'Saved on this device',
      tone: syncing ? 'ok' : 'off',
    },
  ];
}
